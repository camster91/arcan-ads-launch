# MISSING FIXES — What to Wire Up Before Launch

**Date:** 2026-06-01  
**See also:** `INFRASTRUCTURE-AUDIT.md` for the full audit

This doc covers the 5 fixes that turn dormant Arcan infrastructure into live leverage for the new Meta ads. Total: 6-10 hours of work for 2-3x return on the existing $90/day ad spend.

---

## Fix 1 — Wire Meta webhook → existing email workflow engine ✅ DONE

**Status:** **Implemented and merged into the source repo.**

The Meta lead webhook now calls `triggerWorkflow("new_lead", {...})` from `src/app/api/email-workflows/route.js`. This routes Meta leads through the same Resend/Gmail email pipeline that the website contact form uses.

**What this enables:**
- New Meta leads automatically trigger the `new_lead_notification` email template (sends to `info@arcanpainting.ca` with lead details)
- Future workflow configs (e.g., `cold_lead_nurture` at 48h, 7d, 14d) will work for Meta leads too, not just website leads
- Delayed workflows are currently logged but not scheduled (see `email-workflows/route.js:228` "you would typically schedule them using a job queue"). Adding a scheduler is out of scope for v1.

**Files changed:**
- `src/app/api/lead-webhook/meta/route.js` — +1 import, +2 fire-and-forget calls
- `src-changes/api/lead-webhook/meta/route.js` — same (deliverable copy)
- `meta-lead-webhook/route.js` — same (deliverable copy)

---

## Fix 2 — Wire Meta webhook → existing lead-qualifier AI agent ✅ DONE

**Status:** **Implemented and merged.**

The Meta lead webhook now POSTs to `/api/agents/lead-qualifier` with the lead data, matching the pattern from `src/app/api/contact/route.js:108-118`. The agent is Gemini-powered and returns a quality score + recommendations.

**What this enables:**
- Every Meta lead gets AI-scored within seconds of submission
- The score lands in `agent_runs` table for admin review
- Future improvements (e.g., routing high-score leads to a priority Telegram channel) plug in here

**Files changed:**
- Same as Fix 1.

---

## Fix 3 — Add Twilio SMS auto-reply (NOT YET BUILT)

**Status:** Code path doesn't exist. The existing `notifications` system logs email/Telegram sends but has no SMS channel.

**Build:**

### 3.1 Create the Twilio helper
**File:** `src/app/api/utils/twilio.js` (new — does not exist yet, this section tells you how to build it)

```js
import twilio from "twilio";

let client = null;

function getClient() {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  client = twilio(sid, token);
  return client;
}

/**
 * Send SMS. Fire-and-forget pattern: caller should NOT await.
 * @param {string} to - E.164 format phone number
 * @param {string} body - SMS body (160 char max for single SMS)
 * @returns {Promise<{ok: boolean, sid?: string, error?: string}>}
 */
export function sendSms(to, body) {
  if (!to || !body) return Promise.resolve({ ok: false, error: "missing fields" });
  const c = getClient();
  if (!c) return Promise.resolve({ ok: false, error: "twilio not configured" });
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) return Promise.resolve({ ok: false, error: "TWILIO_FROM_NUMBER not set" });
  return c.messages.create({ to, from, body })
    .then((msg) => ({ ok: true, sid: msg.sid }))
    .catch((err) => ({ ok: false, error: err.message }));
}
```

### 3.2 Wire it into the Meta webhook

**File:** `src/app/api/lead-webhook/meta/route.js`

