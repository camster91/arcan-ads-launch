# Launch Playbook — First 30 Days

**TL;DR:** 5 days to launch, 14 days to first signal, 30 days to know what's working.

---

## Day 0 (Today) — Kit assembly

- [ ] Pull this kit from `~/projects/arcan-ads-launch/`
- [ ] Verify all `.js` files pass `node --check` (already done — see QA report below)
- [ ] Open CAMPAIGN-PLAN.md — print or pin to monitor
- [ ] Open A/B-TESTING.md — understand the rotation rules before you launch
- [ ] Open LAUNCH-PLAYBOOK.md (this file) — bookmark

## Day 1 — Account setup (start this morning)

- [ ] Start Meta Business verification (45 min, see SETUP.md Part 1)
- [ ] Start Google Ads signup (30 min, see SETUP.md Part 2)
- [ ] Apply for Google Local Services Ads (background check, takes 2-4 weeks)
- [ ] Claim Google Business Profile if not already
- [ ] Ask Gerardo for full-res original photos of the gallery jobs (critical for ad-quality)

## Day 2 — Asset production

- [ ] Upscale all 13 images from this kit to 1080px+ (see UPSCALE-PIPELINE.md)
- [ ] Add text overlay in Canva (badge + CTA button) for each ad variant
- [ ] Export at correct aspect ratios:
  - 1:1 (1080x1080) — feed
  - 9:16 (1080x1920) — Stories / Reels
  - 1.91:1 (1200x628) — Google Display
- [ ] Name files per AD-CREATIVE.md naming convention

## Day 3 — Webhook + CAPI deployment

- [ ] Confirm `src/app/api/lead-webhook/meta/route.js` is in place
- [ ] Confirm `src/app/api/utils/meta-capi.js` is in place
- [ ] Confirm `src/app/api/contact/route.js` is patched (one import + one call)
- [ ] Set Coolify env vars per SETUP.md Part 6
- [ ] Restart Arcan's app container
- [ ] Verify webhook via Meta's webhook verification challenge
- [ ] Verify CAPI via Test Events (submit a form with `META_CAPI_TEST=true`)

## Day 4 — Build campaigns in Meta Ads Manager

- [ ] Create Campaign 1 (Single Room Refresh) per CAMPAIGN-PLAN.md
  - 2 ad sets (25-44, 45-65)
  - 3 ad units (1A trust hero, 1B room result, 1C carousel)
  - Lead form with project type dropdown
  - Daily budget: $20
- [ ] Create Campaign 2 (RE Pre-Listing)
  - 1 ad set (B2B real estate job titles)
  - 2 ad units (2A carousel, 2B text-only testimonial)
  - Lead form with brokerage field
  - Daily budget: $15
- [ ] Create Campaign 3 (Retargeting WSIB + Warranty)
  - 1 ad set (custom audience: 30-day site visitors)
  - 2 ad units (3A video, 3B single image)
  - Daily budget: $25
- [ ] **Skip Campaign 4 and 5 for week 1** — too many campaigns, can't optimize
- [ ] **Optional: build Campaign 1B (Exterior Refresh)** if you have exterior photos. June is peak season — see CAMPAIGN-PLAN.md C1B spec. Skip if no photos yet.
- [ ] Pause all campaigns — do NOT publish yet
- [ ] Test submit one lead form on each campaign to verify the full flow

## Day 5 — Build Google campaign + Set CAPI to production + LAUNCH

- [ ] **CRITICAL: Set META_CAPI_TEST=false in Coolify env** — if this stays true, all CAPI server-side events go to Meta's Test Events tool instead of Live Events. Attribution will be broken. Verify in your Meta Events Manager → Live Events that you see `Lead` events after publishing.
- [ ] Create Google Campaign 6 (WOW 1 Day Brand Conquest)
  - 5 exact-match keywords (see CAMPAIGN-PLAN.md)
  - 15 headlines, 4 descriptions (RSA)
  - Sitelinks: Interior / Exterior / Commercial / Free Quote / About / Reviews
  - Callout extensions: WSIB-Covered, 2-Year Warranty, 5.0★ Google, 25+ Years, Free Estimate
  - Final URL: `https://arcanpainting.ca/quote`
  - Daily budget: $5
