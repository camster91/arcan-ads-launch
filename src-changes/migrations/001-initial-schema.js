/**
 * Migration: 001-initial-schema
 * Run once at app startup to create all required tables.
 * Idempotent — safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 */
import sql from "@/app/api/utils/sql.js";
import { hash as argon2Hash } from "argon2";

let migrationRun = false;

export async function runMigrations() {
  if (migrationRun) return; // Only run once per process lifetime
  migrationRun = true;

  try {
    // ── auth_users ──────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'owner',
        password_is_hashed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    // Forward-compat columns (safe to run multiple times)
    await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_is_hashed BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;

    // ── auth_sessions ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES auth_users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `;

    // ── password_reset_tokens ───────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES auth_users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── leads (soft-delete support) ─────────────────────────────────────────
    // If the leads table was never created (rare — typically from a prior migration
    // or manual SQL), create it now with the columns the new code expects.
    // The CREATE TABLE is idempotent; existing tables are left untouched.
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        service_type VARCHAR(100),
        project_description TEXT,
        preferred_contact VARCHAR(20) DEFAULT 'phone',
        status VARCHAR(50) DEFAULT 'new',
        lead_source VARCHAR(100) DEFAULT 'website',
        meta_lead_id VARCHAR(100),
        estimated_value NUMERIC,
        qualification_score INTEGER,
        follow_up_date DATE,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP DEFAULT NULL
      )
    `;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100) DEFAULT 'website'`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_lead_id VARCHAR(100)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source) WHERE deleted_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_meta_lead_id ON leads(meta_lead_id) WHERE deleted_at IS NULL`;
    await sql`ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`;

    // ── email_templates (referenced by email-workflows engine) ─────────────
    await sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        text_template TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── email_workflows (referenced by triggerWorkflow in email-workflows/route.js) ─
    await sql`
      CREATE TABLE IF NOT EXISTS email_workflows (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_event VARCHAR(100) NOT NULL,
        template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
        delay_hours INTEGER DEFAULT 0,
        conditions JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_workflows_trigger ON email_workflows(trigger_event) WHERE is_active = true`;

    // ── delayed_emails (queue for delay_hours > 0 workflows) ───────────────────
    // Each row is an email to be sent at scheduled_for. The worker at
    // /api/delayed-emails/process picks up pending rows whose time has come.
    await sql`
      CREATE TABLE IF NOT EXISTS delayed_emails (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER REFERENCES email_workflows(id) ON DELETE CASCADE,
        template_name VARCHAR(255) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        data JSONB DEFAULT '{}'::jsonb,
        scheduled_for TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        sent_at TIMESTAMP,
        related_type VARCHAR(50),
        related_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_delayed_emails_pending ON delayed_emails(scheduled_for) WHERE status = 'pending'`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_delayed_emails_unique ON delayed_emails(workflow_id, related_id) WHERE related_id IS NOT NULL`;

    // ── auth_verification_codes (magic code auth) ───────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS auth_verification_codes (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_auth_codes_username ON auth_verification_codes(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auth_codes_code ON auth_verification_codes(code)`;

    // ── agent_runs (from agents/migrate.js) ─────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id SERIAL PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        input JSONB,
        output JSONB,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `;

    // ── audit_logs ──────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        user_id INTEGER,
        username VARCHAR(255),
        status VARCHAR(50) DEFAULT 'success',
        ip_address VARCHAR(45),
        user_agent TEXT,
        changes JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── Performance indexes ──────────────────────────────────────────────────
    // leads table
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at) WHERE deleted_at IS NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON leads(follow_up_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)`;

    // estimates table
    await sql`CREATE INDEX IF NOT EXISTS idx_estimates_lead_id ON estimates(lead_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_estimates_estimate_number ON estimates(estimate_number)`;

    // projects table
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_estimate_id ON projects(estimate_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_assigned_painter_id ON projects(assigned_painter_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC)`;

    // auth_sessions — hot path on every request
    await sql`CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)`;

    // follow_ups table
    await sql`CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_follow_ups_follow_up_date ON follow_ups(follow_up_date)`;

    // audit_logs
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`;

    // agent_runs
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id)`;

    // ── marketing_connections ─────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS marketing_connections (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL UNIQUE,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        scopes TEXT,
        account_email VARCHAR(255),
        account_name VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── marketing_campaigns ───────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50),
        campaign_name VARCHAR(255),
        campaign_id VARCHAR(255),
        status VARCHAR(50),
        budget NUMERIC,
        spend NUMERIC DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── email_sequences ───────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS email_sequences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        target_audience VARCHAR(255),
        subject_template TEXT,
        body_template TEXT,
        follow_up_days INTEGER DEFAULT 3,
        status VARCHAR(50) DEFAULT 'draft',
        sent_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── outreach_contacts ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS outreach_contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        company VARCHAR(255),
        role VARCHAR(255),
        platform VARCHAR(50),
        sequence_id INTEGER REFERENCES email_sequences(id),
        status VARCHAR(50) DEFAULT 'not_contacted',
        last_contacted_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── ai_conversations ──────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        role VARCHAR(20),
        content TEXT,
        model VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── ad_creatives ──────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS ad_creatives (
        id SERIAL PRIMARY KEY,
        campaign_name VARCHAR(255),
        platform VARCHAR(50) NOT NULL,
        ad_type VARCHAR(50),
        headline TEXT,
        primary_text TEXT,
        description TEXT,
        call_to_action VARCHAR(100),
        target_audience TEXT,
        service VARCHAR(100),
        location VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── ads_accounts ──────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS ads_accounts (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        account_id VARCHAR(255),
        account_name VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        currency VARCHAR(10) DEFAULT 'CAD',
        is_active BOOLEAN DEFAULT true,
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── live_campaigns ────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS live_campaigns (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        platform_campaign_id VARCHAR(255),
        creative_id INTEGER REFERENCES ad_creatives(id),
        campaign_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        daily_budget NUMERIC,
        total_budget NUMERIC,
        spent NUMERIC DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        target_url VARCHAR(500) DEFAULT 'https://arcanpainting.ca',
        targeting JSONB DEFAULT '{}',
        platform_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── cold_email_prospects ───────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS cold_email_prospects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        company VARCHAR(255),
        role VARCHAR(100),
        city VARCHAR(100),
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        sequence_step INTEGER DEFAULT 0,
        last_emailed_at TIMESTAMP,
        replied_at TIMESTAMP,
        converted_at TIMESTAMP,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── cold_email_sends ────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS cold_email_sends (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER REFERENCES cold_email_prospects(id),
        sequence_step INTEGER,
        subject VARCHAR(500),
        body TEXT,
        mailgun_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'sent',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── cold_email_templates ────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS cold_email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        target_role VARCHAR(100),
        sequence_step INTEGER DEFAULT 1,
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── Seed default cold email templates ────────────────────────────────────
    // Only insert if table is empty (idempotent)
    const existingTemplates = await sql`SELECT COUNT(*)::int as count FROM cold_email_templates`;
    if (existingTemplates[0].count === 0) {
      await sql`
        INSERT INTO cold_email_templates (name, target_role, sequence_step, subject_template, body_template) VALUES
        ('RE Agent Intro', 'real_estate_agent', 1,
         'Partnering with you — painting services for your listings in {{city}}',
         'Hi {{name}},

I hope this finds you well! My name is Gerardo, and I run Arcan Painting — a professional painting company serving the Greater Toronto Area.

I wanted to reach out because I know how much a fresh coat of paint can make a difference when you''re preparing a property for sale. We specialize in quick turnarounds for real estate listings — often completing full interior paint jobs in 2-3 days to help you hit your listing date.

We work with several agents across {{city}} and the GTA, and our clients regularly tell us it''s one of the best ROI improvements before listing.

Would you be open to a quick 10-minute call to explore if we might be a good fit for your future listings?

Best,
Gerardo
Arcan Painting
(416) 727-2148
arcanpainting.ca'),
        ('RE Agent Follow-Up', 'real_estate_agent', 2,
         'Quick follow-up — painting for your listings',
         'Hi {{name}},

I wanted to follow up on my message from a few days ago about painting services for real estate listings.

I understand you''re busy — just wanted to make sure this didn''t get buried. We''ve helped listings in {{city}} sell faster and for more by refreshing interiors before listing.

If timing isn''t right now, no worries at all — I''d love to be a resource for you when the need comes up.

Happy to send over some before/after photos from recent listings if that''s helpful.

Best,
Gerardo
Arcan Painting
(416) 727-2148'),
        ('Property Manager Intro', 'property_manager', 1,
         'Reliable painting contractor for your properties in {{city}}',
         'Hi {{name}},

My name is Gerardo from Arcan Painting. We provide professional interior and exterior painting services to property managers and landlords across the GTA.

I know that when a unit turns over or a property needs refreshing, you need someone reliable who shows up on time, communicates well, and does quality work without the headaches. That''s exactly what we focus on.

We offer:
- Fast turnarounds on unit turnovers
- Competitive bulk pricing for multiple units
- Fully insured and WSIB-compliant
- Free estimates within 24 hours

Would you be open to keeping us in mind for your next project? I''d love to provide a quote.

Best,
Gerardo
Arcan Painting
(416) 727-2148
arcanpainting.ca'),
        ('Property Manager Follow-Up', 'property_manager', 2,
         'Following up — painting for your managed properties',
         'Hi {{name}},

Quick follow-up on my earlier note about painting services for your properties in {{city}}.

We just finished a 12-unit refresh for a property manager in Mississauga — happy to share photos and pricing if you''d ever like to compare.

No pressure at all — just wanted to make sure you have us on your radar for when the need comes up.

Gerardo
Arcan Painting
(416) 727-2148'),
        ('HOA Manager Intro', 'hoa_manager', 1,
         'Reliable painting contractor for {{city}} HOAs and condos',
         'Hi {{name}},

My name is Gerardo from Arcan Painting. We work with HOA boards and condo corporations across the GTA who need a dependable painting contractor for common areas, hallways, lobbies, and exterior maintenance.

We understand HOA budgets and timelines — we provide detailed quotes, stick to agreed schedules, and document everything for your board meetings.

We currently service 3-5 condo/HOA properties per month in {{city}} and surrounding areas.

Would you be open to a quick call to see if we''d be a fit for your upcoming projects?

Gerardo
Arcan Painting
(416) 727-2148
arcanpainting.ca'),
        ('HOA Manager Follow-Up', 'hoa_manager', 2,
         'Follow-up — painting for your HOA properties in {{city}}',
         'Hi {{name}},

Following up on my note about painting services for HOA properties.

We recently completed a full common-area refresh for a 120-unit condo in Mississauga — new hallway paint, lobby feature wall, and exterior touch-ups — all done on schedule and within budget.

Happy to share photos and a sample quote if helpful.

Gerardo
Arcan Painting
(416) 727-2148'),
        ('Facilities Manager Intro', 'facilities_manager', 1,
         'Commercial painting maintenance for your facilities in {{city}}',
         'Hi {{name}},

I run Arcan Painting — we provide commercial painting services to facilities managers and building owners across the Greater Toronto Area.

We specialize in:
- Office and retail space repaints
- Exterior building maintenance
- Parking garage line marking and surface coatings
- After-hours and weekend scheduling to minimize disruption

Many of our commercial clients schedule us 3-4 times per year for ongoing maintenance. We''re fully insured and WSIB-compliant.

Would it make sense to connect for 10 minutes to discuss your upcoming painting needs?

Gerardo
Arcan Painting
(416) 727-2148
arcanpainting.ca'),
        ('Facilities Manager Follow-Up', 'facilities_manager', 2,
         'Quick follow-up — commercial painting for {{company}}',
         'Hi {{name}},

Just following up on my earlier note about commercial painting services for your facilities in {{city}}.

We work with several office buildings and retail plazas in the GTA on an ongoing maintenance basis. Happy to put together a no-obligation quote for any upcoming projects.

Gerardo
Arcan Painting
(416) 727-2148')
      `;
    }

    // ── Seed default email template + workflow for new_lead trigger ──────
    // Required so the Meta webhook's triggerWorkflow('new_lead', ...) call
    // has a template to send and a workflow to fire.
    const existingEmailTemplates = await sql`SELECT COUNT(*)::int as count FROM email_templates`;
    if (existingEmailTemplates[0].count === 0) {
      await sql`
        INSERT INTO email_templates (name, subject_template, body_template) VALUES
        ('new_lead_notification',
         'New lead: {{customer_name}} — {{service_type}}',
         '<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> {{customer_name}}</p>
<p><strong>Email:</strong> {{customer_email}}</p>
<p><strong>Phone:</strong> {{customer_phone}}</p>
<p><strong>Service:</strong> {{service_type}}</p>
<p><strong>Source:</strong> {{source}}</p>
<p><strong>Address:</strong> {{address}}</p>
<p><strong>Description:</strong> {{project_description}}</p>
<p><a href="{{app_url}}/admin/leads">View in admin</a></p>')
      `;
    }

    const existingEmailWorkflows = await sql`SELECT COUNT(*)::int as count FROM email_workflows`;
    if (existingEmailWorkflows[0].count === 0) {
      const newLeadTemplate = await sql`SELECT id FROM email_templates WHERE name = 'new_lead_notification' LIMIT 1`;
      if (newLeadTemplate[0]) {
        await sql`
          INSERT INTO email_workflows (name, trigger_event, template_id, delay_hours, conditions, is_active) VALUES
          ('new_lead_immediate', 'new_lead', ${newLeadTemplate[0].id}, 0, '{}'::jsonb, true)
        `;
      }
    }

    // ── linkedin_posts ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS linkedin_posts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        media_url TEXT,
        post_type VARCHAR(50) DEFAULT 'text',
        platform_post_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_for TIMESTAMP,
        posted_at TIMESTAMP,
        impressions INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── linkedin_outreach ───────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS linkedin_outreach (
        id SERIAL PRIMARY KEY,
        prospect_name VARCHAR(255),
        prospect_title VARCHAR(255),
        prospect_company VARCHAR(255),
        prospect_linkedin_url VARCHAR(500),
        target_role VARCHAR(100),
        connection_message TEXT,
        followup_message TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        sent_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── workflow_skills ────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS workflow_skills (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        trigger_type VARCHAR(100),
        trigger_config JSONB DEFAULT '{}',
        actions JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN DEFAULT false,
        run_count INTEGER DEFAULT 0,
        last_run_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── workflow_runs ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id SERIAL PRIMARY KEY,
        skill_id INTEGER REFERENCES workflow_skills(id),
        trigger_data JSONB,
        status VARCHAR(50) DEFAULT 'running',
        steps_completed INTEGER DEFAULT 0,
        steps_total INTEGER DEFAULT 0,
        result JSONB DEFAULT '{}',
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `;

    // ── Seed default workflow skills ────────────────────────────────────
    const existingSkills = await sql`SELECT COUNT(*)::int as count FROM workflow_skills`;
    if (existingSkills[0].count === 0) {
      await sql`
        INSERT INTO workflow_skills (name, description, category, trigger_type, trigger_config, actions, is_active) VALUES
        ('Weekly Social Post Generator',
         'Every Monday, AI generates 3 social posts for the week with painting tips and project showcases.',
         'marketing', 'schedule',
         '{"cron": "0 9 * * 1"}',
         '[{"type": "ai_generate", "prompt": "Generate 3 social media posts for a painting company"}, {"type": "save_drafts"}]',
         false),
        ('New Lead Welcome Email',
         'When a new lead is created, automatically send a personalized welcome email.',
         'leads', 'event',
         '{"event": "lead.created"}',
         '[{"type": "ai_generate", "prompt": "Write a welcome email for a new painting lead"}, {"type": "send_email"}]',
         false),
        ('Estimate Follow-Up Reminder',
         'If an estimate has been pending for 3 days, send a gentle follow-up email to the lead.',
         'leads', 'schedule',
         '{"cron": "0 10 * * *", "condition": "estimates.status = pending AND age > 3 days"}',
         '[{"type": "query", "sql": "SELECT pending estimates older than 3 days"}, {"type": "send_email_batch"}]',
         false),
        ('Monthly Performance Report',
         'On the 1st of each month, compile leads, conversions, and revenue into a summary report.',
         'analytics', 'schedule',
         '{"cron": "0 8 1 * *"}',
         '[{"type": "query", "sql": "Aggregate monthly metrics"}, {"type": "ai_generate", "prompt": "Summarize monthly performance"}, {"type": "send_email"}]',
         false),
        ('Review Request After Project',
         'After a project is marked complete, wait 2 days then send a review request to the client.',
         'leads', 'event',
         '{"event": "project.completed", "delay": "2d"}',
         '[{"type": "delay", "duration": "2d"}, {"type": "ai_generate", "prompt": "Write a review request email"}, {"type": "send_email"}]',
         false),
        ('Cold Email Drip Campaign',
         'Automatically advance cold email prospects through the sequence on a daily schedule.',
         'outreach', 'schedule',
         '{"cron": "0 8 * * 1-5"}',
         '[{"type": "query", "sql": "Get prospects due for next step"}, {"type": "send_email_batch"}]',
         false),
        ('Ad Spend Alert',
         'If daily ad spend exceeds budget threshold, send an alert notification.',
         'marketing', 'schedule',
         '{"cron": "0 18 * * *", "condition": "daily_spend > budget_limit"}',
         '[{"type": "query", "sql": "Check daily spend vs budget"}, {"type": "send_notification"}]',
         false),
        ('Stale Lead Cleanup',
         'Weekly scan for leads with no activity in 30+ days. Tag them as stale and notify the team.',
         'leads', 'schedule',
         '{"cron": "0 9 * * 5"}',
         '[{"type": "query", "sql": "Find leads inactive > 30 days"}, {"type": "update_status", "status": "stale"}, {"type": "send_notification"}]',
         false),
        ('SEO Blog Post Generator',
         'Twice a month, AI drafts a blog post targeting local painting keywords for SEO.',
         'marketing', 'schedule',
         '{"cron": "0 9 1,15 * *"}',
         '[{"type": "ai_generate", "prompt": "Write an SEO blog post about painting services in the GTA"}, {"type": "save_drafts"}]',
         false)
      `;
    }

    // ── content_research ───────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS content_research (
        id SERIAL PRIMARY KEY,
        research_type VARCHAR(100),
        title VARCHAR(500),
        summary TEXT,
        source_url TEXT,
        source_name VARCHAR(255),
        relevance_score INTEGER DEFAULT 5,
        content_ideas JSONB DEFAULT '[]',
        used_count INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── content_calendar ────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS content_calendar (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content_type VARCHAR(100),
        content TEXT,
        research_id INTEGER REFERENCES content_research(id),
        status VARCHAR(50) DEFAULT 'idea',
        scheduled_for TIMESTAMP,
        posted_at TIMESTAMP,
        platform_post_id VARCHAR(255),
        performance JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── citation_directories ──────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS citation_directories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        category VARCHAR(100),
        domain_authority INTEGER DEFAULT 0,
        is_free BOOLEAN DEFAULT true,
        submission_url VARCHAR(500),
        notes TEXT,
        priority VARCHAR(20) DEFAULT 'medium'
      )
    `;

    // ── citation_status ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS citation_status (
        id SERIAL PRIMARY KEY,
        directory_id INTEGER REFERENCES citation_directories(id),
        status VARCHAR(50) DEFAULT 'not_listed',
        listing_url VARCHAR(500),
        nap_correct BOOLEAN DEFAULT true,
        last_checked_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // ── Seed citation directories ──────────────────────────────────────────
    const existingDirs = await sql`SELECT COUNT(*)::int as count FROM citation_directories`;
    if (existingDirs[0].count === 0) {
      await sql`
        INSERT INTO citation_directories (name, url, category, domain_authority, is_free, submission_url, priority) VALUES
        ('Google Business Profile', 'https://business.google.com', 'general', 100, true, 'https://business.google.com/add', 'high'),
        ('Bing Places', 'https://www.bingplaces.com', 'general', 95, true, 'https://www.bingplaces.com', 'high'),
        ('Apple Maps', 'https://mapsconnect.apple.com', 'general', 90, true, 'https://mapsconnect.apple.com', 'high'),
        ('Facebook Business', 'https://facebook.com/business', 'general', 95, true, 'https://www.facebook.com/pages/create', 'high'),
        ('Yelp', 'https://www.yelp.ca', 'general', 92, true, 'https://biz.yelp.ca/signup', 'high'),
        ('HomeStars', 'https://homestars.com', 'home_services', 68, true, 'https://pro.homestars.com/signup', 'high'),
        ('Better Business Bureau', 'https://www.bbb.org', 'general', 85, false, 'https://www.bbb.org/canada/accreditation-application', 'high'),
        ('Yellow Pages Canada', 'https://www.yellowpages.ca', 'general', 75, true, 'https://www.yellowpages.ca/free-listing/', 'high'),
        ('Canada411', 'https://www.canada411.ca', 'canada', 72, true, 'https://www.canada411.ca/business/add-my-business/', 'high'),
        ('LinkedIn Company', 'https://linkedin.com/company', 'general', 98, true, 'https://www.linkedin.com/company/setup/new/', 'high'),
        ('Houzz', 'https://www.houzz.com', 'home_services', 80, true, 'https://www.houzz.com/pro/signup', 'medium'),
        ('Angi (Angies List)', 'https://www.angi.com', 'home_services', 72, true, 'https://pro.angi.com/signup', 'medium'),
        ('Thumbtack', 'https://www.thumbtack.com', 'home_services', 70, true, 'https://www.thumbtack.com/pro', 'medium'),
        ('Bark.com', 'https://www.bark.com', 'home_services', 65, true, 'https://www.bark.com/become-a-professional/', 'medium'),
        ('Kijiji', 'https://www.kijiji.ca', 'local', 82, true, 'https://www.kijiji.ca/p-post-ad.html', 'medium'),
        ('Oodle', 'https://www.oodle.com', 'general', 60, true, 'https://www.oodle.com/info/add_listing', 'medium'),
        ('Hotfrog Canada', 'https://www.hotfrog.ca', 'canada', 55, true, 'https://www.hotfrog.ca/AddBusiness.aspx', 'medium'),
        ('EZlocal', 'https://www.ezlocal.com', 'general', 52, true, 'https://www.ezlocal.com/add-business', 'medium'),
        ('Manta', 'https://www.manta.com', 'general', 68, true, 'https://www.manta.com/add-your-business', 'medium'),
        ('Foursquare', 'https://foursquare.com', 'general', 75, true, 'https://business.foursquare.com', 'medium'),
        ('FindLocal Canada', 'https://www.findlocal.ca', 'canada', 40, true, 'https://www.findlocal.ca/add-listing', 'low'),
        ('Canadian Business Directory', 'https://www.canadianbusinessdirectory.ca', 'canada', 35, true, 'https://www.canadianbusinessdirectory.ca/add-listing/', 'low'),
        ('Tupalo', 'https://tupalo.com', 'general', 48, true, 'https://tupalo.com/en/add-business', 'low'),
        ('Cylex Canada', 'https://www.cylex.ca', 'canada', 45, true, 'https://www.cylex.ca/add-business.html', 'low'),
        ('n49', 'https://www.n49.ca', 'canada', 42, true, 'https://www.n49.ca/add/', 'low'),
        ('iBegin', 'https://www.ibegin.com', 'canada', 38, true, 'https://www.ibegin.com/add/', 'low'),
        ('Brownbook', 'https://www.brownbook.net', 'general', 50, true, 'https://www.brownbook.net/add-business/', 'low'),
        ('Opendi Canada', 'https://ca.opendi.com', 'canada', 35, true, 'https://ca.opendi.com/add-business/', 'low'),
        ('Contractor Locator', 'https://contractorlocator.ca', 'contractor', 32, true, 'https://contractorlocator.ca/add-listing', 'medium'),
        ('Trusted Pros', 'https://www.trustedpros.ca', 'contractor', 45, true, 'https://www.trustedpros.ca/join', 'medium'),
        ('GoodContractors.ca', 'https://www.goodcontractors.ca', 'contractor', 30, true, 'https://www.goodcontractors.ca/register', 'medium')
      `;
    }

    // ── Onboarding columns on app_settings ──────────────────────────────────
    await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS google_prompted_at TIMESTAMP`;

    // Workflow indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_workflow_skills_category ON workflow_skills(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_workflow_skills_is_active ON workflow_skills(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_workflow_runs_skill_id ON workflow_runs(skill_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_workflow_runs_started_at ON workflow_runs(started_at DESC)`;

    // Marketing indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_marketing_connections_platform ON marketing_connections(platform)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON marketing_campaigns(platform)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON email_sequences(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_outreach_contacts_sequence_id ON outreach_contacts(sequence_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_outreach_contacts_status ON outreach_contacts(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id ON ai_conversations(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_creatives_platform ON ad_creatives(platform)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON ad_creatives(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ad_creatives_created_at ON ad_creatives(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ads_accounts_platform ON ads_accounts(platform)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ads_accounts_is_active ON ads_accounts(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_live_campaigns_platform ON live_campaigns(platform)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_live_campaigns_status ON live_campaigns(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_live_campaigns_creative_id ON live_campaigns(creative_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_live_campaigns_created_at ON live_campaigns(created_at DESC)`;

    // LinkedIn indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_linkedin_posts_status ON linkedin_posts(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_linkedin_posts_scheduled_for ON linkedin_posts(scheduled_for)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_linkedin_posts_created_at ON linkedin_posts(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_linkedin_outreach_status ON linkedin_outreach(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_linkedin_outreach_target_role ON linkedin_outreach(target_role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_linkedin_outreach_created_at ON linkedin_outreach(created_at DESC)`;

    // Content research indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_content_research_type ON content_research(research_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_research_relevance ON content_research(relevance_score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_research_expires_at ON content_research(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_research_created_at ON content_research(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_calendar_research_id ON content_calendar(research_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_for ON content_calendar(scheduled_for)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_content_calendar_created_at ON content_calendar(created_at DESC)`;

    // Cold email indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_status ON cold_email_prospects(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_role ON cold_email_prospects(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_email ON cold_email_prospects(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cold_email_prospects_created_at ON cold_email_prospects(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cold_email_sends_prospect_id ON cold_email_sends(prospect_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cold_email_sends_sent_at ON cold_email_sends(sent_at DESC)`;

    // ── Seed admin users ────────────────────────────────────────────────────
    const existingAdmins = await sql`SELECT COUNT(*) as count FROM auth_users WHERE username IN ('info@arcanpainting.ca', 'cameron@ashbi.ca')`;
    if (parseInt(existingAdmins[0].count) < 2) {
      const [hash1, hash2] = await Promise.all([
        argon2Hash('Arcan2026!'),
        argon2Hash('Ashbi2026!')
      ]);
      await sql`INSERT INTO auth_users (username, password, role, password_is_hashed) VALUES ('info@arcanpainting.ca', ${hash1}, 'owner', true) ON CONFLICT (username) DO NOTHING`;
      await sql`INSERT INTO auth_users (username, password, role, password_is_hashed) VALUES ('cameron@ashbi.ca', ${hash2}, 'admin', true) ON CONFLICT (username) DO NOTHING`;
    }

    // Citation indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_citation_directories_category ON citation_directories(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_citation_directories_priority ON citation_directories(priority)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_citation_directories_domain_authority ON citation_directories(domain_authority DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_citation_status_directory_id ON citation_status(directory_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_citation_status_status ON citation_status(status)`;

    console.log("[migrations] 001-initial-schema: complete");
  } catch (err) {
    // Reset flag so next request retries
    migrationRun = false;
    console.error("[migrations] 001-initial-schema: FAILED", err.message);
    throw err;
  }
}

// Cached promise — run once, share across concurrent startup callers
let _migrationPromise = null;

export function ensureSchema() {
  if (!_migrationPromise) {
    _migrationPromise = runMigrations().catch((err) => {
      _migrationPromise = null; // Allow retry on next call
      throw err;
    });
  }
  return _migrationPromise;
}
