# Re-Engagement Email — 500+ Past Arcan Clients

**Why this matters more than Meta ads:** Past clients are 3-5x more likely to book than cold leads. A "we miss you, here's $50 off" email to 500 people will produce more closed jobs than $500 of Meta ad spend. The cost is ~$0 (just the email send time) and the upside is significant.

**The math:** If 20% of the 500 open the email (100 people), 5% click (5 people), 20% of those book (1 job) — that's 1 closed job for ~30 min of work. Repeat 4x/year = 4 jobs. At Arcan's avg job size ($5K), that's $20K in revenue.

If 5% rebook (25 people), 50% book an estimate (12), 50% close (6 jobs × $5K) = **$30K from one email send**. Even at the conservative estimate, this is the highest-ROI action in the entire kit.

---

## The 4-email sequence (over 30 days)

### Email 1 — Day 0: "We miss you"

**Subject:** It's been a while — here's $50 off your next paint project

**Body:**
```
Hi {{first_name}},

It's been about {{months_since_last_job}} since we painted your home, and
we wanted to say thanks for trusting Arcan with the job.

If you've been thinking about a refresh — a new accent wall, the exterior
fading, the kid's room they finally left for college — we have some June
availability and we'd love to help.

As a thank you, here's $50 off any paint project over $1,000. Just mention
this email when you book.

Reply to this email or call (416) 727-2148. Free estimate, no obligation.

Jose + the Cañabate family
Arcan Painting
arcanpainting.ca | (416) 727-2148
```

**Why this works:**
- Subject line has a real number ($50 off) — emails with numbers in the subject have 20%+ higher open rates
- "We miss you" personalizes without being pushy
- Specific call-to-action (mention this email)
- Family signature differentiates from corporate chains

### Email 2 — Day 7: Recent project photos

**Subject:** Recent project we loved working on (inside: photos)

**Body:**
```
Hi {{first_name}},

Sharing some recent work we loved. This is a 3-bedroom interior we just
finished in Mississauga — same scope as what we did for you, but updated
colors. The before-and-afters speak for themselves.

[image: before/after side by side]
[image: detail of trim work]

If your home is starting to look like the "before," give us a call. We'd
love to give you the same refresh — and your $50 credit is still good.

(416) 727-2148

Jose + the Cañabate family
```

**Why this works:**
- Visual proof of current work
- Reminds them what Arcan does (people forget)
- "Same scope as what we did for you" makes it personal
- $50 credit reminder creates urgency

### Email 3 — Day 14: Family story + seasonal angle

**Subject:** 25 years, three sons, one promise

**Body:**
```
Hi {{first_name}},

Quick personal note. Arcan just passed 25 years painting GTA homes. My
dad Jose started the business in 2000, and now my brothers Pablo, JJ,
and I are on every job. Same family, same standards.

June is peak exterior season here — if your home's paint is starting to
look tired, it's the right time to think about it. We have a few spots
open in the next 2 weeks.

[image: family photo or a recent exterior job]

$50 off is still good for you. Reply or call (416) 727-2148.

Gerardo Cañabate
Arcan Painting
arcanpainting.ca
```

**Why this works:**
- Family story angle — no competitor can replicate this
- Gerardo's personal voice (it's HIS email, not "the Arcan team")
- Seasonal urgency (exterior season = real deadline)
- Soft CTA, not pushy

### Email 4 — Day 28: Last call

**Subject:** Last call — $50 off expires in 7 days

**Body:**
```
Hi {{first_name}},

Quick heads up — the $50 credit we sent you in our last few emails expires
on {{expiration_date}}. After that, it's back to standard pricing.

If you've been on the fence, this is the nudge. Reply to this email or
call (416) 727-2148 and we'll get a free estimate on the calendar.

Thanks for being part of the Arcan family.

Jose + the Cañabate family
Arcan Painting
```

**Why this works:**
- Deadline creates urgency (genuine, not fake)
- Short and direct — last email shouldn't be pushy
- "Arcan family" reinforces the brand
- "Reply to this email" is a low-friction CTA (vs. "click here to book")

---

## Implementation

### How to send

**Option A — Mailchimp (easiest, $13/month)**
1. Upload 500 contacts
2. Tag them all as "past_client"
3. Build the 4-email sequence as a "Customer Journey"
4. Schedule: send email 1 today, email 2 in 7 days, etc.
5. Track opens, clicks, replies

**Option B — Direct from Arcan's existing app**
- The app already has email-workflows engine. Add 4 new workflows:
  - trigger_event: `customer_reengagement_30d`
  - template_id: pointing to new "we_miss_you" email template
  - delay_hours: 0
- Run as a one-time batch (not on every lead)

**Option C — Gmail + merge tags (free, ugly)**
- Use a Google Sheet with 500 rows
- Compose in Gmail with "Mail Merge" extension
- Send one at a time (or 100 at a time via BCC)
- Track replies manually

**Recommendation:** Option A (Mailchimp). $13/month is nothing for the upside.

### How to get the 500 contacts

**Source 1: Arcan's CRM (`projects` table)**
- Every completed project has a client record with email
- Query: `SELECT DISTINCT email, name, phone, last_project_date FROM projects WHERE status = 'completed' AND created_at < NOW() - INTERVAL '6 months'`
- That's likely 200-400 emails

**Source 2: Google reviews**
- People who left reviews may have emails (if they have a Google account)
- Cross-reference with your CRM

**Source 3: Estimate form submitters who didn't book**
- The `leads` table has everyone who ever filled out the form
- Many of them got estimates, didn't book, and would book now with a $50 nudge
- Filter: `WHERE status IN ('lost', 'no_response') AND created_at < NOW() - INTERVAL '3 months'`
- Could be 200-500 more

**Source 4: Stripe / invoice data**
- If Arcan uses Stripe, every past invoice has an email
- Source: `SELECT email, name FROM stripe_invoices WHERE created_at < NOW() - INTERVAL '6 months'`

### How to personalize at scale

Even basic merge tags are worth the effort:
- `{{first_name}}` (not "Dear Customer")
- `{{months_since_last_job}}` (computed: "It's been about 14 months")
- `{{last_service_type}}` (interior vs exterior vs cabinets)

This makes the email feel like it was written to one person, not blasted to 500.

---

## What to measure

- **Open rate** (target: 25-35% for personalized "from a person" emails)
- **Click rate** (target: 3-5%)
- **Reply rate** (target: 2-4% — replies are gold)
- **Booked estimates** (target: 5-10 from 500 emails)
- **Closed jobs** (target: 2-5)
- **Revenue** (target: $10K-25K)

Report in `WEEKLY-NOTES.md` (the template has a Revenue section).

---

## What NOT to do

- Don't blast all 500 at once with no personalization — gets marked as spam
- Don't make the discount too big — $50 is enough; $500 teaches them to wait for discounts
- Don't use "Dear Valued Customer" or other corporate language
- Don't use a corporate sender name (info@arcanpainting.ca) — use Gerardo's actual name and email
- Don't include a giant footer with every service — keep the email focused on ONE offer
- Don't use a "from" address that's different from the "reply-to" — people notice
- Don't send more than 4 emails in 30 days — that's spam territory

---

## When to do this

- **Once per year, in the slow season** (October-February for painters)
- **Best months for this**: January ("new year new room") and September ("fall refresh before winter")
- **Avoid**: April-June (peak season, no need to discount) and December (holiday noise)

If you have a particularly slow week, run the sequence. Otherwise, batch it for Q1 and Q4.
