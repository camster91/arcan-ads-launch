import { sendGmailEmail } from "@/lib/google.js";
import { notifyGerardo, formatLeadNotification } from "../utils/telegram.js";
import { authLimiter } from "../utils/rate-limit.js";
import { auditLog } from "../utils/audit.js";
import { sendLeadEvent } from "../utils/meta-capi.js";

// Spawn lead qualifier agent in background (fire-and-forget, non-blocking)
async function spawnLeadQualifierAsync(leadData, baseUrl) {
  try {
    await fetch(`${baseUrl}/api/agents/lead-qualifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });
  } catch (err) {
    console.error('Lead qualifier spawn failed (non-fatal):', err.message);
  }
}

export async function POST(request) {
  const limited = authLimiter(request);
  if (limited) return limited;

  try {
    const body = await request.json();

    // Validate required minimal fields
    const requiredFields = ["name", "serviceType"]; // email/phone collected conditionally
    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === "") {
        return Response.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Require at least one contact method
    const hasEmail = !!(body.email && String(body.email).trim() !== "");
    const hasPhone = !!(body.phone && String(body.phone).trim() !== "");
    if (!hasEmail && !hasPhone) {
      return Response.json(
        { error: "Either email or phone is required" },
        { status: 400 },
      );
    }

    // If preferredContact provided, ensure that method exists
    const preferredContact =
      body.preferredContact || (hasEmail ? "email" : "phone");
    if (preferredContact === "email" && !hasEmail) {
      return Response.json(
        { error: "Email is required when preferred contact is email" },
        { status: 400 },
      );
    }
    if (preferredContact === "phone" && !hasPhone) {
      return Response.json(
        { error: "Phone is required when preferred contact is phone" },
        { status: 400 },
      );
    }

    // Validate formats only for the provided values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (hasEmail && !emailRegex.test(body.email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (hasPhone && !phoneRegex.test(body.phone)) {
      return Response.json(
        { error: "Invalid phone number format" },
        { status: 400 },
      );
    }

    let leadId = null;
    let leadSaved = false;

    // Try saving the lead (accepts email-only or phone-only leads; DB requires both for validation but accepts either if the other is an empty string)
    try {
      const baseUrl = process.env.APP_URL || request.url.split("/api/")[0];
      const leadResponse = await fetch(
        `${baseUrl}/api/leads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: body.name,
            email: body.email || "",
            phone: body.phone || "",
            serviceType: body.serviceType,
            projectDescription: body.projectDescription,
            preferredContact: preferredContact,
            address: body.address,
            leadSource: body.leadSource || "website",
          }),
        },
      );

        if (leadResponse.ok) {
          const leadData = await leadResponse.json();
          leadId = leadData.lead?.id;
          leadSaved = true;

          // Fire-and-forget: spawn AI lead qualifier in background
          const baseUrl = request.url.split("/api/")[0];
          spawnLeadQualifierAsync({
            leadId,
            name: body.name,
            email: body.email,
            phone: body.phone,
            serviceType: body.serviceType,
            projectDescription: body.projectDescription,
            address: body.address,
            preferredContact,
          }, baseUrl);

          // Fire-and-forget: Meta CAPI server-side Lead event for attribution
          sendLeadEvent({
            leadId,
            email: body.email,
            phone: body.phone,
            name: body.name,
            source: "website_contact",
            serviceType: body.serviceType,
            request,
          });
        } else {
          const leadError = await leadResponse.json();
          console.error("Failed to save lead:", leadError.error);
        }
    } catch (dbError) {
      console.error("Database error (continuing with email):", dbError);
    }

    // Send notification + confirmation emails via Gmail
    const adminEmail = process.env.GOOGLE_EMAIL || "info@arcanpainting.ca";
    try {
      // Notify the business
      await sendGmailEmail({
        to: adminEmail,
        subject: `New Lead: ${body.name} — ${body.serviceType}`,
        replyTo: hasEmail ? body.email : undefined,
        body: `<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${body.name}</p>
${hasEmail ? `<p><strong>Email:</strong> ${body.email}</p>` : ""}
${hasPhone ? `<p><strong>Phone:</strong> ${body.phone}</p>` : ""}
<p><strong>Service:</strong> ${body.serviceType}</p>
<p><strong>Preferred Contact:</strong> ${preferredContact}</p>
${body.address ? `<p><strong>Address:</strong> ${body.address}</p>` : ""}
${body.projectDescription ? `<p><strong>Description:</strong> ${body.projectDescription}</p>` : ""}`,
      });

      // Send confirmation to customer if they provided email
      if (hasEmail) {
        await sendGmailEmail({
          to: body.email,
          subject: "We received your request — Arcan Painting",
          body: `<p>Hi ${body.name},</p>
<p>Thank you for reaching out to Arcan Painting! We received your inquiry about <strong>${body.serviceType}</strong> and will contact you within 24 hours to schedule your free estimate.</p>
<p>Best regards,<br>The Arcan Painting Team</p>`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send Gmail emails:", emailError);
      // Don't fail the request if emails fail
    }

    // Notify Gerardo via Telegram
    try {
      await notifyGerardo(formatLeadNotification(body));
    } catch (tgError) {
      console.error("Telegram notification failed:", tgError.message);
    }

    return Response.json({
      success: true,
      message:
        "Thank you! We will contact you within 24 hours to schedule your free estimate.",
      lead_saved: leadSaved,
      lead_id: leadId,
    });
  } catch (error) {
    console.error("Error processing contact form:", error?.message || error);
    // Return a graceful error instead of a generic 500 to avoid dead ends in the UI
    return Response.json(
      {
        error:
          "We couldn't complete your request right now, but your info was received. Please expect a follow-up soon or call us directly at (555) PAINT-US.",
      },
      { status: 502 },
    );
  }
}
