import sql from "@/app/api/utils/sql";
import { getCurrentUser } from "@/app/api/utils/auth";
import { sendTemplatedEmail } from "@/app/api/utils/send-email";

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await sql`
      SELECT 
        w.*,
        t.display_name as template_name,
        t.subject_template
      FROM email_workflows w
      LEFT JOIN email_templates t ON w.template_id = t.id
      ORDER BY w.trigger_event, w.delay_hours
    `;

    return Response.json({ workflows });
  } catch (error) {
    console.error("Error fetching email workflows:", error);
    return Response.json(
      { error: "Failed to fetch email workflows" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      trigger_event,
      template_id,
      delay_hours = 0,
      conditions = {},
      is_active = true,
    } = body;

    if (!name || !trigger_event || !template_id) {
      return Response.json(
        { error: "Name, trigger event, and template ID are required" },
        { status: 400 },
      );
    }

    const workflow = await sql`
      INSERT INTO email_workflows (
        name, trigger_event, template_id, delay_hours, conditions, is_active, created_at
      ) VALUES (
        ${name}, ${trigger_event}, ${template_id}, ${delay_hours}, 
        ${JSON.stringify(conditions)}, ${is_active}, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    return Response.json({ workflow: workflow[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating email workflow:", error);
    return Response.json(
      { error: "Failed to create email workflow" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, template_id, delay_hours, conditions, is_active } = body;

    if (!id) {
      return Response.json(
        { error: "Workflow ID is required" },
        { status: 400 },
      );
    }

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (template_id !== undefined) {
      paramCount++;
      updates.push(`template_id = $${paramCount}`);
      params.push(template_id);
    }

    if (delay_hours !== undefined) {
      paramCount++;
      updates.push(`delay_hours = $${paramCount}`);
      params.push(delay_hours);
    }

    if (conditions !== undefined) {
      paramCount++;
      updates.push(`conditions = $${paramCount}`);
      params.push(JSON.stringify(conditions));
    }

    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
    }

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    paramCount++;
    params.push(id);

    const query = `
      UPDATE email_workflows 
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await sql(query, params);

    if (result.length === 0) {
      return Response.json({ error: "Workflow not found" }, { status: 404 });
    }

    return Response.json({ workflow: result[0] });
  } catch (error) {
    console.error("Error updating email workflow:", error);
    return Response.json(
      { error: "Failed to update email workflow" },
      { status: 500 },
    );
  }
}

// Trigger workflow emails (called by business events)
export async function triggerWorkflow(eventType, data) {
  try {
    // Get active workflows for this event
    const workflows = await sql`
      SELECT w.*, t.name as template_name
      FROM email_workflows w
      JOIN email_templates t ON w.template_id = t.id
      WHERE w.trigger_event = ${eventType} 
        AND w.is_active = true
        AND t.is_active = true
      ORDER BY w.delay_hours
    `;

    const results = [];

    for (const workflow of workflows) {
      try {
        // Check if conditions are met
        const conditions = workflow.conditions || {};
        let conditionsMet = true;

        for (const [key, value] of Object.entries(conditions)) {
          if (data[key] !== value) {
            conditionsMet = false;
            break;
          }
        }

        if (!conditionsMet) {
          continue;
        }

        // Determine recipient email
        let recipientEmail = data.customer_email || data.email;
        if (
          eventType === "new_lead" &&
          workflow.template_name === "new_lead_notification"
        ) {
          recipientEmail = "info@arcanpainting.ca"; // Send to business
        }

        if (!recipientEmail) {
          console.warn(`No recipient email for workflow ${workflow.name}`);
          continue;
        }

        // For immediate emails (delay_hours = 0), send now
        if (workflow.delay_hours === 0) {
          await sendTemplatedEmail(
            workflow.template_name,
            {
              ...data,
              app_url: process.env.APP_URL,
            },
            recipientEmail,
            {
              relatedType: data.related_type,
              relatedId: data.related_id,
              userId: data.user_id,
            },
          );

          results.push({
            workflow_id: workflow.id,
            template: workflow.template_name,
            recipient: recipientEmail,
            status: "sent",
            delay_hours: 0,
          });
        } else {
          // Delayed emails: insert into delayed_emails queue. A scheduled worker
          // (admin route + cron, see delayed-emails/route.js) processes them.
          // For now, schedule relative to the moment this trigger fires.
          const scheduledFor = new Date(Date.now() + workflow.delay_hours * 3600 * 1000);
          await sql`
            INSERT INTO delayed_emails
              (workflow_id, template_name, recipient_email, data, scheduled_for, status, related_type, related_id, created_at)
            VALUES
              (${workflow.id}, ${workflow.template_name}, ${recipientEmail}, ${JSON.stringify({ ...data, app_url: process.env.APP_URL })},
               ${scheduledFor.toISOString()}, 'pending', ${data.related_type || null}, ${data.related_id || null}, NOW())
            ON CONFLICT (workflow_id, related_id) DO NOTHING
          `;

          results.push({
            workflow_id: workflow.id,
            template: workflow.template_name,
            recipient: recipientEmail,
            status: "scheduled",
            delay_hours: workflow.delay_hours,
            scheduled_for: scheduledFor.toISOString(),
          });
        }
      } catch (workflowError) {
        console.error(
          `Error executing workflow ${workflow.name}:`,
          workflowError,
        );
        results.push({
          workflow_id: workflow.id,
          template: workflow.template_name,
          status: "failed",
          error: workflowError.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error triggering email workflows:", error);
    throw error;
  }
}