After the lead is saved, add:
```js
if (lead.phone) {
  const baseUrl = request.url.split("/api/")[0];
  sendSms(
    lead.phone,
    `Hi ${lead.name.split(" ")[0]}, this is Arcan Painting. Got your request for ${lead.serviceType} — we'll call within 5 min to confirm your free estimate. Questions? (416) 727-2148`
  );
}
```

### 3.3 Wire it into the contact route

**File:** `src/app/api/contact/route.js`

Add the same `sendSms` call after the lead is saved.

### 3.4 Env vars to set in Coolify
```
TWILIO_ACCOUNT_SID=AC... from twilio.com/console
TWILIO_AUTH_TOKEN=*** from twilio.com/console
TWILIO_FROM_NUMBER=+1647... (Arcan's Twilio number, E.164 format)
```

### 3.5 Install the Twilio package
```bash
cd ~/repos/arcan-painting-src && bun add twilio
```

**Effort:** 2-4 hours.

---

## Fix 4 — Configure missing email workflows (NOT YET DONE)

**Status:** The `email-workflows` engine accepts new workflows via POST but I don't know which ones are currently configured. Audit + add what's missing.

### 4.1 Audit current workflows

```sql
SELECT name, trigger_event, delay_hours, is_active
FROM email_workflows
ORDER BY trigger_event, delay_hours;
```

Expected: at least a `new_lead` workflow (probably configured already since the contact route uses it).

### 4.2 Add missing workflows

If these don't exist, add them via `POST /api/email-workflows`:

| Name | trigger_event | delay_hours | template_id | Conditions | Purpose |
|---|---|---|---|---|---|
| `new_lead_immediate` | `new_lead` | 0 | (existing new_lead_notification) | `{source: "meta_lead_ad"}` | Meta-specific new lead alert (or use the existing one) |
| `cold_lead_nurture_48h` | `no_estimate_48h` | 48 | (new template) | `{status: "new", estimate_booked: false}` | "Still thinking about your paint project? Here are 3 ideas..." |
| `cold_lead_nurture_7d` | `no_estimate_7d` | 168 | (new template) | `{status: "new", estimate_booked: false}` | "Recent project photos" |
| `cold_lead_nurture_14d` | `no_estimate_14d` | 336 | (new template) | `{status: "new", estimate_booked: false}` | "Limited availability this month" |
| `post_estimate_thanks` | `estimate_sent` | 0 | (new template) | `{status: "estimate_sent"}` | "Thanks for the estimate, here's what to expect" |
| `post_project_review` | `project_completed` | 0 | (new template) | `{status: "completed"}` | "Rate us on Google + your referral code" |
| `inactive_reengagement` | `customer_inactive_90d` | 0 | (new template) | `{last_project: "older_than_90d"}` | "We miss you — 10% off your next project" |

**Effort:** 2-3 hours (workflow configs + template writing).

### 4.3 The scheduling problem

The current `triggerWorkflow` for `delay_hours > 0` only logs the workflow — it doesn't actually schedule it. There are two options:

1. **Quick fix:** use the `internal-tasks` system that's already built. Schedule a task that triggers the workflow.
2. **Proper fix:** add a real job queue (BullMQ, Inngest, or a simple cron).

For v1, **option 1** is fine. The task scheduler can poll the email_logs table and trigger the workflow when the delay has elapsed.

---

## Fix 5 — Connect GBP if not already (Gerardo's task, 10 min)

**Status:** I don't know if Google is connected for Arcan. Verify:

```sql
SELECT platform, is_active, metadata
FROM marketing_connections
WHERE platform = 'google';
```

If empty: Gerardo needs to go to admin → Marketing → Google → connect. This is a one-time OAuth flow.

If connected but `metadata.gbp_location_name` is null: the GBP location needs to be selected from the list returned by `?action=listLocations`.

**Effort:** 10 min if credentials are configured. Could be longer if the Google Cloud OAuth client needs setup.

---

## Summary: what to do this week

| Priority | Fix | Effort | When |
|---|---|---|---|
| 1 | Wire webhook → email workflow | ✅ Done | This session |
| 2 | Wire webhook → lead-qualifier | ✅ Done | This session |
| 3 | Twilio SMS auto-reply | 2-4 hours | Before launch day 1 |
| 4 | Configure email workflows | 2-3 hours | Before launch day 1 |
| 5 | Connect GBP | 10 min | Before launch day 1 (Gerardo) |

**Total remaining work:** 4-7 hours.

After this, the $90/day ad spend has:
- Lead scoring (AI)
- Email workflow engine (existing)
- Lead-qualifier agent (existing)
- CAPI attribution (added)
- Meta webhook (added)
- SMS auto-reply (TBD)

That's a real lead machine, not a marketing plan.