- [ ] Convert Google Ads conversion tracking
- [ ] **GO LIVE at 7am Monday morning** — unpause Meta Campaigns 1-3 and Google Campaign 6
- [ ] Send launch message in Telegram group chat (you'll see leads start flowing within hours)

## Day 6-7 (first 48 hours of live ads)

**Twice-daily check (5 min each):**
- Morning: open Meta Ads Manager → check spend pacing, CPL, any rejected ads
- Evening: open Arcan admin → check new leads arrived in `leads` table with `source = meta_lead_ad`
- Confirm Telegram notifications fire for every new lead

**Things that will go wrong in first 48 hours:**
- Ad rejected by Meta (most common: "before/after" language, "guaranteed" claims) — fix and resubmit
- Pixel not firing (check Meta Pixel Helper, check CAPI logs)
- Lead form not saving (check Coolify logs for webhook errors)
- CPL way too high (>$80) — pause ad set, double-check targeting
- No leads at all (most common cause: pixel not firing → retargeting audience is 0 → Campaign 3 silently does nothing)

## Day 8-14 (first week of data)

**Daily check (5 min):**
- Lead count vs. target
- CPL by campaign
- Any ad set > $80 CPL with 0 conversions → pause, redesign

**Friday week 1 review (30 min):**
- Compare CPL by ad unit — kill bottom 1/3, double top 1/3
- Document what worked / what didn't in a new file `WEEKLY-NOTES.md`
- Don't make any other changes for 7 days — Meta's algorithm needs 7 days to learn

## Day 15-21 (week 2)

- Build Campaign 4 (Family Story) and Campaign 5 (Before/After Trust)
- Add them at $5/day each to start
- Add 2nd ad set to Campaign 1 if 25-44 vs 45-65 data is divergent
- If Before/After campaign has < 3 before/after pairs, pause and schedule a photo shoot with Gerardo

**Friday week 2 review (30 min):**
- Identify your "control" ad — the one with the lowest CPL + most conversions
- Any ad > 2x the control's CPL → pause
- Scale winners: increase daily budget by 25% on the best ad set in each campaign

## Day 22-30 (weeks 3-4)

- A/B test creative variations: try a new image, new headline, new CTA
- Test ad scheduling: 8am-9pm only vs. 24-hour (most painting searches are 6-10pm)
- Review lead quality from Arcan admin: SQL rate, close rate, average job value
- Drop the worst-performing campaign entirely if it's < 50% of average CPL

**Friday week 4 review (60 min):**
- Full month report. See `TRACKING.md` for KPIs
- Calculate: spend, total leads, total SQLs, total closed jobs, total revenue, ROAS
- Decision: scale, kill, or pivot each campaign
- Set next month's budget based on data

## Day 30-60 (month 2)

- Scale winners 50-100% (don't get greedy — Meta's algorithm has a sweet spot)
- Add a Lookalike audience based on converted leads (seed from Arcan admin `leads` table where `status = 'converted'`)
- Build out before/after library — schedule 2 photo shoots per week with crews
- Start a referral program: "Refer a friend, get $50 off your next paint job"

## Day 60-90 (month 3)

- Launch Google Local Services Ads if approved
- Expand Google Brand Conquest to "fast painters toronto", "same day painting toronto"
- Test a new ad angle: "Why Arcan costs less than franchised painters" (price-comparison ad)
- Add 1 retargeting layer: people who visited the site 30+ days ago but didn't submit (re-engagement)

## What success looks like at day 30

- 100+ leads across all campaigns
- $50-70 blended CPL
- 30-50 SQLs (lead qualified + estimate booked)
- 8-15 closed jobs
- $50K-100K in revenue
- 8-15x ROAS (month 1)
- Clear winner campaign + clear loser campaign + clear creative direction for month 2

## What failure looks like at day 30

- < 30 leads → pixel not firing, or targeting too narrow, or creative weak
- CPL > $100 → bidding too high, or creative not resonating, or landing page broken
- 0 leads from Retargeting → audience is 0 size (pixel not firing)
- All leads from one campaign → other campaigns have bad creative or targeting

If failure: don't panic. Pause everything, fix the root cause, restart on Monday. Most failed launches are one specific problem, not a kit-wide failure.

## Reporting template

Every Friday, fill this in:

```
Week of: ________

Meta Campaigns:
  C1 Single Room: $___ spent, ___ leads, $___ CPL, ___ SQLs
  C1B Exterior: $___ spent, ___ leads, $___ CPL, ___ SQLs
  C2 RE Pre-Listing: $___ spent, ___ leads, $___ CPL, ___ SQLs
  C3 Retargeting: $___ spent, ___ leads, $___ CPL, ___ SQLs
  C4 Family Story: $___ spent, ___ leads, $___ CPL, ___ SQLs
  C5 Before/After: $___ spent, ___ leads, $___ CPL, ___ SQLs

Google:
  C6 WOW Conquest: $___ spent, ___ leads, $___ CPL, ___ SQLs

Totals:
  Spend: $___
  Leads: ___
  Avg CPL: $___
  SQLs: ___
  Closed jobs: ___
  Revenue: $___
  ROAS: ___x

Wins this week:
  -

Kills this week:
  -

Test next week:
  -
```
