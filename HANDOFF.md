# HANDOFF — Gerardo Runs the Ads

**Goal:** Gerardo can manage this entire ad operation without Cam, after 2 weeks of overlap training.

---

## What Gerardo needs to know

### The TL;DR
- We launched 6 ad campaigns (5 Meta + 1 Google) at $90/day total
- 13 real Arcan project images are the creative foundation
- The Meta Lead webhook automatically saves leads to your CRM and notifies you via Telegram
- 1x weekly check-in with Cam for the first month, then monthly (every Friday, see `LAUNCH-PLAYBOOK.md` Day 8-21)

### The one-paragraph mental model
"Meta ads show our best work to homeowners in the GTA who didn't know we existed. They click, fill a 5-field form, and we get notified. We respond in 60 seconds (call or text) and book an in-home estimate. The closer the response time, the higher the close rate."

### The metric that matters
**Not click-through rate. Not impressions. SQLs.** Sales-qualified leads — people who book an in-home estimate. Track this number weekly. If it's growing, the campaigns are working. If it's flat or dropping, we need to change creative or targeting.

---

## Daily routine (5 min)

### Morning (before opening email)
1. Open Telegram → check for new `[Meta Lead]` notifications
2. For each new lead: call within 5 minutes
3. Open Arcan admin → `leads` page → verify the lead is in the table
4. If anything looks broken (no Telegram notification, missing lead row): text Cam

### Evening (before closing)
1. Open Meta Ads Manager → check today's spend vs. daily cap ($90)
2. Open Arcan admin → check new leads from today, count them
3. If leads today < 3: don't panic, check tomorrow

### Weekly (Friday afternoon, 30 min)
1. Run the weekly report (see template in `LAUNCH-PLAYBOOK.md`)
2. Update `WEEKLY-NOTES.md` with what worked, what didn't
3. Forward to Cam: "Week N report — [3 bullets summary]"

---

## What to do when...

### "I got a lead but it's junk"
- Mark as `spam_review` in the leads table
- Don't delete — Meta needs the data to optimize
- If > 30% of leads are junk, flag to Cam (targeting is too broad)

### "I got a lead but they didn't answer when I called"
- Send SMS within 15 minutes: "Hi [name], this is Gerardo from Arcan Painting. Got your request for a free estimate. When's a good time to call?"
- Try again at the time they requested (the lead form has "preferred callback time")
- After 3 attempts, mark as `uncontacted_3x` and move on

### "The Meta ads got rejected"
- Open the rejected ad → read the rejection reason
- Most common: "before/after" language in the ad copy. Fix the wording (say "what we did" not "before/after")
- Resubmit. Most rejections clear in 24 hours.

### "Leads are coming in but nobody's booking estimates"
- The lead form might be qualifying poorly (wrong project type, wrong area)
- The follow-up call might be too slow (> 60 min response = 50% lower close rate)
- Flag to Cam with the specific issue

### "Spending is way over $90/day"
- Pause all campaigns in Meta Ads Manager immediately
- Check if daily budget cap is set per campaign or at the account level
- Account-level daily cap is the safety net — set it to $100

### "Leads stopped coming in"
- Check if the pixel is still firing (use Meta Pixel Helper)
- Check if the Meta app container is running (arcanpainting.ca responds)
- Check if the webhook is responding (curl the verify endpoint)
- Check the `META_CAPI_TOKEN` hasn't expired (Meta rotates these occasionally)
- 90% of the time: it's the webhook. The pixel is fine, the campaign is fine, leads just aren't saving.

### "A customer asks about warranty"
- Standard answer: "2-year interior warranty, 5-year exterior warranty"
- Details in the contract they signed
- Warranty covers: peeling, blistering, premature fading
- Does NOT cover: damage from impact, water leaks, customer-applied modifications

### "A customer wants a refund"
- Don't promise anything. Say: "Let me talk to my partner and get back to you within 24 hours"
- Text Cam immediately with the customer's name, phone, and reason for refund request
- Cam will handle the actual conversation

---

## Tools Gerardo needs access to

### Day 1 (essential)
- [ ] Meta Business Manager login: business.facebook.com
- [ ] Meta Ads Manager login: adsmanager.facebook.com
- [ ] Google Ads login: ads.google.com
- [ ] Arcan admin (CRM): arcanpainting.ca/admin
- [ ] Telegram group: should already be in
- [ ] This kit folder: `~/projects/arcan-ads-launch/`

### Day 7 (after launch is live)
- [ ] Meta Events Manager (for pixel + CAPI monitoring)
- [ ] Google Ads conversion tracking
- [ ] Resend email dashboard (for confirmation emails)
- [ ] Coolify access (for env var changes / restarts)

### Month 2 (advanced)
- [ ] Ahrefs or SEMrush (for SEO + competitor intel)
- [ ] Canva (for ad creative updates)
- [ ] Topaz Gigapixel (for new image upscaling)

---

## When to escalate to Cam

| Situation | Action |
|---|---|
| Lead quality is consistently bad (SQL < 20%) | Pause Campaign 1, message Cam |
| CPL > $100 across multiple campaigns for 7 days | Pause everything, message Cam |
| New competitor launches aggressive offer | Add to `COMPETITIVE-NOTES.md`, message Cam |
| Customer dispute / refund request | Don't handle alone, text Cam |
| Pixel or webhook breaks | Check the basic fixes first, message Cam if unresolved |
| Wants to add a new ad campaign | Discuss with Cam first (we have a plan) |
| Wants to change the brand colors / logo | Discuss with Cam first |
| Customer wants something outside the standard service offering | Message Cam |

