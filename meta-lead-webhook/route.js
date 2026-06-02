import { notifyGerardo } from "../../utils/telegram.js";
import { auditLog } from "../../utils/audit.js";
import { authLimiter } from "../../utils/rate-limit.js";
import { sendLeadEvent } from "../../utils/meta-capi.js";
import { triggerWorkflow } from "../../email-workflows/route.js";

// Meta Lead Ads webhook receiver.
// Verifies the X-Hub-Signature-256 header using META_LEAD_VERIFY_TOKEN (HMAC SHA-256 over raw body, prefixed with "sha256=").
// Normalises Meta's field_data payload to the shape /api/leads expects, then POSTs internally.
// Also fires the same downstream side effects as the website contact form: lead row + Telegram notify.

function getVerifyToken() {
  return process.env.META_LEAD_VERIFY_TOKEN || "";
}

async function hmacSha256Hex(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = await hmacSha256Hex(getVerifyToken(), rawBody);
  const provided = signatureHeader.slice("sha256=".length);
  return constantTimeEqual(expected, provided);
}

function pickField(fieldData, names) {
  if (!Array.isArray(fieldData)) return "";
  for (const f of fieldData) {
    if (!f || !f.name) continue;
    if (names.includes(f.name)) {
      if (Array.isArray(f.values) && f.values.length > 0) {
        return String(f.values[0] || "").trim();
      }
    }
  }
  return "";
}

function normaliseMetaLead(entry) {
  const fd = entry?.field_data || [];
  const name = pickField(fd, ["full_name", "name"]);
  const firstName = pickField(fd, ["first_name"]);
  const lastName = pickField(fd, ["last_name"]);
  const email = pickField(fd, ["email"]);
  const phone = pickField(fd, ["phone_number", "phone"]);
  const projectType = pickField(fd, ["project_type", "service_type", "service"]);
  const city = pickField(fd, ["city", "location"]);
  const postal = pickField(fd, ["postal_code", "zip"]);
  const projectDescription = pickField(fd, ["project_description", "details", "notes"]);

  const serviceType = (() => {
    const v = (projectType || "").toLowerCase();
    if (["interior", "exterior", "commercial"].includes(v)) return v;
    if (v.includes("cabinet")) return "interior";
    if (v.includes("wall")) return "interior";
    return "interior";
  })();

  const displayName = name || [firstName, lastName].filter(Boolean).join(" ");

  return {
    name: displayName,
    email,
    phone,
    serviceType,
    projectDescription: [
      projectDescription,
      postal ? `Postal: ${postal}` : "",
      city ? `City: ${city}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    preferredContact: email ? "email" : "phone",
    address: [city, postal].filter(Boolean).join(", "),
    source: "meta_lead_ad",
    meta: {
      leadId: entry?.id,
      adId: entry?.ad_id,
      adsetId: entry?.adset_id,
      campaignId: entry?.campaign_id,
      formId: entry?.form_id,
      createdTime: entry?.created_time,
    },
  };
}

async function saveLead(baseUrl, lead) {
  const resp = await fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      serviceType: lead.serviceType,
      projectDescription: lead.projectDescription,
      preferredContact: lead.preferredContact,
      address: lead.address,
      leadSource: lead.source || "meta_lead_ad",
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`leads insert failed: ${resp.status} ${err.error || ""}`);
  }
  return resp.json();
}

// GET — Meta webhook verification challenge
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === getVerifyToken()) {
    console.log("[meta-leads] webhook verified");
    return new Response(challenge || "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST — Meta Lead Ads delivery
export async function POST(request) {
  const limited = authLimiter(request);
  if (limited) return limited;

  const raw = await request.text();
  const sig = request.headers.get("x-hub-signature-256") || "";
  const ok = await verifySignature(raw, sig);
  if (!ok) {
    console.warn("[meta-leads] invalid signature");
    return new Response("invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return new Response("bad json", { status: 400 });
  }

  const baseUrl = process.env.APP_URL || request.url.split("/api/")[0];
  const results = [];

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== "leadgen" || !change?.value) continue;
      const lead = normaliseMetaLead(change.value);
      try {
        const saved = await saveLead(baseUrl, lead);
        results.push({ ok: true, leadId: saved.lead?.id, meta: lead.meta });
        try {
          await notifyGerardo(
            `[Meta Lead] ${lead.name} (${lead.email || lead.phone}) — ${lead.serviceType} — Ad ${lead.meta.adId}`,
          );
        } catch (tgErr) {
          console.error("[meta-leads] telegram notify failed:", tgErr.message);
        }
        // Fire-and-forget: server-side CAPI dedup (Meta deduplicates by event_id + browser pixel match)
        sendLeadEvent({
          leadId: saved.lead?.id,
          email: lead.email,
          phone: lead.phone,
          name: lead.name,
          source: "meta_lead_ad",
          serviceType: lead.serviceType,
          request,
        });
        // Fire-and-forget: route through existing email workflow engine (new_lead trigger)
        try {
          await triggerWorkflow("new_lead", {
            customer_name: lead.name,
            customer_email: lead.email,
            customer_phone: lead.phone,
            service_type: lead.serviceType,
            project_description: lead.projectDescription,
            address: lead.address,
            related_type: "lead",
            related_id: saved.lead?.id,
            app_url: process.env.APP_URL,
            admin_email: "info@arcanpainting.ca",
            source: "meta_lead_ad",
          });
        } catch (wfErr) {
          console.error("[meta-leads] workflow trigger failed:", wfErr.message);
        }
        // Fire-and-forget: AI lead qualifier (mirrors contact route pattern)
        try {
          await fetch(`${baseUrl}/api/agents/lead-qualifier`, {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: saved.lead?.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              serviceType: lead.serviceType,
              projectDescription: lead.projectDescription,
              address: lead.address,
              source: "meta_lead_ad",
            }),
          });
        } catch (agentErr) {
          console.error("[meta-leads] lead-qualifier failed:", agentErr.message);
        }
        try {
          await auditLog("meta_lead", saved.lead?.id, { source: "meta", adId: lead.meta.adId });
        } catch {}
      } catch (err) {
        console.error("[meta-leads] save failed:", err.message);
        results.push({ ok: false, error: err.message, meta: lead.meta });
      }
    }
  }

  return Response.json({ received: results.length, results });
}
