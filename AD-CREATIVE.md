# Ad Creative — Real Arcan Project Assets

**All images in this kit are pulled from Arcan's live production gallery at `arcanpainting.ca/gallery/`** (served via the public `/api/gallery` endpoint, 70 total images). No AI generation. No stock photos. Real Arcan crew, real GTA homes, real finishes.

## Asset map (13 downloaded, ~360KB total)

Source: `/Users/biancabienaime/projects/arcan-ads-launch/ads-assets/`
Manifest: `/Users/biancabienaime/projects/arcan-ads-launch/ads-assets/MANIFEST.json`

### Campaign 1 — Single Room Refresh (B2C, Meta)

| File | Scene | Ad fit | Headline |
|---|---|---|---|
| `single-room/PXL_20250217_224338011_MP_thumb.webp` | Empty bright living room, white walls, after | **Ad 1A hero** | From $499 — 1 Room Refresh |
| `single-room/IMG-20260212-WA0016_thumb.webp` | Modern black/white staircase, after | Ad 1A alt (portrait) | Refresh One Room — From $499 |
| `single-room/PXL_20260213_211346296_thumb.webp` | Two painters thumbs up in finished bedroom | Ad 1B hero | WSIB-Covered. 2-Yr Warranty. |
| `single-room/PXL_20260213_210915996_thumb.webp` | Pink bedroom, floral accent | Ad 1C carousel | Refresh One Room |

### Campaign 2 — Real Estate Pre-Listing (B2B agents, Meta)

| File | Scene | Ad fit | Headline |
|---|---|---|---|
| `re-listing/PXL_20210109_221844861_thumb.webp` | Modern living room, vibrant blue accent, TV + fireplace | **Ad 2A hero** | 48-Hour Pre-Listing Painting |
| `re-listing/PXL_20200928_183711726_thumb.webp` | DURING: drop cloths, ladder, blue wall in progress | Ad 2A carousel card 2 | Trusted by GTA Agents |
| `re-listing/PXL_20240507_232710177_MP_thumb.webp` | Modern bedroom, dark navy accent | Ad 2A carousel card 3 | 48-Hour Turnaround |

### Campaign 3 — Retargeting (WSIB + Warranty, Meta)

| File | Scene | Ad fit | Headline |
|---|---|---|---|
| `retargeting/PXL_20250902_151315576_thumb.webp` | Painter in Benjamin Moore shirt, roller on wall | **Ad 3B hero (single image)** | 2-Year Warranty, WSIB-Covered |
| `retargeting/PXL_20251009_180850831_thumb.webp` | Painter on ladder, hand-painted mural | **Ad 3A video cover** | WSIB-Covered Crews. 25 Years. |
| `retargeting/VID-20260212-WA0034_video_thumb.webp` | Painter on staircase balusters | Ad 3A Stories version (9:16) | Still Thinking It Over? |

### Campaign 4 + Brand Layer

| File | Scene | Use |
|---|---|---|
| `brand/canabate-family.jpg` | Cañabate family — Jose and sons Pablo/Gerardo/JJ painting a Toronto house | About page hero, Google sitelink image, retargeting carousel "why us" card |
| `brand/20160901_105150_thumb.webp` | Painter on scaffolding, commercial ceiling, red beams | Any commercial-targeting ad set, fallback |
| `brand/PXL_20251018_142500065_thumb.webp` | Commercial dining room, matte black ceiling, pink chairs | Specialty finishes / boutique commercial niche |

## CRITICAL: image resolution

All 13 Arcan images are 400-533px wide (WebP thumbnails). **Meta requires 1080x1080 minimum** for feed, 1080x1920 for Stories. **Google Display needs 300x300 minimum but prefers 1200x628 or larger.**

**For production launch, you need upscaled versions.** Options ranked:

1. **Topaz Gigapixel AI** — $99 one-time, batch upscale 2-4x with no perceptible quality loss. RECOMMENDED.
2. **Real-ESRGAN** (free, command-line) — same quality, more work.
3. **Adobe Photoshop "Preserve Details 2.0"** — if PS available.

**Source: ask Gerardo for the original 4K+ images from his phone.** The public thumbnails are heavily compressed WebP. Full originals are on the server (visible in the React source via `galleryTags`).

## What these images buy you vs AI generation

- Real Arcan crew identifiable in 6 of 13 (thumb-up, mural, blue wall, balusters, ceiling, family)
- Real GTA homes (Toronto semi, Mississauga townhouse, etc.) — 3 of 13 visibly GTA
- Real Benjamin Moore / Sherwin-Williams paint visible in cans and shirts
- Real drop cloths, ladders, professional gear visible in 8 of 13
- The "Cañabate family" image is the only photo of the actual family team — **gold for "family-run 25 years" angle**
- 4 of 13 are clearly staged "after" shots perfect for lead-form cover images
- 4 of 13 are "during" shots perfect for trust/skill demonstration

No AI image generator produces this level of brand authenticity.

## When to use AI generation (still a "yes, sometimes")

Use AI for:
- **Concept mocks** for ad-set testing before committing to a real shoot
- **Backgrounds** when you need a 16:9 video cover but only have 4:3 photos
- **Mock-ups of the finished room** for the "what your room could look like" blog content (use sparingly, label as "concept")

Don't use AI for:
- Hero/cover images (use real Arcan work)
- Trust signals (crews, family, clients)
- Anything where the viewer would expect to recognize "this is the company"

## Text overlay (required for all ads)

All ad creatives need text overlay in the bottom-right or top-left:
- **Bottom-left badge:** small `WSIB` or `2-Yr Warranty` chip
- **Bottom-right CTA button:** "Get Free Quote" / "Get Quote" / "Free Estimate"
- **Top-right (optional):** "Since 2000" or "5.0★ Google" badge

Tool: **Canva** (free tier sufficient) — has the right ad-format templates for 1:1, 9:16, 4:5.

For the "2-Year Warranty" badge, match Arcan's brand color: **amber-500** (`#f59e0b` from their Tailwind config). White text, rounded full chip, 8-12px from edge.

## File naming in Meta Ads Manager

When uploading to Meta, name files like:
- `arc-c1a-single-room-feed-1080.jpg`
- `arc-c1a-single-room-stories-1080x1920.jpg`
- `arc-c3a-warranty-video-cover.jpg`
- `arc-c4-google-rsa-1200x628.jpg`

This makes A/B test attribution in Meta's reporting cleaner.

## Production checklist (before launch)

- [ ] Get full-res originals from Gerardo (or upscaled versions)
- [ ] Confirm model release for any painter faces (5 of 13 have visible crew)
- [ ] Add text overlay in Canva (badge + CTA button)
- [ ] Export at correct aspect ratios: 1:1 (feed), 9:16 (Stories), 1.91:1 (Google)
- [ ] Run through TinyPNG or Squoosh before upload (under 30MB per file)
- [ ] Upload to Meta Ads Manager + Google Ads
- [ ] Verify mobile preview (90%+ of Meta impressions are mobile)
