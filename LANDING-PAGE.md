# Landing Page & Conversion Audit

**The #1 reason ads fail:** the click goes somewhere that doesn't match the ad's promise. Fix the landing page before spending on more ads.

---

## Two paths: Meta Instant Form vs arcanpainting.ca/quote

### Meta Instant Form (default for all Meta campaigns)

**Why we use it for Meta campaigns:**
- 40-60% lower CPL vs. landing-page redirect
- No page-load friction (form opens in-app on mobile)
- Meta handles the auto-fill (name, email, phone)
- Lead is in your CRM before the user even closes the form
- Best for cold top-of-funnel traffic (Campaigns 1, 2, 4, 5)

**Form structure (already specced in CAMPAIGN-PLAN.md):**
- 5-7 fields max
- One "qualifying" question per form (project type, brokerage, etc.)
- Custom disclaimer (CASL compliance)
- Thank-you screen with "We'll respond within 24 hours"

**Thank-you screen options:**
- "Thank you" + call CTA: "(416) 727-2148"
- "Thank you" + cross-sell: "While you wait, read our painting guide" → blog post
- "Thank you" + urgency: "We respond within 24 hours. If urgent, call now."

Recommended: option 1 (simple, no distractions).

### arcanpainting.ca/quote (for Google Brand Conquest)

**Why we use it for Google:**
- Google Ads policy: lead form extensions are limited, mostly want a destination URL
- Search intent is high (they typed "wow 1 day toronto") — they're ready to convert
- The page is a real form, not a Meta pre-fill
- Best for high-intent bottom-funnel traffic (Campaign 6)

**Quote page audit (current state):**

Run the audit at `https://arcanpainting.ca/quote`:

1. **Load speed** — must be < 3 seconds on 4G. Test with Chrome DevTools.
2. **Mobile experience** — 80%+ of paid traffic is mobile. Test on iPhone 12 + Pixel 6.
3. **Form fields** — should be the same 5-7 fields as the Meta form
4. **Trust signals above the fold** — 5.0★ Google, 25 years, 500+ clients
5. **Single CTA** — one form, one button, no distractions
6. **No navigation menu** — strip it for paid traffic (use a different layout from the homepage)

If the quote page is the same as the homepage, that's a conversion killer. The homepage has 8 CTAs. The quote page should have 1.

---

## Required fixes to arcanpainting.ca/quote (if not already done)

### Fix 1: Strip navigation menu
- Remove top nav (or replace with just logo + phone number)
- Remove footer
- Single-focus page

### Fix 2: Add the trust bar above the fold
- "5.0★ Google | 25+ Years | 500+ Clients | WSIB-Covered | 2-Year Warranty"
- Icons + text, in a single row
- 8-12px below the H1

### Fix 3: Single form, no distractions
- One H1: "Get Your Free Painting Estimate"
- One subhead: "We respond within 24 hours. WSIB-covered, 2-year warranty."
- 5 fields: Name, Email, Phone, Project Type (dropdown), Postal Code
- One button: "Get Free Quote"
- One disclaimer: "By submitting, you agree to be contacted by Arcan Painting."

### Fix 4: Trust signals below the form
- 3 testimonial cards (real customers from Google reviews)
- 6-image portfolio grid (real Arcan projects from the gallery)
- "Licensed, Insured, WSIB-Covered" badges
- Phone number and email for direct contact

### Fix 5: Speed
- Run Lighthouse on the page
- Target: 90+ performance, 95+ accessibility
- Lazy-load images, defer non-critical JS, use WebP
- The Arcan app already has good performance per the homepage test, but the quote page may not be optimized

### Fix 6: Match the ad's promise
- If the Google ad says "Free estimate in 60 seconds", the page must deliver that — no "we'll call you to schedule a 30-min consultation"
- Every ad promise must be visible on the landing page within 5 seconds
- If the page doesn't match, visitors bounce and Google penalizes your Quality Score

---

## UTM parameters (every URL)

Every paid traffic URL needs UTMs so you can attribute leads in Arcan's admin.

### Google Brand Conquest URLs

```
https://arcanpainting.ca/quote?utm_source=google&utm_medium=cpc&utm_campaign=wow1day_conquest&utm_content=brand_conquest
```

### Future: if you add Meta campaigns to redirect to website (don't, but for reference)
```
https://arcanpainting.ca/quote?utm_source=meta&utm_medium=cpc&utm_campaign=single_room_refresh&utm_content=ad_1a_trust
```

### Implementation: read UTMs in the page

The Arcan `ContactSection.jsx` already POSTs to `/api/contact`. The current payload doesn't include UTMs. To capture them:

```jsx
// In ContactSection.jsx, read UTMs from URL on mount:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const utmData = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
  };
  // Stash in a hidden state to include in form submit
  setUtmData(utmData);
}, []);
```

Then include `utmData` in the POST body. Then in `/api/contact/route.js`, forward to `/api/leads` as `metadata.utm_source: 'google'`, etc.

**Out of scope for this kit.** The Meta Lead Form doesn't need this (it captures ad/adset/campaign ID natively). The Google campaign is the only one that needs UTM-based attribution for v1, and Google Ads auto-tagging via gclid handles most of it.

---

## A/B testing the quote page

If you want to test the quote page itself (advanced, after month 1):
- Run Google Ads with 2 different landing pages: `/quote` and `/quote-alt`
- Use Google Optimize (deprecated) or a free alternative like VWO
- Or use arcan's existing variant system if it has one
- Don't A/B test the page until you've A/B tested the ad for 30 days

For v1, one quote page, no testing, ship it.

---

## Lead notification flow (already in place)

When a lead comes in via the quote page (Google Ads) or the Meta form:
1. POST to `/api/contact` or `/api/lead-webhook/meta`
2. Insert into `leads` table (via `/api/leads`)
3. Fire-and-forget: lead-qualifier agent (Gemini analyzes the lead)
4. Fire-and-forget: Meta CAPI `Lead` event (server-side attribution)
5. Send Resend email workflow (`new_lead` template)
6. Send Gmail notification to `info@arcanpainting.ca`
7. Send Telegram notification to Gerardo

This is the full chain. If any step fails, the lead is still saved (steps 1-2 are critical, 3-7 are nice-to-haves).

---

## Form conversion benchmarks (industry)

For home services lead forms in the GTA:
- **Form view → start:** 50-65% (most visitors at least click the first field)
- **Form start → submit:** 25-40% (this is the metric to optimize)
- **Overall form conversion rate:** 15-25% (good)
- **Below 10%:** form is too long, or trust signals are missing, or CTA is unclear
- **Above 30%:** form is too short (not qualifying), or page is misleading

For Arcan's current `/api/contact` flow (3-step wizard): 25-35% conversion is realistic.

---

## When to switch from Instant Form to landing page

After month 1, if:
- CPL on Instant Form is > $80 (too high)
- Lead quality is low (lots of unqualified leads)
- SQL rate is < 25%

Switch to landing page redirects. You'll get fewer leads but higher quality. CPL goes up, close rate goes up, revenue per lead goes up.

For v1, Instant Form is the right call. Switch later if data justifies it.

---

## What you DON'T do

- Don't send paid traffic to the homepage. Ever.
- Don't have multiple forms on the landing page. One.
- Don't have a phone number as the only CTA. Some people want forms.
- Don't add popups. Annoying on paid traffic.
- Don't use auto-play video. Google penalizes.
- Don't have a 12-field form. 5-7 max.
