import sql from "./sql.js";

/**
 * Build an RFC 2822 email message and base64url-encode it for the Gmail API.
 */
function buildRawMessage({ from, to, subject, html, text }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
  ];
  const body = html || text || "";
  const raw = [...headers, "", body].join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
  templateName,
  relatedType,
  relatedId,
  userId,
  metadata = {},
}) {
  const matonKey = process.env.MATON_API_KEY;

  if (!matonKey) {
    throw new Error(
      "Maton API key is not configured. Please set MATON_API_KEY in your project secrets.",
    );
  }

  const defaultFrom = `Arcan Painting <${process.env.GOOGLE_EMAIL || "info@arcanpainting.ca"}>`;
  const finalFrom = from || defaultFrom;
  const toArray = Array.isArray(to) ? to : [to];
  const finalTo = toArray[0];

  let status = "failed";
  let messageId = null;
  let errorMessage = null;

  try {
    // Send each recipient via Maton → Gmail gateway
    for (const recipient of toArray) {
      const raw = buildRawMessage({ from: finalFrom, to: recipient, subject, html, text });

      const response = await fetch(
        "https://gateway.maton.ai/google-mail/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${matonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        },
      );

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // no-op
      }

      if (!response.ok) {
        errorMessage =
          data?.error?.message ||
          `Failed to send email [${response.status}] ${response.statusText}`;
        throw new Error(errorMessage);
      }

      messageId = data?.id;
    }

    status = "sent";

    // Log successful email
    try {
      await sql`
        INSERT INTO email_logs (
          to_email, from_email, subject, template_name, status, resend_id,
          related_type, related_id, user_id, metadata, sent_at
        ) VALUES (
          ${finalTo}, ${finalFrom}, ${subject}, ${templateName}, ${status},
          ${messageId}, ${relatedType}, ${relatedId}, ${userId}, ${JSON.stringify(metadata)},
          CURRENT_TIMESTAMP
        )
      `;
    } catch (logError) {
      console.error("Failed to log email send:", logError);
    }

    return { id: messageId };
  } catch (error) {
    errorMessage = error.message;

    // Log failed email
    try {
      await sql`
        INSERT INTO email_logs (
          to_email, from_email, subject, template_name, status, error_message,
          related_type, related_id, user_id, metadata, sent_at
        ) VALUES (
          ${finalTo}, ${finalFrom}, ${subject}, ${templateName}, ${status}, ${errorMessage},
          ${relatedType}, ${relatedId}, ${userId}, ${JSON.stringify(metadata)},
          CURRENT_TIMESTAMP
        )
      `;
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }

    throw error;
  }
}

// Helper function to send emails using templates
export async function sendTemplatedEmail(
  templateName,
  variables,
  recipientEmail,
  options = {},
) {
  try {
    // Get template from database
    const template = await sql`
      SELECT * FROM email_templates 
      WHERE name = ${templateName} AND is_active = true
    `;

    if (template.length === 0) {
      throw new Error(`Email template '${templateName}' not found or inactive`);
    }

    const tmpl = template[0];

    // Simple variable replacement ({{variable}} format)
    let subject = tmpl.subject_template;
    let html = tmpl.body_template || tmpl.html_template || '';
    let text = tmpl.text_template || '';

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.split(placeholder).join(value || "");
      html = html.split(placeholder).join(value || "");
      if (text) text = text.split(placeholder).join(value || "");
    }

    // Send email with template name for logging
    return await sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      templateName,
      ...options,
    });
  } catch (error) {
    console.error(`Failed to send templated email '${templateName}':`, error);
    throw error;
  }
}
