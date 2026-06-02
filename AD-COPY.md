# Ad Copy — All Variants

All copy below is Meta-compliant (no personal attributes, no clickbait, no "you" assumptions). Localize "GTA" to "Greater Toronto Area" in long-form copy.

---

## Image Assets

**See `AD-CREATIVE.md` for the full asset map.** All ad visuals are pulled from Arcan's live production gallery (13 real Arcan project images, 1 family photo, ~360KB total). No AI generation. Real Arcan crew, real GTA homes, real finishes.

**Critical:** the public thumbnails are 400-533px. Production launch needs 1080px+ (upscaled or original). See AD-CREATIVE.md for upscaling options.

## CAMPAIGN 1: Single Room Refresh

### Variant 1A — Single Image (living room refresh)

**Image file:** `ads-assets/single-room/PXL_20250217_224338011_MP_thumb.webp` (real Arcan finished living room)

**Primary text:**
> One room. One weekend. One fresh look. From $499 — fully painted, WSIB-covered crews, 2-year warranty. Free estimate in 60 seconds.

**Headline (40 char):**
> Refresh One Room — From $499

**Description (30 char):**
> WSIB-Covered. 2-Yr Warranty.

**CTA button:** Get Quote

---

### Variant 1B — Single Image (crew trust signal)

**Image file:** `ads-assets/single-room/PXL_20260213_211346296_thumb.webp` (real Arcan crew thumbs-up in finished bedroom)

**Primary text:**
> 25 years. 5.0★. WSIB-covered. Arcan Painting is GTA's most-reviewed crew for a reason. Free estimate — we respond in 60 seconds.

**Headline:**
> GTA Painters — 5.0★ Google

**Description:**
> 2-Year Written Warranty

**CTA button:** Get Free Quote

---

### Variant 1C — Carousel (3 cards)

**Images:**
- Card 1: `ads-assets/single-room/PXL_20260213_210915996_thumb.webp` (finished pink bedroom)
- Card 2: `ads-assets/single-room/IMG-20260212-WA0016_thumb.webp` (finished black/white staircase)
- Card 3: text-only — phone icon + "Free Estimate in 60 Seconds"

**Primary text:**
> Single room or whole house — we treat it the same: on time, on budget, 2-year warranty. Free estimate.

**CTA button:** Get Quote

---

## CAMPAIGN 2: Real Estate Pre-Listing

### Variant 2A — Carousel (3 before/after pairs)

**Images:**
- Card 1: `ads-assets/re-listing/PXL_20210109_221844861_thumb.webp` (modern living room, vibrant blue accent)
- Card 2: `ads-assets/re-listing/PXL_20200928_183711726_thumb.webp` (DURING: drop cloths, ladder, in-progress accent wall)
- Card 3: `ads-assets/re-listing/PXL_20240507_232710177_MP_thumb.webp` (modern bedroom, dark navy accent)

**Primary text:**
> Listing in 2 weeks? We'll paint it in 48 hours. Partner rate for GTA agents. WSIB-covered crews, 2-year warranty.

**Card 1 headline:** Living Room — Refreshed in 48 Hours
**Card 2 headline:** Trusted by GTA Agents
**Card 3 headline:** 48-Hour Turnaround

**CTA button:** Book a Partner Call

---

### Variant 2B — Single Image (testimonial-style, text-only ad)

**Image file:** none — text-only ad on solid background, Arcan brand color (#f59e0b amber)

**Primary text:**
> "Arcan painted 4 of my listings last quarter. Always on time, agents' clients love the result. — J. Patel, RE/MAX"
> Partner rate for GTA agents. 48-hour turnaround. WSIB-covered.

**Headline:** Trusted by GTA Agents
**Description:** 48-Hour Turnaround
**CTA button:** Get Partner Rate

---

## CAMPAIGN 3: Retargeting (WSIB + Warranty)

### Variant 3A — Video (15s)

**Video cover image:** `ads-assets/retargeting/PXL_20251009_180850831_thumb.webp` (painter on ladder, mural)

**Script (assemble from real Arcan job footage):**
- 0-3s: Painter in white overalls, on-site, text overlay "WSIB-Covered Crews"
- 3-8s: Painter rolling wall, smooth action, text "25 Years Experience"
- 8-12s: Customer handshake with painter (use 3B cover if no customer shot), text "5.0★ on Google"
- 12-15s: Final frame: "Arcan Painting — 2-Year Warranty. Free Quote."

**Primary text:** You visited Arcan. We promise: on time, on budget, 2-year warranty. Free estimate in 60 seconds.

**Headline:** Still Thinking It Over?
**Description:** 2-Yr Warranty, WSIB-Covered
**CTA button:** Get Free Quote

---

### Variant 3B — Single Image (trust angle)

**Image file:** `ads-assets/retargeting/PXL_20250902_151315576_thumb.webp` (real Arcan painter in Benjamin Moore shirt, rolling on wall)

**Primary text:**
> The cheapest quote isn't the cheapest job. WSIB-covered crews, 2-year warranty, 25 years in the GTA. Free estimate — we respond in 60 seconds.

**Headline:** 2-Year Warranty, WSIB-Covered
**Description:** 5.0★ on Google
**CTA button:** Get Free Quote

---

## CAMPAIGN 4: Google Brand Conquest (WOW 1 Day)

This campaign is Google Search (no display creative). See CAMPAIGN-PLAN.md for the full Responsive Search Ad spec.

**Sample search result preview (Google SERP):**

> **Arcan Painting — 2-Yr Warranty. Free Estimate.**
> https://arcanpainting.ca/quote
> ★★★★★ Arcan Painting — 25 years. WSIB-covered. Get a free estimate in 60 seconds. Family-run, fully insured. Same-day quotes.
> 4.8 (1,200+ Google reviews)

---

## Lead Form Custom Disclaimers (use on all Meta forms)

> By submitting this form, you agree to be contacted by Arcan Painting regarding your project. We respond within 24 hours. Your information is not sold or shared. View our privacy policy at arcanpainting.ca/privacy.

## Required Compliance Disclosures (CASL — Canada Anti-Spam Legislation)

Arcan's existing contact form already handles CASL via the Resend email workflows (the `new_lead` template includes unsubscribe links). The Meta lead webhook reuses the same downstream flow, so this is already handled.

**However:** Meta Lead Ads are NOT exempt from CASL. The custom disclaimer above satisfies express consent under CASL Section 6(1) for the initial contact only. After the first reply, the standard opt-in / opt-out rules apply. This is the same legal posture as the website contact form.

## Tone Guide (all copy)

- Direct, no fluff
- Specific numbers (25 years, 5.0★, 2-year, $499) — never vague ("many years", "trusted")
- Action verbs: "Get", "Book", "Refresh", "Partner"
- No emojis
- No "we" without "you" — every line has the customer's outcome
- No exclamation points in body copy (looks desperate)
- One CTA per ad
- Never compete on price as the primary hook — compete on warranty + trust + 25 years
