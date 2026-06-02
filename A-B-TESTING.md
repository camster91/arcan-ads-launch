# A/B Testing — Variant Rotation Rules

**The rule:** every ad must have at least one sibling variant running simultaneously. You can't optimize what you can't compare. Run all variants for 7 days minimum before judging.

---

## Why this exists

Most freelancers and small businesses make the mistake of running ONE ad per campaign. Then they have no idea if a different image / headline / CTA would have done better. They scale the wrong winner, or kill the wrong loser.

The cost of running 3 variants vs. 1 is tiny (~$15/day extra) but the information value is enormous. After 30 days you have 90 ad-days of data, not 30.

---

## Per-campaign variant matrix

### Campaign 1 — Single Room Refresh
- **Ad 1A** (control): Trust hero — `PXL_20260213_211346296_thumb.webp`, headline "GTA Painters — 5.0★ Google", CTA "Get Free Quote"
- **Ad 1B** (image variant): Room result — `PXL_20250217_224338011_MP_thumb.webp`, headline "Refresh One Room — From $499", CTA "Get Quote"
- **Ad 1C** (format variant): Carousel — 3 rooms, headline "Single room or whole house", CTA "Get Quote"

**Variables tested:** image (people vs. room), price anchor (yes vs. no), format (single image vs. carousel)

### Campaign 2 — RE Pre-Listing
- **Ad 2A** (control): Carousel with 3 before/after pairs
- **Ad 2B** (format variant): Text-only testimonial on amber background

**Variables tested:** visual (3 images vs. none), social proof (visual proof vs. quote proof)

### Campaign 3 — Retargeting
- **Ad 3A** (control): Video, mural scene
- **Ad 3B** (image variant): Single image, painter at work

**Variables tested:** format (video vs. image). Video typically gets 2-3x higher engagement on retargeting.

### Campaign 4 — Family Story
- **Ad 4A** (control): Family hero single image
- **Ad 4B** (format variant): Family + work carousel

**Variables tested:** single image vs. carousel for emotional story

### Campaign 5 — Before/After Trust
- **Ad 5A** (control): 3 before/after pairs
- **Ad 5B** (when you have more assets): 5 before/after pairs (longer carousel)

**Variables tested:** carousel length. 3-5 cards is the sweet spot for home services.

### Campaign 6 — Google Brand Conquest
- **RSA only** (Google auto-rotates 15 headlines × 4 descriptions). No manual A/B.

---

## Rotation rules

### Rule 1: Run all variants in parallel
- Don't sequentially test ("week 1 = 1A, week 2 = 1B"). You waste half the test time.
- Spend should be roughly equal per variant (Meta's "Advantage+ Campaign Budget" handles this, or set equal ad-set budgets).

### Rule 2: Wait 7 days before judging
- Meta's learning phase needs ~50 conversions per ad set per week to optimize
- A 3-day test has too much noise (weekend vs. weekday, weather, news cycle)
- Set a calendar reminder: "Day 8 — first A/B decision"

### Rule 3: Kill at >2x control CPL
- Calculate the "control CPL" = the variant with the lowest CPL that has 30+ conversions
- Any variant with CPL > 2x the control AND < 30 conversions → pause
- Exception: keep the variant if it has a higher avg job value (need to track in Arcan admin)

### Rule 4: Don't touch during the test
- Once a test is running, don't change bids, budgets, targeting, or creative mid-flight
- If you must change something, document it and re-set the 7-day clock
- Meta's algorithm penalizes frequent changes

### Rule 5: Statistical significance matters
- 30 conversions per variant is the minimum for confidence
- 50+ is better
- Below 30, you can see "winner" that's actually noise
- Use a free calculator: https://www.optimizely.com/sample-size/ (or similar)

### Rule 6: Document every test
- Add to `A/B-TEST-RESULTS.md` (create if doesn't exist)
- Columns: Date, Campaign, Variant, Impressions, Clicks, CTR, Leads, CPL, Result (winner/loser/inconclusive), Next step
- After 90 days you'll have 30+ documented tests. That's the foundation of an actual optimization practice.

---

## When to introduce new variants

### Add a new variant when:
- Current winner has > 100 conversions (proven, not lucky)
- You're getting < 0.5% CTR (something is broken or boring)
- A new image/angle becomes available (new job photo, new customer testimonial)
- Competitor launches a new ad angle (see COMPETITIVE-MONITORING.md)

### Replace a variant when:
- > 14 days and < 30 conversions (not enough signal)
- CPL > 3x control (clear loser, no ambiguity)
- Ad has been rejected by Meta 3+ times (compliance issue, not worth fighting)

### Don't replace a variant when:
- It's only been 7 days (Rule 2)
- The variant is just underperforming, not failing (give it time)
- You're bored with it (subjective ≠ data)

---

## Creative refresh cadence (kill schedule)

Every ad creative has a shelf life in this category:
- **Week 1-2:** New creative, learning phase
- **Week 3-4:** Mature, optimizing
- **Week 5-8:** Plateau, CTR starts declining
- **Week 9+:** Fatigue, frequency > 2.5, CTR drops 20%+

**Rule:** Refresh top-of-funnel creative (Campaigns 1, 2, 4) every 30 days. Refresh retargeting (Campaign 3) every 60 days. Brand conquest (Campaign 6) every 90 days.

When you refresh, don't replace — **add**. Run the old creative at 50% budget and the new at 50% for 7 days, then declare a winner.

---

## Advanced: sequential testing vs. parallel

**Parallel testing (default):** run 2-3 variants at once, all get equal budget. Faster results. Higher total spend during test.

**Sequential testing (use when):** budget is too tight to run 3 variants in parallel (e.g., < $10/day total). Test one variant per week. Slow but you can't afford parallel.

For Arcan at $65-90/day across 6 campaigns, parallel testing is fine for all primary ads.

---

## Common A/B testing mistakes

1. **Calling a winner too early** — 1-day test is meaningless. 7 days minimum.
2. **Changing too many things at once** — image + headline + CTA + targeting = 4 changes. You don't know which one moved the needle.
3. **Ignoring statistical significance** — 5 conversions vs. 6 conversions isn't a winner.
4. **Killing the variant that "looks ugly" subjectively** — let the data decide.
5. **Not documenting results** — same mistake in 60 days, different ad.
6. **Testing on a small audience** — 1,000 impressions is too few. Need 10,000+ per variant for any signal.
7. **Stopping the test when you see what you want** — this is biased. Set the 7-day timer, walk away.
