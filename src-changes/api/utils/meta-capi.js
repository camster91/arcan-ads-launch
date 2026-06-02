/**
 * Meta Conversions API (CAPI) — server-side lead event sender.
 *
 * Required env vars:
 *   META_PIXEL_ID     — e.g. "1234567890"
 *   META_CAPI_TOKEN   — long-lived system-user token from Events Manager
 *   META_API_VERSION  — optional, defaults to "v18.0"
 *
 * Optional env vars:
 *   META_CAPI_ENABLED — set to "false" to disable without removing the call
 *   META_CAPI_TEST    — set to "true" to mark all events as test events
 *
 * Hashes email/phone/names with SHA-256 (Meta requirement). Fire-and-forget
 * pattern: call `sendLeadEvent()` and don't await — failures are logged but
 * never block the user-facing request.
 *
 * Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import crypto from "node:crypto";

const API_VERSION = process.env.META_API_VERSION || "v18.0";
const PIXEL_ID = process.env.META_PIXEL_ID || "";
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN || "";
const ENABLED = process.env.META_CAPI_ENABLED !== "false";
const TEST_MODE = process.env.META_CAPI_TEST === "true";

const ENABLED_OK = ENABLED && !!PIXEL_ID && !!ACCESS_TOKEN;

function sha256(value) {
  if (!value) return null;
  return crypto
    .createHash("sha256")
    .update(String(value).toLowerCase().trim())
    .digest("hex");
}

function normalizePhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function firstName(name) {
  if (!name) return null;
  return String(name).trim().split(/\s+/)[0] || null;
}

function lastName(name) {
  if (!name) return null;
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : null;
}

// Read Meta's _fbp and _fbc cookies from the Cookie header. The Pixel drops these
// automatically. If the server doesn't have the cookie (server-to-server call without
// the originating browser context), both will be undefined — Meta still dedups via
// event_id + user_data, just with reduced fidelity.
function readMetaCookies(request) {
  if (!request?.headers?.get?.("cookie")) return { fbp: undefined, fbc: undefined };
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  return {
    fbp: cookies._fbp || undefined,
    fbc: cookies._fbc || undefined,
  };
}

function buildUserData({ email, phone, name, request }) {
  const ip =
    request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers?.get?.("x-real-ip") ||
    undefined;
  const ua = request?.headers?.get?.("user-agent") || undefined;
  // Prefer Meta's _fbp / _fbc cookies. Fall back to custom headers if the caller
  // (e.g., the contact form on a single-page app) forwards them explicitly.
  const { fbp: fbpCookie, fbc: fbcCookie } = readMetaCookies(request);
  const fbp = fbpCookie || request?.headers?.get?.("x-fb-pixel-id") || undefined;
  const fbc = fbcCookie || request?.headers?.get?.("x-fbclid") || undefined;

  return {
    em: sha256(email) ? [sha256(email)] : [],
    ph: normalizePhone(phone) ? [sha256(normalizePhone(phone))] : [],
    fn: sha256(firstName(name)) ? [sha256(firstName(name))] : [],
    ln: sha256(lastName(name)) ? [sha256(lastName(name))] : [],
    client_ip: ip,
    client_user_agent: ua,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };
}

function buildEvent(eventName, leadId, userData, customData = {}) {
  return {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: `lead-${leadId}-${eventName}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    event_source_url:
      userData?.event_source_url ||
      (typeof process !== "undefined" ? process.env.APP_URL : undefined),
    action_source: "website",
    user_data: {
      em: userData.em || [],
      ph: userData.ph || [],
      fn: userData.fn || [],
      ln: userData.ln || [],
      client_ip: userData.client_ip,
      client_user_agent: userData.client_user_agent,
      fbp: userData.fbp,
      fbc: userData.fbc,
    },
    custom_data: {
      ...customData,
      ...(TEST_MODE ? { test_event_code: process.env.META_CAPI_TEST_CODE || "TEST12345" } : {}),
    },
  };
}

async function postEvents(events) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: events }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Meta CAPI ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

/**
 * Send a Lead event for a website contact form submission.
 * Fire-and-forget: caller should NOT await.
 */
export function sendLeadEvent({ leadId, email, phone, name, source, serviceType, request }) {
  if (!ENABLED_OK) {
    const reason = !ENABLED ? "disabled" : !PIXEL_ID ? "no_pixel" : "no_token";
    console.warn(
      `[meta-capi] skipping Lead event for lead ${leadId || "?"}: ${reason}. Set META_PIXEL_ID + META_CAPI_TOKEN and META_CAPI_ENABLED=true.`
    );
    return Promise.resolve({ skipped: true, reason });
  }
  try {
    const userData = buildUserData({ email, phone, name, request });
    const event = buildEvent(
      "Lead",
      leadId,
      { ...userData, event_source_url: request?.url },
      {
        content_name: "Contact Form",
        content_category: serviceType || "general",
        content_type: "lead",
        lead_source: source || "website",
        value: 0,
        currency: "CAD",
      },
    );
    return postEvents([event]).then((r) => ({ ok: true, response: r })).catch((err) => {
      console.error("[meta-capi] post failed:", err.message);
      return { ok: false, error: err.message };
    });
  } catch (err) {
    console.error("[meta-capi] build failed:", err.message);
    return Promise.resolve({ ok: false, error: err.message });
  }
}

/**
 * Send a qualified event when a lead is marked SQL/converted in the admin.
 * Caller should NOT await.
 */
export function sendQualifiedEvent({ leadId, email, phone, name, stage, value, request }) {
  if (!ENABLED_OK) return Promise.resolve({ skipped: true });
  try {
    const userData = buildUserData({ email, phone, name, request });
    const event = buildEvent(
      "SubmitApplication",
      leadId,
      { ...userData, event_source_url: request?.url },
      {
        content_name: `Lead ${stage}`,
        content_category: "qualified",
        value: Number(value) || 0,
        currency: "CAD",
      },
    );
    return postEvents([event]).catch((err) => {
      console.error("[meta-capi] qualified post failed:", err.message);
      return { ok: false };
    });
  } catch (err) {
    return Promise.resolve({ ok: false, error: err.message });
  }
}

export const metaCapiStatus = {
  enabled: ENABLED,
  pixelConfigured: !!PIXEL_ID,
  tokenConfigured: !!ACCESS_TOKEN,
  testMode: TEST_MODE,
};
