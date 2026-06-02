# Account Setup Checklist

**Time required:** 2-3 hours total  
**Order matters — do these in sequence.**

---

## Part 1 — Meta Business Manager (45 min)

### 1.1 Create or claim Meta Business account
- Go to https://business.facebook.com
- If Arcan already has a business page, use it. If not, create one.
- Business name: `Arcan Painting`
- Primary admin: Gerardo (or whoever manages the business day-to-day)
- Add Cam as a second admin (for ads access)

### 1.2 Verify the business
- Settings → Business info → Start verification
- Upload: business phone number, utility bill, or business license
- Verification takes 1-3 business days typically (do this first, don't block on it)

### 1.3 Create / claim Meta Pixel
- Events Manager → Pixels → Add
- Pixel name: `Arcan Painting — Lead`
- Install pixel on arcanpainting.ca (see Part 4 below)
- **Save the Pixel ID** — you'll need it for `META_PIXEL_ID` env var

### 1.4 Set up Conversions API (CAPI)
- Events Manager → Pixels → [Your Pixel] → Settings → Conversions API
- Generate access token: "Generate access token" → copy
- **Save the access token** — this is `META_CAPI_TOKEN` env var
- Set up webhook URL for Lead Form (see Part 3)

### 1.5 Create Meta Lead Form
- Lead Ads Form → Create new form
- Form name: `Arcan Painting — Free Estimate`
- Type: More volume
- Form fields: (use spec from CAMPAIGN-PLAN.md, varies by campaign — create one form per campaign, or use one form with conditional fields)
- Custom disclaimer: paste from `AD-COPY.md`
- **CRM Webhook URL:** `https://arcanpainting.ca/api/lead-webhook/meta` (will only work after Part 3 is deployed)
- Verify token: generate one, save to `META_LEAD_VERIFY_TOKEN` env var

### 1.6 Set up ad account + payment
- Ads Manager → Billing → Payment methods → Add credit card
- Daily spend cap recommended: $90/day (matches CAMPAIGN-PLAN total)
- Set account-level block list: spam categories (work-from-home, biz opp, etc.)

### 1.7 Required settings
- Time zone: America/Toronto
- Currency: CAD
- Disable "auto-updates" to campaigns (you want manual control)
- Enable "campaign budget optimization" OFF (use ad-set-level budgets so you can pause individual campaigns without breaking others)

---

## Part 2 — Google Ads (30 min)

### 2.1 Create Google Ads account
- Go to https://ads.google.com
- Sign in with the Google account that owns the Google Business Profile
- If no Google account: use `info@arcanpainting.ca` (it should already exist)

### 2.2 Claim Google Business Profile
- Go to https://business.google.com
- Search "Arcan Painting Toronto"
- If unclaimed: claim it (verify by postcard, phone, or email)
- **Critical:** the Google Business Profile is the foundation of Local Services Ads. Even if you don't run LSAs yet, claim it now.

### 2.3 Set up billing
- Tools → Billing → Payment methods → Add credit card
- Set account-level daily cap: $5/day to start (matches WOW 1 Day conquest campaign)
- Set up conversion tracking:
  - Tools → Conversions → New conversion
  - Name: "Lead Form Submit"
  - Category: Lead
  - Count: Every
  - Attribution: Data-driven

### 2.4 Apply for Google Local Services Ads (optional but recommended)
- https://ads.google.com/local-services-ads
- Background check required ($50-150 one-time per market)
- Once approved, LSAs show at the top of Google search with "Google Guaranteed" badge
- LSAs in the home services category convert 2-3x higher than regular Search Ads
- Apply even if you don't launch immediately — approval takes 2-4 weeks

---

## Part 3 — Arcan App deployment (60 min)

### 3.1 Deploy the Meta lead webhook
- Confirm `src/app/api/lead-webhook/meta/route.js` is in place (it's already there from this kit)
- Restart Arcan's app container in Coolify
- Verify: `curl https://arcanpainting.ca/api/lead-webhook/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test`
  - Expected response: `test` (200 OK)
  - If you get 403: `META_LEAD_VERIFY_TOKEN` in Coolify env doesn't match the token in Meta

### 3.2 Deploy the CAPI helper + patch
- Confirm `src/app/api/utils/meta-capi.js` is in place
- Confirm `src/app/api/contact/route.js` has the `sendLeadEvent` import + call
- Restart Arcan's app container

### 3.3 Set Coolify env vars
- Open Coolify → Arcan app → Environment
- Add (one per line):
  ```
  META_PIXEL_ID=your_pixel_id_here
  META_CAPI_TOKEN=your_access_token_here
  META_LEAD_VERIFY_TOKEN=your_verify_token_here
  META_CAPI_ENABLED=true
  META_CAPI_TEST=true
  ```
- Save → redeploy

### 3.4 Verify the Pixel fires on site
- Install Meta Pixel Helper Chrome extension
- Visit arcanpainting.ca
- Confirm pixel loads (1 PageView event)
- Submit the contact form with a test email
- Confirm Lead event fires (with `META_CAPI_TEST=true` it shows in Test Events)

### 3.5 Verify the Meta Lead webhook
- In Meta Events Manager → Test Events, paste a fake lead payload
- Confirm Arcan admin `leads` table gets a new row with `source = meta_lead_ad`
- Confirm Telegram notification arrives

---

## Part 4 — Meta Pixel installation on arcanpainting.ca (30 min)

If the pixel isn't already on the site, install it. Two options:

### 4.1 Option A: code injection via `<head>` (simplest)
- In Arcan app, find `src/app/layout.jsx` (or whatever the root layout is)
- Add this to the `<head>` section:

```jsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
      fbq('track', 'PageView');
    `
  }}
