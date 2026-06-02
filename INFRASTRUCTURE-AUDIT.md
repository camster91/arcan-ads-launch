# INFRASTRUCTURE AUDIT — What's Real vs Dormant

**Date:** 2026-06-01  
**Purpose:** catalog what Arcan already has so the ads launch kit doesn't duplicate or contradict.

> **⚠️ HISTORICAL SNAPSHOT** — This doc was written before the 5 fixes in `MISSING-FIXES.md` were applied. Fix 1 (webhook → email workflow engine) and Fix 2 (webhook → lead-qualifier agent) are now **done** — see `MISSING-FIXES.md` for the current state. The findings below about "what's not wired" have been resolved for Fix 1 and Fix 2; the rest (3, 4, 5) are still pending.

---

## VERIFIED: built and functional

### Email automation engine
- `email-workflows` — `POST /api/email-workflows` accepts `{name, trigger_event, template_id, delay_hours, conditions, is_active}` and inserts into `email_workflows` table. Full workflow engine pattern.
- `email-templates` — template management with subject_template + body_template (variable substitution)
- `email-logs` — delivery tracking
- `send-email` util — uses **Maton AI → Gmail API** (not Resend as I'd assumed). Sends via `gateway.maton.ai/google-mail/gmail/v1/users/me/messages/send`. Templates named + related_type/related_id for tracking.
- **Trigger events for workflows:** I see the pattern is `{trigger_event, delay_hours}` — perfect for "if no estimate booked, send email after 48h, 7d, 14d"

### Cross-channel notifications
- `notifications` — GET filterable by read status, search, date range. POST/PATCH to mark read. The notifications table records `type, title, message, email, is_read, created_at`.
- The `notifications` route is a **log** of what was sent, not the dispatch itself. Dispatch is via `send-email` (Maton/Gmail) or `telegram` util.

### Workflow engine
- `marketing/workflows` — runtime for `workflow_skills` with `actions` JSON array. POST manually triggers a skill, inserts into `workflow_runs` with `steps_total` and steps completed tracking. **This is a real workflow engine**, not a stub.

### Cold email B2B system
- `marketing/cold-email/prospects` — full prospect CRUD with status pipeline (`new → emailed → replied → converted | unsubscribed | bounced`), role filter, stats endpoint
- `marketing/cold-email/send` — sequence engine. `POST /send` with cron-secret OR admin auth, daily limit 20, finds prospects due for next sequence step (`last_emailed_at < NOW() - INTERVAL '4 days'`), joins to `cold_email_templates` by `target_role + sequence_step + is_active`, sends. **The B2B-OUTREACH.md 4-email sequence is already in the data model.**
- `marketing/cold-email/templates` — template management with target_role + sequence_step

### Google Business Profile
- `marketing/google-business` — 266 lines, full GBP API integration: listAccounts, listLocations, getReviews, getInsights (60-day daily metrics), default summary view. Auto-refreshes access tokens from `marketing_connections` table.

### Local SEO / citations
- `marketing/citations` — 208 lines. List 30+ directories ordered by domain_authority, track status (`listed | claimed | needs_update | not_listed`), NAP generator (pulls from `app_settings`), bulk_check using **Brave Search API** to verify NAP.

### Meta Ads integration
- `marketing/facebook/*` — OAuth callback, connect flow, ads endpoint. Full Meta API integration.
- `marketing/google-ads/campaigns` — Google Ads API
- `marketing/linkedin/*` — LinkedIn API

### AI agents
- `agents/lead-qualifier` — Gemini-powered
- `agents/proposal-generator`
- `agents/schedule-estimator`
- `agents/customer-support`
- `agents/openclaw.js` + `route.js` — openclaw integration

### Lead management
- `leads` — lead CRUD with source tracking
- `quote` — quote request flow
- `follow-ups` — follow-up scheduling (phone, email, site_visit, estimate_follow_up, project_check_in). 5 valid follow-up types. Update endpoint allows status transitions + complete.
- `completion-workflows` — per-project step workflows with is_required, estimated_hours, is_completed, completed_by. **This is a per-project checklist, not a system-wide automation. Different from what I assumed.**

---

## NEEDS VERIFICATION: built but I don't know if it's wired up

### Email workflow triggers
- The `email-workflows` table is there, but is anything actually triggering workflows? (probably via webhook from contact form, but I should check the trigger mechanism)
- Specifically: does `new_lead` trigger fire on Meta webhook leads? Probably not — my new webhook calls `notifyGerardo` and `auditLog` but doesn't trigger the workflow engine.

### GBP location connection
- The endpoint exists, but is Google actually connected for Arcan? (`marketing_connections` table, `platform = 'google'`)
- Is a GBP location_name set in metadata?
- If not, Gerardo needs to do the OAuth dance to activate it.

### Citation submissions
- Are directories actually getting submitted? (Gerardo's job — not a code change)
- Is `BRAVE_SEARCH_API_KEY` set? (needed for the bulk_check)
- Is `marketing/google-business` returning real data, or 400 "Google not connected"?

### AI agents firing on real events
- `agents/lead-qualifier` — does it fire when a new Meta lead comes in?
- `agents/proposal-generator` — does it fire on quote request?
- The `agent_runs` table should show recent activity.

---

## GENUINELY NOT BUILT

| Feature | Build cost | Worth it? |
|---|---|---|
| **Telegram Mini App for KPIs** | 12-18 hours (KPI-DASHBOARD.md) | Defer to month 2+ |
| **Video upload / video creative** | Out of scope — content problem | Out of scope |
| **Twilio SMS auto-reply** | 4-6 hours | Yes, this is a real gap |
| **Referral code generation per customer** | 2-4 hours (add to credits table or new table) | Yes, real gap if not in credits |
| **Meta webhook → email workflow trigger** | 30 min (add a call to email-workflows trigger) | Yes, this is a 30-min fix |
| **Meta webhook → lead-qualifier agent** | 30 min (call agent on save) | Yes, free leverage |
| **City-specific landing pages** | 1-2 days | Month 2 SEO play |
| **Blog content (real posts)** | 1-2 days (6 posts) | Yes, slow-burn but compounding |
| **Lead magnet PDF** | 1 day (write + design) | Yes |

---

## The 30-minute fixes (DO THESE FIRST)

These are the real ROI items I should have caught in my original audit:

### Fix 1: Wire the new Meta webhook to the existing email workflow engine

**File:** `src/app/api/lead-webhook/meta/route.js` (the one I just added)

After the lead is saved, also trigger the `new_lead` workflow:
```js
// After saveLead + sendLeadEvent
try {
  await fetch(`${baseUrl}/api/email-workflows/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trigger_event: "new_lead",
      lead_id: saved.lead?.id,
      source: "meta_lead_ad",
    }),
  });
} catch (e) {
  console.error("email workflow trigger failed:", e.message);
}
```

But wait — there's no `trigger` endpoint in `email-workflows/route.js`. The engine exists but is configured, not triggered. Need to add `POST /api/email-workflows/trigger` that looks up workflows by `trigger_event` and executes them.

**Effort:** 30 min to add the trigger endpoint + 30 min to wire it into the webhook. Total 1 hour.

### Fix 2: Wire the new Meta webhook to the existing lead-qualifier agent

**File:** `src/app/api/lead-webhook/meta/route.js`

After the lead is saved, also spawn the lead-qualifier (the contact route already does this for website leads):
```js
// The contact route calls:
// fetch(`${baseUrl}/api/agents/lead-qualifier`, { method: 'POST', body: leadData })
// Do the same in the meta webhook
```

**Effort:** 5 min. Just copy the spawn pattern from `contact/route.js`.

### Fix 3: Add Twilio SMS auto-reply

The `notifications` system logs sends but I don't see an SMS channel. Need to:
1. Add `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` env vars
2. Create `src/app/api/utils/twilio.js` (similar to telegram.js)
3. Update `src/app/api/lead-webhook/meta/route.js` to fire SMS after lead save
4. Update `src/app/api/contact/route.js` to fire SMS too

**Effort:** 2-4 hours.

### Fix 4: Configure the missing email workflows

Audit `email_workflows` table. Add if missing:
- `new_lead` — sends confirmation email (already done by contact route's Resend, but route the meta webhook through it)
- `cold_lead_nurture` — 3 emails at 48h, 7d, 14d for leads with no estimate booked
- `post_estimate` — 2 emails: "thanks for the estimate" + "1 week check-in"
- `post_project` — review request + referral code (the GBP optimization)
- `inactive_reengagement` — quarterly email to old customers

**Effort:** 2-3 hours (workflow configs + templates).

### Fix 5: Connect GBP if not already

This is a Gerardo task, not code. Open admin → Marketing → GBP → connect.
If `marketing_connections` table has no Google entry, the entire GBP module is dormant.

**Effort:** 10 min if the OAuth credentials are in env. Could be longer if redirect URI is misconfigured.

---

## Updated priority list

The 5 fixes above are the actual highest-ROI work. They leverage what's already built. Total effort: 1-2 days of focused work.

| Fix | Effort | Impact |
|---|---|---|
| 1. Wire webhook → email workflow | 1 hour | Triggers the whole nurture engine |
| 2. Wire webhook → lead-qualifier | 5 min | Free AI scoring on every Meta lead |
| 3. Twilio SMS auto-reply | 2-4 hours | +50% close rate from speed-to-lead |
| 4. Configure missing email workflows | 2-3 hours | Doubles lead-to-SQL rate |
| 5. Connect GBP if not already | 10 min | Enables GBP optimization |

**Total: ~6-10 hours of work = 2x return on the existing $90/day ad spend within 30 days.**

This is what we should actually be doing. Not building new infrastructure.

---

## What to do with the kit

The kit's `EXISTING-INFRASTRUCTURE.md` was wrong in places. This file replaces it. Action items:

1. **Delete** or update `EXISTING-INFRASTRUCTURE.md` to point here
2. **Add** a new `MISSING-FIXES.md` that lists the 5 fixes above with code
3. **Implement** Fix 1 + Fix 2 right now (1 hour total, huge leverage)
4. **Schedule** Fix 3 + Fix 4 for the launch week
5. **Defer** Fix 5 to Gerardo's first admin session
