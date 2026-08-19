# Developer Core Web Vitals & Performance Checklist

Every page or site change **must** pass these checks before publishing.
Aaron's speed passes (1–8) established the baseline; new work must not regress it.

---

## Pre-Publish Checklist

### 1. LCP (Largest Contentful Paint)

- [ ] **Preload the hero/LCP image.** Add `<link rel="preload" as="image" href="…">` in `<head>` for the above-the-fold hero image or background.
- [ ] **Use `fetchpriority="high"`** on the LCP `<img>` element.
- [ ] **Do NOT lazy-load the LCP image.** Remove `loading="lazy"` from hero/banner images.
- [ ] **Serve images in WebP/AVIF** where possible, with correct `width`/`height` attributes.
- [ ] **Add a `poster` attribute** to hero `<video>` elements so the first frame renders immediately.

### 2. Fonts & Text Visibility

- [ ] **`font-display: swap`** on all `@font-face` declarations — keep text visible during font load.
- [ ] **Trim Google Fonts requests** to only the weights/styles actually used on the page. Remove stale preloads for fonts no longer referenced.
- [ ] **Preconnect to font origins** early: `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
- [ ] **Self-host fonts** when feasible (eliminates third-party round-trips).

### 3. JavaScript Loading

- [ ] **Defer third-party scripts.** jQuery, analytics, chat widgets, etc. must use `defer` or `async`. Never render-block with synchronous `<script src="…">`.
- [ ] **Self-host vendor assets** (Bootstrap, Font Awesome, jQuery, owl-carousel, intl-tel-input) instead of loading from CDNs — reduces DNS lookups and connection overhead.
- [ ] **No inline `<script>` in `<head>`** unless absolutely required for critical rendering.

### 4. CSS Loading

- [ ] **Inline critical CSS** or preload it. Large CSS files should not block first paint.
- [ ] **Remove unused CSS** — don't ship entire frameworks if only a fraction is used.
- [ ] **No stale preloads** — if a `<link rel="preload">` points to a resource no longer used, remove it.

### 5. General

- [ ] **No duplicate images** — check for WordPress `<noscript><img></noscript>` artifacts in blog content HTML. Strip `<noscript>` blocks during content export/import.
- [ ] **Set explicit `width` and `height`** on all images to prevent layout shift (CLS).
- [ ] **Test with Lighthouse** (Performance tab) — target 90+ on mobile for all key pages (homepage, top service pages, blog index).
- [ ] **Check the Network waterfall** — the LCP resource should start loading in the first 2–3 requests, not after a chain of CSS→JS→font requests.

---

## Aaron's Speed Passes — Reference

These are the optimizations already applied. **Do not revert them.** If you touch these sites/files, ensure the optimizations remain.

| Pass | Sites | What was done |
|------|-------|---------------|
| 1 | **connecthr.ae**, **iberiaeor.com** | `font-display: swap` for General Sans; removed stale Nunito preload |
| 2 | **connectstaff.ae** (234 pages) | Deferred third-party jQuery load across all legacy pages |
| 3 | **kinzahr.com** (156 pages) | Added `preconnect` for Google Fonts origins on all legacy pages |
| 4 | **connectfreelance.ae**, **connectresources.sa** | Preloaded LCP hero image on homepages |
| 5 | **connectresources.ae** | Trimmed Google Fonts request to only rendered faces |
| 6 | **cbss.ae** | Self-hosted all vendor assets (Bootstrap, FA, jQuery, owl-carousel, intl-tel-input); added hero video `poster` |
| 7 | **spheavyrental.ae**, **c-uae.com** | Preloaded hero background images on homepages; dropped stale Nunito preload on C-UAE |
| 8 | **kinzahr.com** (156 pages) | Full `defer` conversion on all legacy page scripts |

### Sites with speed passes applied (alphabetical)

1. c-uae.com
2. cbss.ae
3. connectfreelance.ae
4. connecthr.ae
5. connectresources.ae
6. connectresources.sa
7. connectstaff.ae
8. iberiaeor.com
9. kinzahr.com
10. spheavyrental.ae

---

## How to Apply to New/Updated Pages

When creating or editing a page on **any** site:

1. Open the page in Chrome DevTools → Lighthouse → Performance (Mobile).
2. Check the LCP element — is it preloaded? Does it have `fetchpriority="high"`?
3. Check the waterfall — are scripts deferred? Are fonts preconnected?
4. If the site is in the speed-pass list above, match the existing pattern (check neighboring pages).
5. Run `astro check` and `astro build` — no regressions.

This checklist applies to **all 42 fleet sites**. Any developer PR that touches page templates, layouts, or `<head>` content should verify these items.
