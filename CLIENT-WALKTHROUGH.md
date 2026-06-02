# CLIENT WALKTHROUGH — How to Use This Kit

**Audience:** Gerardo (or whoever runs Arcan's day-to-day)  
**Time to complete full launch:** 5 days × 2-3 hours/day = 15 hours total  
**When to use:** Monday morning, start at Step 0

---

## Before you start

You'll need:

- [ ] A laptop (Mac or PC)
- [ ] Browser logged into:
  - arcanpainting.ca admin
  - meta.com (Arcan's Meta Business account)
  - ads.google.com (Arcan's Google Ads account)
  - coolify (Arcan's hosting dashboard)
  - events.manager.facebook.com (Meta pixel)
- [ ] Credit card on file for Meta + Google
- [ ] ~3 hours of uninterrupted time per day for 5 days
- [ ] Phone for taking photos of new jobs (Day 4 production step)

You'll produce:

- 6 ad campaigns live in Meta + Google
- 6 env vars set in Coolify
- 1 webhook tested and working
- 13 production-ready ad images
- A weekly monitoring habit

You will NOT need:

- Code editor
- Terminal / command line
- Any of the `.js` files in the kit (those go to Cam, not you)
- Any technical knowledge of how the webhook works

---

## Day 1 — Account verification + webhook wiring (3 hours)

### Step 0: Open the kit
- Open `~/projects/arcan-ads-launch/` in Finder
- Open `README.md` — skim it (5 min)
- Open `STATUS.md` — this is your checklist (2 min)

### Step 1: Start Meta Business verification
- **Open:** https://business.facebook.com
- Go to Settings → Business info → Start verification
- Upload: business phone, utility bill, or business license
- **This takes 1-3 days to approve.** Start it Monday morning so it's done by Wednesday.
- ✅ Mark as done in `STATUS.md` Group A checklist

### Step 2: Set up the Meta Pixel
- **Open:** Meta Events Manager (https://business.facebook.com/events_manager)
- Click "Connect Data Sources" → "Web" → "Meta Pixel"
- Name: `Arcan Painting — Lead`
- Click "Install code manually" — copy the **Pixel ID** (numeric, like `123456789012345`)
- Save it to a note: `Arcan Pixel ID: __________`

### Step 3: Create a System User for Conversions API
- **Open:** Meta Business Settings → Users → System Users
- Click "Add" → name: `Arcan CAPI`
- Role: Admin
- Click "Add Assets" → assign the Pixel with Full Control
- Click "Generate New Token"
  - App: Marketing API
  - Token expires: Never
  - Permissions: `ads_read`, `ads_management`, `business_management`
- **Copy the token immediately** — it won't show again
- Save it: `Arcan CAPI Token: __________`

### Step 4: Generate the webhook verify token
- Just make up a long random string: `arcan-paint-2026-Meta-verify-x7Kp9mN3qR`
- Save it: `Arcan Verify Token: __________`

### Step 5: Send the env vars to Cam
- Open Telegram
- Send Cam a message with the 4 values above
- He will deploy them to Coolify. Wait for his confirmation (~30 min).

### Step 6: Verify it works
After Cam confirms deploy:
- **Open terminal (or ask Cam to run):**  
  `curl "https://arcanpainting.ca/api/lead-webhook/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"`
- Expected response: `test`
- If you get `Forbidden`: Cam needs to re-check the env var

✅ **Day 1 done when:** Meta verification submitted, pixel created, CAPI token generated, env vars sent to Cam, webhook responds with "test".

---

## Day 2 — Build Meta campaigns (2.5 hours)

### Step 1: Open the campaign specs
- Open `~/projects/arcan-ads-launch/CAMPAIGN-PLAN.md`
- Read Campaigns 1, 2, 3 (the ones to launch this week)
- Don't try to read all 6 — just C1, C2, C3

### Step 2: Open the ad copy
- Open `AD-COPY.md`
- For each campaign (1, 2, 3), find the matching ad units
- Copy-paste the headlines, primary text, descriptions, CTAs

### Step 3: Open the image strategy
- Open `AD-CREATIVE.md`
- Read the "Image checklist before launch" section
- Note: you'll need upscaled images (1080px+). For now, the 400px thumbs in `ads-assets/` will work for the first 2 weeks, then Cam will upsize.

### Step 4: Build Campaign 1 (Single Room Refresh)
- **Open:** https://adsmanager.facebook.com
- Click "Create" → "Lead generation" objective
- Campaign name: `Arcan — Single Room Refresh`
- Daily budget: `$20`
- Continue → Ad Set name: `Arcan — SR — 25-44`
  - Location: Toronto, Mississauga, Brampton, Markham, Vaughan, Richmond Hill, Oakville, Burlington, Scarborough, Etobicoke, North York
  - Age: 25-44
  - Detailed targeting: Interests → Home improvement, Home Depot, Lowe's
  - Detailed targeting: Behaviors → Homeowners
  - Placements: Advantage+ placements (default)
- Ad level: Single image
- Primary text: from `AD-COPY.md` Ad 1A
- Headline: from `AD-COPY.md` Ad 1A
- Description: from `AD-COPY.md` Ad 1A
- Image: from `ads-assets/single-room/PXL_20260213_211346296_thumb.webp`
- CTA: Get Quote
- Lead form: use existing `Arcan — Free Estimate` form
- Publish
- Repeat for the 45-65 age ad set
- Repeat for Ad 1B and Ad 1C variants

### Step 5: Build Campaign 2 (RE Pre-Listing)
- Same flow as Campaign 1 but:
  - Daily budget: `$15`
  - Targeting: Job titles → Real Estate Agent / Realtor
  - Interests: Real estate, RE/MAX, Royal LePage, etc.
  - Use Campaign 2 ad units from `AD-COPY.md`
  - Images: from `ads-assets/re-listing/`

### Step 6: Build Campaign 3 (Retargeting)
- This one needs a Custom Audience first:
  - Audiences → Create Audience → Custom Audience → Website
  - Name: `Arcan — 30-day visitors`
  - Event: All website visitors
  - Retention: 30 days
- Then build the campaign:
  - Daily budget: `$25`
  - Targeting: Use `Arcan — 30-day visitors` custom audience
  - Use Campaign 3 ad units from `AD-COPY.md`
  - Images: from `ads-assets/retargeting/`

### Step 7: Pause all 3 campaigns
- Don't publish yet. You want to test the full flow first.
- In each campaign, click the toggle to set "Off"

✅ **Day 2 done when:** Campaigns 1, 2, 3 are built but paused, ad copy and images uploaded.

---

## Day 3 — Test + build Google campaign (2 hours)

### Step 1: Test the Meta lead flow
- Go to one of the paused campaigns
- Click "Preview" → fill out the form with YOUR phone number and `test@arcanpainting.ca`
- Submit
- Check Telegram — you should see a notification `[Meta Lead] ...`
- Check Arcan admin → leads table — should see a new row with `source = meta_lead_ad`
- If you don't see these, the webhook isn't wired right. Message Cam.

### Step 2: Build Google Campaign 6 (WOW 1 Day Brand Conquest)
- **Open:** https://ads.google.com
- Click "+ New Campaign" → Leads → Website leads
- Campaign name: `Arcan — WOW 1 Day Brand Conquest`
- Bidding: Maximize conversions, Target CPA $30
- Daily budget: `$5`
- Locations: Toronto, Mississauga, Brampton, Markham, Vaughan, Richmond Hill, Oakville, Burlington, Scarborough, Etobicoke, North York
- Ad schedule: 8am-9pm
- Keywords (exact match):
  - `[wow 1 day painting toronto]`
  - `[wow 1 day painting]`
  - `[one day painting toronto]`
  - `[1 day painter toronto]`
  - `[wow1day toronto]`
- Negative keywords: jobs, hiring, careers, salary, complaints, reviews, bbb, scam, lawsuit
- Create a Responsive Search Ad
  - 15 headlines + 4 descriptions from `CAMPAIGN-PLAN.md` Campaign 6
  - Final URL: `https://arcanpainting.ca/quote`
  - Sitelinks: Interior Painting / Exterior Painting / Commercial / Free Quote / About / Reviews
  - Callout extensions: WSIB-Covered, 2-Year Warranty, 5.0★ Google, 25+ Years, Free Estimate
- Publish (yes, this one can go live immediately)

### Step 3: Set the Meta CAPI test mode to false
- Tell Cam: "Google campaign is live, set `META_CAPI_TEST=false` in Coolify"
- After he confirms, you can publish the Meta campaigns (Day 5)

✅ **Day 3 done when:** Meta lead flow tested and working, Google campaign live, Cam has set CAPI test mode to false.

---

## Day 4 — Photo production + image upscaling (3 hours)

### Step 1: Schedule photo shoots with crews
- For every active Arcan job this week, the lead painter must take **before photos**
- Send a text to your crews: "Starting this week, every job needs 3 before photos: wide shot of room, detail shot of any damage or unusual feature, and a shot showing the size/scale"
- They text/upload to a shared Google Drive folder you'll create
- Folder: `Arcan Before/After — 2026`

### Step 2: Get full-res originals from Cam's collection
- Ask Cam to share the original photos for the 13 images in `ads-assets/`
- If he doesn't have them, ask your crews to re-shoot from the existing project photos
- Goal: every image in `ads-assets/` should have a 1600px+ version

### Step 3: Upscale the 13 images
- **Option A — paid ($99):** Buy Topaz Gigapixel AI from topazlabs.com
  - Drag all 13 images in
  - Settings: Scale 4x, Model "High Fidelity", output PNG
  - Output to `ads-assets/full-res/{folder}/`
- **Option B — free:** Use Real-ESRGAN command-line tool
  - See `UPSCALE-PIPELINE.md` Option 3 for commands
- **Option C — if neither works:** message Cam, he'll handle it

### Step 4: Add text overlay in Canva
- Open Canva → Create design → Custom size 1080x1080
- Upload the upscaled image
- Add badges: bottom-left "WSIB", bottom-right "Get Free Quote"
- See `AD-CREATIVE.md` "Text overlay (required for all ads)" section
- Export as PNG
- Repeat for each ad variant

### Step 5: Re-upload the new images to Meta
- In each paused campaign, swap the 400px images for the 1080px versions
- This is a 5-min/creative task

✅ **Day 4 done when:** Upscaled images in `ads-assets/full-res/`, text overlay added, Meta campaigns re-uploaded with 1080px+ images.

---

## Day 5 — Go live (1.5 hours)

### Step 1: Verify Meta Pixel fires on the site
- Install Meta Pixel Helper Chrome extension (https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmokpc)
- Visit arcanpainting.ca
- Should see 1 PageView event fire
- Submit a test contact form
- Should see 1 Lead event
- If you see errors, message Cam

### Step 2: Verify GBP is connected
- Open Arcan admin → Marketing → Google Business Profile
- If it says "Not connected" or "No location", message Cam. He'll need to do the OAuth flow.

### Step 3: Publish Meta campaigns
- Go to each paused campaign in Meta Ads Manager
- Toggle from "Off" to "On"
- Publish time: 7am Monday morning (or whenever the daily budget cycle resets)
- **Don't publish during 6-10pm peak hours — Meta's algorithm is weird about that**

### Step 4: Send a launch notification
- Telegram group: "Meta ads are LIVE. New leads will come in via the form. I'll respond within 5 minutes."
- This is your team's "heads up" — anyone watching the Telegram will see new leads flow in

### Step 5: Set daily routine expectations
- **Tomorrow morning:** Check Telegram first thing. Any [Meta Lead] notification → call within 5 min.
- See `HANDOFF.md` "Daily routine" for the full operating rhythm

✅ **Day 5 done when:** All 4 campaigns live, pixel verified, team notified, daily routine activated.

---

## After launch — what to do each day/week

### Daily (5 min, morning)
1. Check Telegram for `[Meta Lead]` notifications
2. Call each new lead within 5 minutes
3. Check the lead landed in Arcan admin `leads` table

### Daily (5 min, evening)
1. Open Meta Ads Manager mobile app → check today's spend
2. Open Google Ads mobile app → same
3. Count new leads today (target: 3-10 depending on campaign)

### Weekly Friday (30 min)
- Open `LAUNCH-PLAYBOOK.md` "Reporting template" section
- Fill in the weekly report
- Forward to Cam: "Week N report: [3 bullets]"

### Weekly Monday (15 min, see `COMPETITIVE-MONITORING.md`)
- Run the Meta Ad Library searches for `painters toronto`, `wow 1 day painting`, `sienna painting toronto`, `probrush`
- Note any new competitor ads in `COMPETITIVE-NOTES.md` (create if doesn't exist)

### When leads stop coming in
- See `HANDOFF.md` "What to do when..." section
- 90% of the time: webhook issue, not ad issue

### When you don't know what to do
- Check `HANDOFF.md` first
- Then `STATUS.md` (every doc links to next step)
- Then message Cam

---

## What you DON'T do

- Don't change the Meta Pixel ID or CAPI token (breaks attribution)
- Don't add new campaigns without discussing with Cam
- Don't change the brand colors or logo in ad creative
- Don't delete leads from the table (mark as spam, don't delete)
- Don't promise custom pricing outside the standard tier
- Don't respond to negative Google reviews without Cam's input

---

## What to ask Cam for help with

| Situation | Ask Cam |
|---|---|
| Lead quality is consistently bad (SQL < 20%) | "Should we pause Campaign X?" |
| CPL > $100 across multiple campaigns for 7 days | "Need to debug — what's wrong?" |
| New competitor launches aggressive offer | "Saw this — should we counter?" |
| Customer dispute / refund request | "Customer X wants a refund — please call them" |
| Pixel or webhook breaks | "Webhook returning 500 — can you check?" |
| Wants to add a new ad campaign | "Want to add a new campaign — let's plan it" |
| Wants to change the brand colors / logo | "Want to update the brand — is now the time?" |
| Customer wants something outside the standard service | "Customer wants X — possible?" |

---

## The 5-minute mental model

"Meta ads show our best work to GTA homeowners. They click, fill a 5-field form, we get a Telegram notification. We call within 5 minutes. The faster we call, the more jobs we book."

That's it. The 18 docs in this kit are reference material for when something specific breaks or you want to optimize. The 5-minute mental model is what you actually do, every day.