/>
<noscript><img height="1" width="1" alt=""
  src="https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1"
/></noscript>
```

- Add `NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id` to Coolify env
- Restart the app

### 4.2 Option B: use a tag manager (cleaner)
- Install Google Tag Manager container on arcanpainting.ca
- Add Meta Pixel via GTM (template: "Meta Pixel")
- Add GA4 via GTM (if not already)
- Add Google Ads conversion tracking via GTM
- This is the long-term scalable approach — use it

### 4.3 Verify
- Use Meta Pixel Helper Chrome extension
- Visit arcanpainting.ca — should see 1 PageView event
- Submit contact form — should see 1 Lead event (client-side)
- Check Events Manager → Test Events for the matching server-side event (from CAPI)

---

## Part 5 — Pre-launch verification (15 min)

Before any ad goes live, verify:

- [ ] Meta Pixel fires on arcanpainting.ca (PageView + Lead events confirmed)
- [ ] CAPI server-side Lead event arrives in Events Manager with matching `event_id`
- [ ] Meta Lead webhook creates a row in Arcan `leads` table (check admin)
- [ ] Telegram notification arrives for new lead
- [ ] Resend automated email triggers (check the customer inbox)
- [ ] All images uploaded to Meta Ads Manager are 1080px+ (no 400px thumbs)
- [ ] All lead forms have the CASL disclaimer
- [ ] All ad copy has the "WSIB-Covered" or "2-Year Warranty" trust signal
- [ ] Google Ads conversion tracking fires on the quote page submit
- [ ] All UTM parameters correct (see TRACKING.md)

---

## Part 6 — Coolify env var final state

After everything is set up, your Arcan app env should have these new vars (in addition to existing):

```
META_PIXEL_ID=                    # e.g. 1234567890
META_CAPI_TOKEN=                  # from Events Manager → Generate Access Token
META_CAPI_ENABLED=true            # optional, default true
META_CAPI_TEST=false              # MUST be false in production (was true during testing)
META_LEAD_VERIFY_TOKEN=           # matches token in Meta Lead Form CRM webhook
META_API_VERSION=v18.0            # optional, default v18.0
NEXT_PUBLIC_META_PIXEL_ID=        # same as META_PIXEL_ID, but exposed to client
```

**Save these tokens in a password manager.** Meta system-user tokens are long-lived but can be revoked; if you lose them you have to regenerate.

---

## Common setup pitfalls

1. **Pixel installed but CAPI not configured** — leads show in CRM but not in Meta. Without CAPI, attribution is ~50%. With CAPI, ~90%.
2. **Pixel fires but `event_id` doesn't match between client and server** — Meta dedupes by `event_id` + user data. Mismatch = double-counting. Always send the same `event_id` from both sides.
3. **Meta Lead Form CRM webhook returns 401** — verify token mismatch. Common when env var is rotated in one place but not the other.
4. **Google Ads conversion fires but offline leads aren't attributed** — need offline conversion import via gclid. Out of scope for v1.
5. **CASL non-compliance** — first contact under Section 6(1) is fine if the lead form has the disclaimer. After that, normal consent rules apply. The Resend email workflow in Arcan already handles this for organic leads.
6. **Ad rejected by Meta for "before/after" claims** — Meta has specific rules. Phrase as "what we did" not "before/after" in the ad copy. The before/after image carousel itself is fine, just don't say "before/after" in the headline/description text.
