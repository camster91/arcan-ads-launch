# Tracking & Attribution

## UTM Strategy

All paid traffic gets UTMs. The Arcan app's lead route doesn't currently parse UTMs but `contactSource` and the new `meta_lead` webhook both capture source.

**Meta campaign UTMs:**
```
?utm_source=meta&utm_medium=cpc&utm_campaign={campaign_name}&utm_content={ad_name}&utm_term={adset_name}
```

**Google campaign UTMs:**
```
?utm_source=google&utm_medium=cpc&utm_campaign=wow1day_conquest&utm_content=brand_conquest
```

**Suggested implementation (in `src/app/api/contact/route.js`):**

The existing route reads `body` from the JSON request. UTMs would be in the URL, not the body, so we'd need to either:
- (a) Parse UTMs from the `Referer` header on the server
- (b) Have the landing page forward UTMs as hidden form fields

For v1, Meta Lead Forms don't pass UTMs to webhooks — we already capture the ad/adset/campaign IDs in the lead payload (see `meta` object in the webhook). For the Google campaign (which routes to arcanpainting.ca/quote), we'll need the page to capture UTMs.

**Recommended v1.1 follow-up:** Add a small `UtmCapture.jsx` component that reads `window.location.search` and POSTs `utm_source/utm_medium/utm_campaign/utm_content/utm_term` as hidden fields in the existing quote form. Out of scope for this launch kit.

## Conversion Events

### Meta Pixel — Client-Side

Already on arcanpainting.ca. Fire `Lead` event on:
- `src/components/ContactSection.jsx` step 3 submit (success path)
- `src/components/LeadFormPopup.jsx` submit (success path)

The current `onSubmit` does a `fetch('/api/contact', ...)` and on `success: true` shows the thank-you. Add a `if (typeof window.fbq === 'function') window.fbq('track', 'Lead');` after the success branch.

### Meta CAPI — Server-Side (recommended)

For better attribution in a post-iOS-14.5 world, also fire CAPI from the server. Add to `src/app/api/contact/route.js` after the lead insert succeeds:

```js
// At the top of the file
import crypto from 'node:crypto';

function sendMetaCapi(eventName, leadId, email, phone, request) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_TOKEN;
  if (!pixelId || !accessToken) return;

  const ip = request.headers.get('x-forwarded-for') || '0.0.0.0';
  const ua = request.headers.get('user-agent') || '';
  const fbp = request.headers.get('x-fb-client-ip') || '';
  const emailHash = email ? crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex') : null;
  const phoneHash = phone ? crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex') : null;

  fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: String(leadId),
        event_source_url: request.url,
        action_source: 'website',
        user_data: { em: emailHash ? [emailHash] : [], ph: phoneHash ? [phoneHash] : [], client_ip: ip, client_user_agent: ua, fbp },
      }],
    }),
  }).catch(() => {});
}

// In POST() after the leads insert succeeds:
sendMetaCapi('Lead', leadId, body.email, body.phone, request);
```

This is **out of scope** for the current launch kit. The Meta Lead Form webhook I built doesn't need this — Meta tracks Instant Form conversions natively. The CAPI server event is for the website contact form, which is the source of organic + Google + direct traffic leads. Adding it later is a 30-min job.

## KPIs to Track Weekly

| Metric | Source | Target (30 days) |
|---|---|---|
| Impressions | Meta Ads Manager | 150K+ |
| Clicks | Meta Ads Manager | 3,000+ |
| CTR | Meta Ads Manager | 1.8%+ |
| Leads (form submits) | Meta + Arcan admin `leads` table | 100+ |
| CPL (blended) | Spend / Leads | $50-65 |
| SQL → Estimate booked | Arcan admin (status transition) | 35%+ |
| Estimate → Won | Arcan admin | 25%+ |
| Avg job value | Arcan admin | $5K+ |
| ROAS (revenue / spend) | Arcan admin + Meta/Google spend | 4x+ by month 3 |

## Reporting Cadence

- **Daily (5 min):** Open Meta + Arcan admin, log CPL, pause anything > $80 with 0 conversions
- **Weekly Friday (15 min):** Review above KPIs in a Google Sheet, mark winners/losers
- **Monthly (60 min):** Full report to Gerardo, scale decision, creative refresh for next month

## Spam / Lead Quality

The `authLimiter` in `src/app/api/contact/route.js` already rate-limits. The new `/api/lead-webhook/meta` route also runs through `authLimiter`. Meta Lead Forms have built-in anti-spam (honeypot field, CAPTCHA if needed) — no extra work.

**One concern:** Meta Lead Form spam in the home-services category is real. Expect 5-15% junk. Add a `lead_status = 'spam_review'` flag in the Arcan admin leads view and have Gerardo bulk-delete weekly.

## Failure Modes to Watch

- **Webhook signature mismatch:** if `META_LEAD_VERIFY_TOKEN` is rotated in Meta but not updated in Coolify env, Meta's delivery will 401. Symptom: leads stop appearing in Arcan admin. Mitigation: alert on `[meta-leads] invalid signature` log line.
- **Meta CAPI down:** not applicable to v1.
- **Google offline conversion upload:** for the WOW conquest campaign, we want offline conversion import. Arcan's admin would need a "Mark as gclid-converted" button + a daily cron to upload. Out of scope for v1. Use the auto-tagging + UTM approach for now.
- **Meta pixel blocked by ad blockers:** ~30% of browsers block client-side pixel. The Meta Lead Form conversion tracking is server-side via the webhook, so it works regardless. The Meta Pixel is only for retargeting audience building — that audience will be ~30% smaller than expected. Acceptable.
