/**
 * Delayed Email Worker
 *
 * Processes the delayed_emails queue. Designed to be called by:
 * - A cron job (e.g., every 5-15 minutes)
 * - The Meta webhook (post-lead-save, fire-and-forget)
 * - Manual trigger from the admin UI
 *
 * For each pending row whose scheduled_for <= NOW(), send the email via
 * sendTemplatedEmail and mark status = 'sent'. If the send fails, increment
 * attempts and store last_error.
 *
 * Auth: requires the x-cron-secret header OR admin auth (same as the
 * cold-email send endpoint).
 */

import sql from "@/app/api/utils/sql";
import { getCurrentUser, unauthorizedResponse } from "@/app/api/utils/auth";
import { sendTemplatedEmail } from "@/app/api/utils/send-email";

const BATCH_LIMIT = 50;
const MAX_ATTEMPTS = 3;

export async function POST(request) {
  // Allow cron OR admin
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();
  }

  try {
    // Find pending emails whose time has come. Skip rows that have failed too many times.
    const due = await sql`
      SELECT id, workflow_id, template_name, recipient_email, data, scheduled_for, attempts, related_type, related_id
      FROM delayed_emails
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY scheduled_for ASC
      LIMIT ${BATCH_LIMIT}
    `;

    if (due.length === 0) {
      return Response.json({ processed: 0, message: "No delayed emails due" });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const row of due) {
      try {
        await sendTemplatedEmail(
          row.template_name,
          row.data || {},
          row.recipient_email,
          {
            relatedType: row.related_type,
            relatedId: row.related_id,
          }
        );
        await sql`
          UPDATE delayed_emails
          SET status = 'sent', sent_at = NOW(), attempts = attempts + 1, last_error = NULL
          WHERE id = ${row.id}
        `;
        sent++;
      } catch (err) {
        await sql`
          UPDATE delayed_emails
          SET attempts = attempts + 1, last_error = ${err.message || String(err)}
          WHERE id = ${row.id}
        `;
        // If we hit MAX_ATTEMPTS, mark as failed so it doesn't keep retrying
        if (row.attempts + 1 >= MAX_ATTEMPTS) {
          await sql`
            UPDATE delayed_emails
            SET status = 'failed'
            WHERE id = ${row.id} AND status = 'pending'
          `;
        }
        failed++;
        errors.push({ id: row.id, error: err.message });
      }
    }

    return Response.json({ processed: due.length, sent, failed, errors });
  } catch (error) {
    console.error("delayed-emails worker error:", error);
    return Response.json(
      { error: "Worker failed", details: error.message },
      { status: 500 }
    );
  }
}

// GET — inspect the queue (admin)
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 50, 200);

    const rows = await sql`
      SELECT id, workflow_id, template_name, recipient_email, scheduled_for, status, attempts, last_error, sent_at, created_at
      FROM delayed_emails
      WHERE status = ${status}
      ORDER BY scheduled_for ASC
      LIMIT ${limit}
    `;

    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= NOW())::int as due_now
      FROM delayed_emails
    `;

    return Response.json({ rows, stats: stats[0] });
  } catch (error) {
    console.error("delayed-emails GET error:", error);
    return Response.json({ error: "Failed to load queue" }, { status: 500 });
  }
}
