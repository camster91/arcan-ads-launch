# Image Upscaling Pipeline

**Problem:** Arcan's public gallery images are 400-533px WebP thumbnails. Meta requires 1080px+. Google Display prefers 1200px+. You need production-quality images.

**Solution:** 3 options ranked by quality, time, and cost.

---

## Option 1: Ask Gerardo for originals (BEST, 5 min)

Gerardo has the full-res originals on his phone and in Arcan's cloud storage. The WebP thumbnails on arcanpainting.ca are heavily compressed for web delivery — the originals are 4K+ photos from modern smartphones.

**How to ask:**
- Send Gerardo a list of 13 filenames (provided in `MANIFEST.json`)
- Ask him to AirDrop / Google Drive share the originals
- Drop them into `ads-assets/full-res/` folder
- Skip everything below — use the originals

**This is the option to try first.** It costs nothing and gives you the highest quality assets.

If Gerardo doesn't have them organized (likely, since most people don't), use Option 2.

---

## Option 2: Topaz Gigapixel AI (RECOMMENDED, 30 min for 13 images)

**What:** AI-powered image upscaler. Takes a 400px image and produces a 4x upscale (1600px) with no quality loss. Adds detail that wasn't visible in the original.

**Cost:** $99 one-time, no subscription. Mac and Windows.

**Download:** https://www.topazlabs.com/gigapixel-ai

**How to upscale 13 images:**

1. Install Topaz Gigapixel AI
2. Launch → "Open" → select all 13 files in `ads-assets/`
3. Settings:
   - **Scale:** 4x (400px → 1600px)
   - **Model:** "High Fidelity" (best for photos)
   - **Output format:** PNG (lossless) or high-quality JPG (90% quality)
   - **Output size:** "Fit" → "Width: 1600px" or "Original × 4"
4. Click "Start" → wait ~3-5 min for 13 images
5. Output goes to a folder of your choice

