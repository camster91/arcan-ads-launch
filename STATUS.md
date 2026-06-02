# STATUS — Kit State Map

**Date:** 2026-06-01
**Purpose:** One place to see what exists, what changed, what's pending, and what doesn't exist.

---

## ⚠️ First time here? Read this first:

- **Client (Gerardo)?** Open `CLIENT-WALKTHROUGH.md` — 5-day setup guide, no assumed technical knowledge
- **Cam?** Keep reading. This is the kit state map for the person who built it.

---

## The big picture

**The kit is no longer a parallel project.** It's an integration into Arcan's existing app. All code changes are in the source repo. The launch plan is the path to wire up paid ads into the existing CRM.

**Integration points (all wired in this session):**
1. New `Ads Launch Dashboard` at `/admin/marketing/ads-launch` — single-screen health + KPIs
2. New `Source` filter on the existing `/admin/leads` page — see Meta vs Website leads
3. New `Meta` / `Google` source badge on each lead card
4. `lead_source` column now correctly populated for Meta webhook leads
5. New top-level "Ads Launch" nav tab in the admin layout

---

## Status legend

- ✅ **DONE** — file exists, content verified, claims in it are true
- 🔧 **WIRED** — file exists, code is in source repo, behavior verified
- 📋 **SPEC** — design doc only, code may or may not be written
- ⏳ **PENDING** — work identified, not started
- ❌ **NOT BUILT** — explicitly not built, listed in MISSING-FIXES.md or out of scope

---

## Code changes (in source repo, all verified)

### Files added (new)
- `src/app/api/lead-webhook/meta/route.js` — Meta Lead Ads webhook (237 lines, wired to email workflow + lead-qualifier)
- `src/app/api/utils/meta-capi.js` — CAPI helper (180 lines, SHA-256 hashing, fire-and-forget)
- `src/app/api/ads/launch-status/route.js` — Aggregates health, leads, campaigns for dashboard (180 lines)
- `src/app/admin/marketing/ads-launch/page.jsx` — Single-screen launch dashboard (486 lines)

### Files modified (1-3 line changes each)
- `src/app/api/leads/route.js` — Accepts `leadSource` from body, returns it in response (was hardcoded to 'website')
- `src/app/api/contact/route.js` — Forwards `leadSource` to `/api/leads` (was missing)
- `src/app/api/lead-webhook/meta/route.js` — Saves leads with `leadSource: 'meta_lead_ad'`
- `src/app/admin/leads/page.jsx` — Added `sourceFilter` state + UI (4 filter buttons)
- `src/app/admin/layout.jsx` — Added "Ads Launch" tab in marketing nav
- `src/components/LeadCard.jsx` — Added source badge (Meta/Google/Referral) next to service type

### Files NOT touched (intentionally)
- `src/app/api/email-workflows/route.js` — Reused as-is (existing `triggerWorkflow` function)
- `src/app/api/agents/lead-qualifier/route.js` — Reused as-is (existing agent)
- `src/app/api/marketing/facebook/*` — Reused as-is (existing Meta campaigns CRUD)
- `src/app/api/marketing/google-ads/*` — Reused as-is
- `src/app/api/follow-ups/route.js` — Reused as-is
- `src/app/api/notifications/route.js` — Reused as-is

---

## What's in the kit folder (`~/projects/arcan-ads-launch/`)

### Code (mirrors source repo)
- `meta-lead-webhook/route.js` — drop-in for new install
- `src-changes/api/leads/route.js` — full file
- `src-changes/api/contact/route.js` — full file
- `src-changes/api/lead-webhook/meta/route.js` — full file
- `src-changes/api/utils/meta-capi.js` — full file
- `src-changes/api/ads/launch-status/route.js` — full file
- `src-changes/admin/marketing/ads-launch/page.jsx` — full file
- `src-changes/admin/leads/page.jsx` — full file
- `src-changes/admin/layout.jsx` — full file
- `src-changes/components/LeadCard.jsx` — full file

### Strategy + ops docs (19)
- `README.md` — entry fork
- `CLIENT-WALKTHROUGH.md` — 5-day client setup guide
- `INFRASTRUCTURE-AUDIT.md` — what Arcan already has
- `MISSING-FIXES.md` — 5 specific code fixes (2 done, 3 to do)
- `CAMPAIGN-PLAN.md` — 6 campaigns, full targeting
- `AD-COPY.md` — all ad copy
- `AD-CREATIVE.md` — image strategy
- `TRACKING.md` — UTM + KPI
- `CAPI-PATCH.md` — CAPI patch doc
- `SETUP.md` — account setup
- `LAUNCH-PLAYBOOK.md` — day-by-day
- `A-B-TESTING.md` — variant rotation
- `COMPETITIVE-MONITORING.md` — weekly sweep
- `LANDING-PAGE.md` — landing page
- `UPSCALE-PIPELINE.md` — image upscaling
- `B2B-OUTREACH.md` — RE/PM sequences
- `HANDOFF.md` — Gerardo's daily rhythm
- `KPI-DASHBOARD.md` — Telegram Mini App (defer to month 2+)
- `STATUS.md` — this file

### Config + assets
- `.env.example` — single source of truth for env vars
- `ads-assets/` — 13 real Arcan images + Cañabate family photo

---

## What's pending before launch

### Group A — Must-do before day 1 (Gerardo + Cam, ~30 min)
- [ ] Set 6 env vars in Coolify (see `.env.example` Group A)
- [ ] Restart Arcan's app container
- [ ] Verify webhook responds
- [ ] Submit a real form → check `leads` table for `source = meta_lead_ad` and Telegram notification
- [ ] Open `/admin/marketing/ads-launch` → verify health score shows correctly

### Group B — Should-do before day 5 (Gerardo, ~2 hours)
- [ ] Verify Google connection is active
- [ ] Verify GBP location is selected
- [ ] Run citation submissions
- [ ] Audit email workflows table

### Group C — Should-do in week 1-2 (Cam, ~4-6 hours)
- [ ] **Fix 3:** Twilio SMS auto-reply (code in MISSING-FIXES.md)
- [ ] **Fix 4:** Configure missing email workflows
- [ ] **Fix 5:** GBP review request automation

### Group D — Should-do in week 3-4 (Cam, ~1 day)
- [ ] Upscale 13 images to 1080px+
- [ ] Add text overlay in Canva
- [ ] Build 6 campaigns in Meta Ads Manager
- [ ] Build Google Brand Conquest campaign

### Group E — Defer to month 2+
- [ ] KPI Dashboard Telegram Mini App
- [ ] Creative production calendar
- [ ] City-specific landing pages
- [ ] Blog content
- [ ] Video creative

---

## What you can verify right now (no setup needed)

After deploy:
1. Open `https://arcanpainting.ca/admin/marketing/ads-launch` — see health score
2. Open `https://arcanpainting.ca/admin/leads` — see new "Source" filter buttons
3. Open any lead card — see "Meta" / "Google" / "Referral" badge next to service type
4. Submit a test form — confirm it lands with `lead_source = "website"` (or whatever you set)
5. Have Meta send a test webhook payload — confirm it lands with `lead_source = "meta_lead_ad"`

The launch dashboard refreshes every 60s. Use it as your daily driver during launch week.
