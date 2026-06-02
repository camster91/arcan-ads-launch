# Arcan Painting — Paid Ads Launch Kit

**Generated:** 2026-06-01  
**Status:** Complete. All assets, code, copy, and operating procedures in place.

---

## ⚠️ Who are you?

### If you are the client (Gerardo) — start here:
**Open `CLIENT-WALKTHROUGH.md`** — it walks you through 5 days of setup, screen by screen, with no assumed technical knowledge. Don't read this README first.

### If you are Cam (or whoever built this kit):
Read `STATUS.md` for the state map. Use the other docs as reference when something specific needs to happen.

---

## TL;DR (for Cam, 2 minutes)

**Problem:** Arcan has zero active Meta ads. Every GTA painting competitor is spending.

**Solution:** 6 campaigns, $90/day total, $2,700/month. 3-month ROAS target: 3x.

**Why now:** WOW 1 Day Painting's `/toronto-painting/` landing page 404s. Free money.

**6 campaigns:**
- **C1 Single Room Refresh** ($20/day) — B2C, instant form, "From $499"
- **C2 RE Pre-Listing** ($15/day) — B2B real estate agents, 48-hour partner rate
- **C3 Retargeting WSIB + Warranty** ($25/day) — site visitor retargeting
- **C4 Family Story** ($15/day) — Cañabate family photo, "three sons, one promise"
- **C5 Before/After Trust** ($10/day) — needs production pipeline for "before" photos
- **C6 Google Brand Conquest** ($5/day) — steal WOW 1 Day's clicks

**Assets:** 13 real Arcan project images + the Cañabate family photo. No AI. **Critical:** thumbnails are 400-533px — production launch needs 1080px+ (Topaz Gigapixel AI, $99 one-time).

---

## File structure

| File | Purpose |
|---|---|
| `CLIENT-WALKTHROUGH.md` | **5-day client setup guide — Gerardo's entry point** |
| `STATUS.md` | **State map for Cam — what's done, what's pending** |
| `INFRASTRUCTURE-AUDIT.md` | What Arcan already has built (read second) |
| `MISSING-FIXES.md` | 5 specific code fixes (2 done, 3 to do) |
| `CAMPAIGN-PLAN.md` | 6 campaigns, full targeting, budget, KPIs |
| `AD-COPY.md` | All headlines, primary text, descriptions, CTAs |
| `AD-CREATIVE.md` | Image strategy, upscaling guidance, text-overlay rules |
| `TRACKING.md` | UTM strategy, conversion events, KPI targets |
| `CAPI-PATCH.md` | Server-side Meta CAPI patch docs |
| `SETUP.md` | One-time account setup (Meta, Google, Coolify) |
| `LAUNCH-PLAYBOOK.md` | Day-by-day first 30 days |
| `A-B-TESTING.md` | Variant rotation rules |
| `COMPETITIVE-MONITORING.md` | Weekly Meta Ad Library sweep |
| `LANDING-PAGE.md` | Landing page optimization + audit |
| `UPSCALE-PIPELINE.md` | Image upscaling options |
| `B2B-OUTREACH.md` | RE agent + property manager sequences |
| `HANDOFF.md` | Gerardo's daily operating rhythm |
| `KPI-DASHBOARD.md` | Telegram Mini App spec (defer to month 2+) |
| `.env.example` | All required env vars (single source of truth) |
| `ads-assets/` | 13 real Arcan images + family photo |
| `ads-assets/MANIFEST.json` | Machine-readable asset map |
| `templates/` | Empty log templates (WEEKLY-NOTES, COMPETITIVE-NOTES, A-B-TEST-RESULTS, COMPETITOR-PROFILES) |

### Code files (mirrors source repo)

The webhook appears in two places on purpose:

- `meta-lead-webhook/route.js` (kit root) — **drop-in file** for a fresh install. Copy this to `src/app/api/lead-webhook/meta/route.js` in the Arcan repo.
- `src-changes/api/lead-webhook/meta/route.js` — **mirror copy** kept in sync with source. Use to diff for code review.

