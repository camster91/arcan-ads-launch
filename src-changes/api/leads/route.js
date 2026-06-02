import sql from "../utils/sql.js";
import { generalLimiter, authLimiter } from "../utils/rate-limit.js";
import { auditLog } from "../utils/audit.js";
import { requireAdmin, getCurrentUser } from "../utils/auth.js";
import { validateBody, schemas } from "../utils/validate.js";

// Create a new lead (public endpoint — used by contact form)
export async function POST(request) {
  const limited = authLimiter(request); // tight limit — public endpoint
  if (limited) return limited;

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["name", "email", "phone", "serviceType"];
    for (const field of requiredFields) {
      if (!body[field] || body[field].trim() === "") {
        return Response.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate phone format
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!body.phone || !phoneRegex.test(body.phone)) {
      return Response.json(
        { error: "Invalid phone number format" },
        { status: 400 },
      );
    }

    // Sanitize lengths
    if (body.name.trim().length > 255) return Response.json({ error: "Name too long" }, { status: 400 });
    if (body.email.trim().length > 255) return Response.json({ error: "Email too long" }, { status: 400 });

    // Calculate follow-up date (24 hours from now)
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 1);

    // Insert new lead into database
    const rows = await sql`
      INSERT INTO leads (
        name,
        email,
        phone,
        service_type,
        project_description,
        preferred_contact,
        status,
        lead_source,
        meta_lead_id,
        follow_up_date,
        address
      ) VALUES (
        ${body.name.trim()},
        ${body.email.trim().toLowerCase()},
        ${body.phone.trim()},
        ${body.serviceType},
        ${body.projectDescription || ""},
        ${body.preferredContact || "phone"},
        'new',
        ${body.leadSource || "website"},
        ${body.meta_lead_id || null},
        ${followUpDate.toISOString().split("T")[0]},
        ${body.address || ""}
      )
      RETURNING id, name, email, phone, service_type, status, lead_source, created_at
    `;

    const newLead = rows[0];

    // Create initial follow-up task
    await sql`
      INSERT INTO follow_ups (
        lead_id,
        follow_up_date,
        follow_up_type,
        status,
        notes
      ) VALUES (
        ${newLead.id},
        ${followUpDate.toISOString().split("T")[0]},
        'phone_call',
        'pending',
        'Initial contact - respond to estimate request within 24 hours'
      )
    `;

    return Response.json({
      success: true,
      message: "Lead created successfully",
      lead: {
        id: newLead.id,
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        serviceType: newLead.service_type,
        status: newLead.status,
        leadSource: newLead.lead_source,
        createdAt: newLead.created_at,
      },
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return Response.json(
      { error: "Failed to create lead. Please try again." },
      { status: 500 },
    );
  }
}

// Get all leads with filtering and pagination (ADMIN ONLY)
export async function GET(request) {
  try {
    const authorized = await requireAdmin(request);
    if (!authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);

    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const sort = url.searchParams.get("sort");
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 20, 100); // cap at 100
    const search = url.searchParams.get("search");
    const includeDeleted = url.searchParams.get("include_deleted") === "true";
    const offset = (page - 1) * limit;

    // Build dynamic query
    let queryParts = ["SELECT * FROM leads WHERE 1=1"];
    // Exclude soft-deleted by default
    if (!includeDeleted) {
      queryParts.push("AND deleted_at IS NULL");
    }
    let queryValues = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryParts.push(`AND status = $${paramCount}`);
      queryValues.push(status);
    }

    if (source) {
      paramCount++;
      queryParts.push(`AND lead_source = $${paramCount}`);
      queryValues.push(source);
    }

    // Build dynamic ORDER BY from sort param. Defaults to newest first.
    let orderBy = "ORDER BY created_at DESC";
    if (sort) {
      const sortMap = {
        created_desc: "created_at DESC",
        created_asc: "created_at ASC",
        name_asc: "name ASC",
        name_desc: "name DESC",
        status_asc: "status ASC",
      };
      orderBy = `ORDER BY ${sortMap[sort] || "created_at DESC"}`;
    }
    queryParts.push(orderBy);

    if (search) {
      paramCount++;
      queryParts.push(`AND (
        LOWER(name) LIKE LOWER($${paramCount}) OR
        LOWER(email) LIKE LOWER($${paramCount}) OR
        LOWER(phone) LIKE LOWER($${paramCount}) OR
        LOWER(service_type) LIKE LOWER($${paramCount})
      )`);
      queryValues.push(`%${search}%`);
    }

    // Add pagination
    paramCount++;
    queryParts.push(`LIMIT $${paramCount}`);
    queryValues.push(limit);

    paramCount++;
    queryParts.push(`OFFSET $${paramCount}`);
    queryValues.push(offset);

    const query = queryParts.join(" ");
    const leads = await sql(query, queryValues);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM leads WHERE 1=1";
    if (!includeDeleted) {
      countQuery += " AND deleted_at IS NULL";
    }
    let countValues = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countValues.push(status);
    }

    if (source) {
      countParamCount++;
      countQuery += ` AND lead_source = $${countParamCount}`;
      countValues.push(source);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(name) LIKE LOWER($${countParamCount}) OR
        LOWER(email) LIKE LOWER($${countParamCount}) OR
        LOWER(phone) LIKE LOWER($${countParamCount}) OR
        LOWER(service_type) LIKE LOWER($${countParamCount})
      )`;
      countValues.push(`%${search}%`);
    }

    const countResult = await sql(countQuery, countValues);
    const total = parseInt(countResult[0].total);

    const responseBody = {
      success: true,
      leads: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    return Response.json(responseBody);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return Response.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

// Update a lead (ADMIN ONLY) — with full yup validation
export async function PUT(request) {
  try {
    const authorized = await requireAdmin(request);
    if (!authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body with yup schema
    const [body, validationError] = await validateBody(request, schemas.leadUpdate);
    if (validationError) return validationError;

    const {
      id,
      name,
      email,
      phone,
      service_type,
      preferred_contact,
      contact_method,
      status,
      lead_source,
      estimated_value,
      follow_up_date,
      address,
      project_description,
      notes,
      tags,
    } = body;

    if (!id) {
      return Response.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const exists = await sql`SELECT id FROM leads WHERE id = ${id} AND deleted_at IS NULL`;
    if (!exists || exists.length === 0) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    const setClauses = [];
    const values = [];
    let i = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${i++}`);
      values.push(name);
    }
    if (email !== undefined) {
      setClauses.push(`email = $${i++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      setClauses.push(`phone = $${i++}`);
      values.push(phone);
    }
    if (service_type !== undefined) {
      setClauses.push(`service_type = $${i++}`);
      values.push(service_type);
    }
    if (preferred_contact !== undefined || contact_method !== undefined) {
      setClauses.push(`preferred_contact = $${i++}`);
      values.push(preferred_contact || contact_method);
    }
    if (status !== undefined) {
      setClauses.push(`status = $${i++}`);
      values.push(status);
    }
    if (lead_source !== undefined) {
      setClauses.push(`lead_source = $${i++}`);
      values.push(lead_source);
    }
    if (estimated_value !== undefined) {
      setClauses.push(`estimated_value = $${i++}`);
      values.push(
        estimated_value === null ? null : parseFloat(estimated_value),
      );
    }
    if (follow_up_date !== undefined) {
      setClauses.push(`follow_up_date = $${i++}`);
      values.push(follow_up_date);
    }
    if (address !== undefined) {
      setClauses.push(`address = $${i++}`);
      values.push(address);
    }
    if (project_description !== undefined) {
      setClauses.push(`project_description = $${i++}`);
      values.push(project_description);
    }
    if (notes !== undefined) {
      setClauses.push(`notes = $${i++}`);
      values.push(notes);
    }
    if (tags !== undefined) {
      setClauses.push(`tags = $${i++}`);
      values.push(JSON.stringify(tags));
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    // updated_at if column exists (schema has updated_at)
    setClauses.push(`updated_at = $${i++}`);
    values.push(new Date().toISOString());

    // where id
    values.push(id);

    const query = `UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`;
    const result = await sql(query, values);

    return Response.json({ success: true, lead: result[0] });
  } catch (error) {
    console.error("Error updating lead:", error);
    return Response.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

// Soft-delete a lead (ADMIN ONLY) — sets deleted_at, recoverable via /api/admin/recovery
export async function DELETE(request) {
  try {
    const authorized = await requireAdmin(request);
    if (!authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: "Lead ID is required" }, { status: 400 });
    }

    // Check if lead exists and is not already deleted
    const existingLead = await sql`SELECT id, name FROM leads WHERE id = ${id} AND deleted_at IS NULL`;
    if (!existingLead || existingLead.length === 0) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    // Soft delete — set deleted_at timestamp instead of hard delete
    const deletedAt = new Date().toISOString();
    await sql`UPDATE leads SET deleted_at = ${deletedAt} WHERE id = ${id}`;

    // Also soft-delete related follow-ups
    try {
      await sql`UPDATE follow_ups SET deleted_at = ${deletedAt} WHERE lead_id = ${id} AND deleted_at IS NULL`;
    } catch {
      // follow_ups may not have deleted_at yet — that's ok
    }

    return Response.json({
      success: true,
      message: `Lead "${existingLead[0].name}" has been archived. It can be recovered from /api/admin/recovery.`,
      deleted_at: deletedAt,
    });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return Response.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