**Rename and organize (output paths — files don't exist until you run Topaz):**
- Topaz output: `IMG-20260212-WA0016_4x.png` → move to `ads-assets/single-room/IMG-20260212-WA0016_4x.png`
- Repeat for all 13
- Source thumbnails stay where they are (at `ads-assets/{folder}/*_thumb.webp`)

**Result:** 13 production-quality 1600px+ images, ready for ad upload. Total time: 30-45 min including Topaz rendering.

**Note on file paths in this doc:** paths like `ads-assets/single-room/IMG-20260212-WA0016_4x.png` and `ads-assets/{folder}/*_thumb.webp` are TEMPLATE PATHS showing where the upscaled output goes. They don't exist yet — they'll be created when Topaz runs.

**Why this is best:** $99 one-time, used for every future Arcan project. Pays for itself in the first month of ad spend saved on photographer time.

---

## Option 3: Real-ESRGAN (free, 60 min, command-line)

**What:** Open-source AI upscaler. Similar quality to Topaz, no cost. Requires command-line comfort.

**Cost:** Free

**Requirements:** Mac with Homebrew, ~5GB disk for models

**How to upscale 13 images:**

1. Install Real-ESRGAN:
   ```bash
   # Install Python deps
   pip install realesrgan
   # Or use the standalone Mac app
   brew install realesrgan
   ```

2. Run on all 13 images:
   ```bash
   cd /Users/biancabienaime/projects/arcan-ads-launch/ads-assets
   for f in single-room/*.webp re-listing/*.webp retargeting/*.webp brand/*.webp; do
     realesrgan -i "$f" -o "${f%.webp}_4x.png" -s 4 -n realesrgan-x4plus
   done
   ```

3. Wait ~10 min for 13 images

**Result:** Same quality as Topaz, free, takes 2x as long.

**Caveat:** WebP input support is iffy. Convert WebP → PNG first:
```bash
for f in single-room/*.webp re-listing/*.webp retargeting/*.webp brand/*.webp; do
  sips -s format png "$f" --out "${f%.webp}_source.png"
done
```

Then run Real-ESRGAN on the PNGs.

---

## Option 4: Adobe Photoshop "Preserve Details 2.0" (if you have PS)

**What:** Built-in Photoshop upscale.

**Cost:** PS subscription required ($23/mo).

**How to upscale 13 images:**

1. Open image in Photoshop
2. Image → Image Size
3. Set new width to 1600px (4x of 400px)
4. Resample: "Preserve Details 2.0"
5. Reduce noise: 20-40%
6. Sharpen: 80-100%
7. Export As → PNG or JPG (90%)
8. Repeat × 13

**Time:** 3-5 min per image = 45-65 min for 13.

**Quality:** Slightly worse than Topaz / Real-ESRGAN but adequate.

---

## What NOT to use

### Online upscalers (Let's Enhance, Bigjpg, etc.)
- Quality ceiling is too low for production ads
- Free tiers are tiny (5-10 images)
- Paid tiers ($10-20/mo) cost more than Topaz one-time over a year
- Privacy concern: you're uploading Arcan's customer photos to a third-party server

### Browser-based AI tools (Claid, Pixelcut, etc.)
- Same issues as above
- Plus, they're not specialized for photo upscaling — they're general "AI enhance" tools

### Just use the 400px images anyway
- Meta will reject them or render them blurry
- Don't do this

---

## After upscaling: text overlay

Once you have 1080px+ images, add the text overlay in Canva:

1. Open Canva → "Create design" → "Custom size" → 1080x1080
2. Upload the upscaled image
3. Drag to fill the canvas
4. Add text overlay (per AD-CREATIVE.md):
   - Top-right: badge with "WSIB" or "2-Yr Warranty" (white background, amber text, rounded)
   - Bottom-right: CTA button "Get Free Quote" (amber background, white text, rounded)
5. Download as PNG
6. Repeat for each ad variant

**Canva templates to use:**
- Search "real estate Instagram post" — closest template aesthetic
- Or "Facebook ad" — has the right aspect ratio

**Time:** 5 min per ad × ~10 ads = 50 min for all text overlays.

---

## Before/After pairs (Campaign 5)

For before/after pairs, you need:
- "Before" photos: taken on every new Arcan job (production requirement, see LAUNCH-PLAYBOOK.md Day 4)
- "After" photos: existing gallery, upscaled as above

**For week 1, use the "during" thumbnails as the "before":**
- These are the same job in progress — drop cloths, ladders, partial paint
- Pair with the corresponding "after" from the same job
- Not as strong as a true "before" but shippable

**For month 2+, build the proper library:**
- Photo checklist for every job (see LAUNCH-PLAYBOOK.md)
- Use SmartAlbums or Google Photos auto-share with Gerardo's crew
- Standardize: 3 photos of each room, before any prep work

---

## Image checklist before launch

For every ad creative:
- [ ] Source image: 1600px+ (after Topaz or originals)
- [ ] Text overlay: badge + CTA button
- [ ] Aspect ratio: 1:1 (feed) or 9:16 (Stories)
- [ ] File size: under 30 MB (Meta's max)
- [ ] Color profile: sRGB
- [ ] No copyrighted logos visible (Benjamin Moore, Sherwin-Williams are OK — they're on the painter's shirt, fair use)
- [ ] No recognizable customer faces without model release (the family photo needs explicit consent)
- [ ] Filename matches `arc-c{n}a-{name}-{aspect}.jpg` convention

---

## File management

After upscaling, organize:
```
ads-assets/
  full-res/                          # Master files, 1600px+
    single-room/
      IMG-20260212-WA0016_4x.png
      PXL_20250217_224338011_MP_4x.png
      ...
    re-listing/
      ...
    retargeting/
      ...
    brand/
      canabate-family.jpg            # already full-res
      ...
  single-room/                       # Original WebP thumbnails (keep for reference)
  re-listing/
  retargeting/
  brand/
  ads/                               # Final ad creatives (with text overlay)
    c1a-single-room-feed-1080.png
    c1a-single-room-stories-1080x1920.png
    c2a-re-listing-carousel-1.png
    c2a-re-listing-carousel-2.png
    ...
```

`full-res/` is the source. `ads/` is what you upload to Meta Ads Manager.

---

## The $99 question

**Is Topaz Gigapixel worth $99?**

For Arcan's situation:
- 13 images × $99 ÷ 13 = $7.60 per upscaled image
- Vs. hiring a photographer for a half-day: $400-800
- Vs. AI generation: free, but unusable for trust signals
- Vs. stock photos: $5-30 per image, lower trust

**Yes, $99 pays for itself in week 1.** It's a one-time purchase, not a subscription. Use it for every future Arcan project photo.

If $99 is a blocker, use Real-ESRGAN (free, 60 min). Quality is 95% as good.

**If neither works:** use the 400px images, but understand the ads will look amateur and Meta may reject them. Better to delay launch than ship bad creative.