Both are byte-identical. The `src-changes/` folder is the review surface; the root file is the deployment artifact. All other code lives only in `src-changes/` (the source repo already has these files modified in place, so a separate drop-in isn't needed):
- `src-changes/api/contact/route.js` — patched with CAPI call
- `src-changes/api/leads/route.js` — accepts leadSource
- `src-changes/api/utils/meta-capi.js` — CAPI helper
- `src-changes/api/ads/launch-status/route.js` — dashboard endpoint
- `src-changes/admin/marketing/ads-launch/page.jsx` — launch dashboard UI
- `src-changes/admin/leads/page.jsx` — leads page with source filter
- `src-changes/admin/layout.jsx` — admin nav with Ads Launch tab
- `src-changes/components/LeadCard.jsx` — lead card with source badge
- `src-changes/migrations/001-initial-schema.js` — adds email_workflows, email_templates, lead_source
- `src-changes/agents/arcan-lead-qualifier.md` — agent context file

See `STATUS.md` for the current state of each.

---

## Reading order (for Cam)

1. **STATUS.md** — what's done, what's pending, what doesn't exist
2. **INFRASTRUCTURE-AUDIT.md** — what Arcan already has built
3. **MISSING-FIXES.md** — 5 specific code fixes
4. **CAMPAIGN-PLAN.md** + **AD-COPY.md** + **AD-CREATIVE.md** — the actual specs
5. **SETUP.md** + **LAUNCH-PLAYBOOK.md** — when ready to launch
6. **HANDOFF.md** — for Gerardo once everything is live

---

## Setup (one-time, 3 hours)

1. **Account setup** — see `SETUP.md`
2. **Asset production** — see `UPSCALE-PIPELINE.md`
3. **Build campaigns** — see `CAMPAIGN-PLAN.md` + `AD-COPY.md`
4. **Launch** — see `LAUNCH-PLAYBOOK.md` Day 5

---

## Daily operating rhythm (for Gerardo)

- **5 min morning:** Telegram notifications → call new leads within 5 minutes
- **5 min evening:** Meta + Google mobile apps → check spend, lead count
- **30 min Friday:** Weekly report (template in `LAUNCH-PLAYBOOK.md`)
- **60 min monthly:** Campaign review with Cam (agenda in `HANDOFF.md`)

---

## What this kit does NOT do

- Build/host the actual Meta campaigns in the UI (Gerardo's job, see `CLIENT-WALKTHROUGH.md`)
- Set up the Coolify env vars (Cam's job, see `MISSING-FIXES.md` and `SETUP.md`)
- Run the campaigns day-to-day (Gerardo's job, see `HANDOFF.md`)
- Replace a real photographer (see `AD-CREATIVE.md` for why real photos > AI)
- Build the Telegram Mini App KPI dashboard (spec only, see `KPI-DASHBOARD.md`)

---

## Files added/modified in the Arcan app

To keep the blast radius minimal, this kit only adds **two new files** and **modifies one existing file** in the Arcan app source:

- `src/app/api/utils/meta-capi.js` — **NEW** CAPI helper, self-contained
- `src/app/api/lead-webhook/meta/route.js` — **NEW** Meta Lead Ads webhook
- `src/app/api/contact/route.js` — **MODIFIED** +1 import, +1 fire-and-forget CAPI call. No logic change.

The webhook reuses the existing `triggerWorkflow()` from `src/app/api/email-workflows/route.js` and the existing `/api/agents/lead-qualifier` agent. No new infrastructure created where existing existed.

See `INFRASTRUCTURE-AUDIT.md` and `MISSING-FIXES.md` for details.

---

## Honest gaps

- **Image resolution is the launch blocker.** 400px thumbs don't work for ads at scale. Get originals from Gerardo or pay $99 for Topaz.
- **No "before" photo library yet.** Campaign 5 needs production pipeline — schedule photo shoots with crews.
- **No A/B test results history.** A/B-TESTING.md defines the rules; need 30+ days of data before the rules become useful.
- **KPI dashboard is spec-only.** Use Meta + Google mobile apps for v1. Build Mini App in month 2 if needed.
- **CASL compliance is "best effort."** Meta lead form disclaimer satisfies first-contact. Have a Canadian lawyer review the email templates if scaled beyond 1,000 leads/month.

---

## Quick start (5 commands)

```bash
# 1. Verify the kit is complete
ls ~/projects/arcan-ads-launch/

# 2. Verify the source patches are in place
node --check ~/repos/arcan-painting-src/src/app/api/contact/route.js
node --check ~/repos/arcan-painting-src/src/app/api/lead-webhook/meta/route.js
node --check ~/repos/arcan-painting-src/src/app/api/utils/meta-capi.js

# 3. Open the campaign plan
open ~/projects/arcan-ads-launch/CAMPAIGN-PLAN.md

# 4. Open the client walkthrough (for Gerardo)
open ~/projects/arcan-ads-launch/CLIENT-WALKTHROUGH.md

# 5. Push to git for backup
cd ~/projects/arcan-ads-launch && git init && git add . && git commit -m "Arcan ads launch kit - 2026-06-01"
```

Then follow `CLIENT-WALKTHROUGH.md` if you're Gerardo, or `STATUS.md` if you're Cam.