---

## What Gerardo does NOT do

- Don't change the Meta Pixel ID or CAPI token (breaks attribution)
- Don't add new campaigns without Cam's input
- Don't change the brand colors or logo in any ad creative
- Don't delete leads from the table (mark as spam, don't delete)
- Don't promise custom pricing outside the standard tier
- Don't respond to negative Google reviews without Cam's input

---

## Self-service guides Gerardo can use

1. **Adding a new ad to an existing campaign** — Meta Ads Manager → [Campaign] → Ad → Create
2. **Pausing a campaign** — Meta Ads Manager → [Campaign] → toggle off
3. **Responding to a new lead** — Telegram notification → call within 5 min
4. **Marking a lead as converted** — Arcan admin → lead → status: converted
5. **Updating the weekly report** — `WEEKLY-NOTES.md` template
6. **Checking the ad spend** — Meta Ads Manager → Campaigns view → columns: spend
7. **Checking the lead count** — Arcan admin → leads → filter by date range

---

## Knowledge transfer checklist (2-week overlap with Cam)

### Week 1 — Cam drives, Gerardo shadows
- Day 1: Cam walks Gerardo through this entire kit
- Day 2-3: Cam builds first campaign live, Gerardo watches
- Day 4-5: Gerardo builds second campaign, Cam reviews
- Day 6-7: Gerardo handles morning lead triage, Cam reviews

### Week 2 — Gerardo drives, Cam shadows
- Day 8-9: Gerardo runs the daily routine, Cam available for questions
- Day 10-11: Gerardo writes the first weekly report, Cam reviews
- Day 12-13: Gerardo runs the Friday report and Meta Ads Manager review
- Day 14: Gerardo handles the full week solo, Cam checks in only

### End of week 2 — Gerardo is the operator
- Cam is on-call for escalations only
- Monthly 1-hour review with Cam (see agenda below)

---

## Monthly review (60 min, Cam + Gerardo)

### Agenda
1. Last 30 days: spend, leads, SQLs, closed jobs, revenue
2. Per-campaign performance: top 2 and bottom 2
3. New competitor activity (from `COMPETITIVE-NOTES.md`)
4. New creative ideas: any new photos, new customer testimonials, new service offerings
5. Budget decision: keep $90/day or scale up/down?
6. Next 30 days: 1-2 experiments to run
7. Q&A: anything Gerardo is unsure about

### Decision: scale, kill, or pivot each campaign
- Scale = increase daily budget by 25-50% if CPL is healthy
- Kill = pause if no conversions after 14 days
- Pivot = change creative, targeting, or landing page

### Quarterly business review (QBR, 2 hours, every 3 months)
- Full performance report
- 90-day trend analysis
- Annual plan: scale, add campaigns, explore new channels
- Comp review: are we hitting revenue targets? Time to hire an ads person?

---

## If Cam disappears for a month

Gerardo has full authority to:
- Pause any campaign that's losing money
- Adjust daily budgets by ±20% without approval
- Add a new ad variant to an existing campaign
- Update the weekly notes
- Reach out to leads and close jobs

Gerardo should ask Cam before:
- Launching a new campaign
- Changing targeting fundamentally
- Making any code changes
- Adjusting budget by > 20%
- Responding to a customer dispute

---

## Files Gerardo should know about

In `~/projects/arcan-ads-launch/`:

| File | What it is |
|---|---|
| `README.md` | Overview |
| `CAMPAIGN-PLAN.md` | The 6 campaigns, budgets, targeting |
| `AD-COPY.md` | All ad text — copy-paste into Meta Ads Manager |
| `AD-CREATIVE.md` | Which images to use for which ad |
| `ads-assets/` | The images themselves |
| `TRACKING.md` | UTM strategy, KPIs, what to measure |
| `LAUNCH-PLAYBOOK.md` | Day-by-day first 30 days |
| `A-B-TESTING.md` | When to add/remove ad variants |
| `COMPETITIVE-MONITORING.md` | Weekly Meta Ad Library sweep |
| `B2B-OUTREACH.md` | RE agent + property manager sequences |
| `HANDOFF.md` | This file |
| `CAPI-PATCH.md` | The server-side tracking patch |
| `SETUP.md` | One-time account setup |
| `LANDING-PAGE.md` | Landing page optimization |
| `UPSCALE-PIPELINE.md` | How to upscale new images |
| `KPI-DASHBOARD.md` | The Telegram Mini App (when built) |

**For daily use, Gerardo only needs:** `CAMPAIGN-PLAN.md`, `AD-COPY.md`, `LAUNCH-PLAYBOOK.md` (the reporting template), and this file.

---

## The most important thing

**Respond to leads within 5 minutes.** Not 5 hours. Not tomorrow. 5 minutes.

Speed-to-lead is the #1 predictor of close rate in home services:
- Respond in 5 min: 50%+ contact rate
- Respond in 30 min: 20-30% contact rate
- Respond in 2 hours: < 10% contact rate
- Respond next day: 1-2% contact rate

If you only remember one thing from this kit: **call the lead within 5 minutes.**
