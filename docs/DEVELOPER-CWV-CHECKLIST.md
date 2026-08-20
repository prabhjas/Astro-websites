# Developer CWV checklist

**When:** Before merging P0 page work (homepage + top landings + booking/forms).  
**Targets:** LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 (mobile, field or lab).

Linked: [connectgroup 09-pagespeed](../Astro-production/connectgroup.co/docs/09-pagespeed-core-web-vitals.md) · [10-GO-LIVE-VERIFY](10-GO-LIVE-VERIFY-CHECKLIST.md)

---

## Before merge (tick all that apply)

### LCP

- [ ] Identify the LCP element on mobile (hero image or H1 block)
- [ ] LCP image has explicit `width` and `height` (or reserved aspect-ratio box)
- [ ] LCP image is modern format (WebP/AVIF) and reasonably sized (&lt; ~200 KB where feasible)
- [ ] `<link rel="preload" as="image" href="…" fetchpriority="high">` matches the **actual** LCP asset (not a background-only image)
- [ ] Above-fold logo / header mark is **not** `loading="lazy"`
- [ ] No blocking WP Rocket `RocketLazyLoadScripts` bootstrap in `<head>` (strip at serve/prepare)

### CLS

- [ ] Images, embeds, and icons have dimensions or fixed layout slots
- [ ] Fonts use `display=swap` (or self-hosted woff2 with `font-display: swap`)
- [ ] No late-injected banners/widgets above existing content without reserved height
- [ ] Embedded widgets (forms, sliders) have min-height or skeleton where layout shifts

### INP / TBT

- [ ] No new synchronous third-party scripts without SEO/perf sign-off
- [ ] GTM via `/runtime-gtm.js` only — no pasted gtag/GTM blocks in mirror HTML
- [ ] Page JS deferred (`defer` / `type="module"`) unless truly required in head
- [ ] WP Rocket / Elementor preload helpers stripped when Astro serves the page
- [ ] Heavy widgets below fold lazy-loaded (booking wizard on marketing pages, sliders, etc.)

### Fonts

- [ ] Subset weights actually used (avoid 100–900 Google Fonts dump)
- [ ] Prefer self-hosted woff2 under `/fonts/` for fleet consistency (optional P1)
- [ ] `preconnect` to `fonts.gstatic.com` only when still using Google Fonts

### Assets & caching

- [ ] Hashed static assets long-cached; HTML short-cache or CDN purge on deploy
- [ ] After CSS/JS changes: sync `public/` → `dist/client/` (or full `pnpm build`)

---

## Verify (pick one)

| Tool | Command / URL |
|------|----------------|
| PageSpeed Insights | https://pagespeed.web.dev/ — mobile + URL |
| Lighthouse CLI | `npx lighthouse <url> --preset=perf --form-factor=mobile` |
| Chrome DevTools | Performance → mobile throttle → LCP / layout shift markers |

Record baseline + after scores in the PR or site `docs/` signoff note.

---

## Phase honesty (WP mirror sites)

Phase 1 Elementor mirrors still load many CSS/JS files. Do **not** promise 95+ Lighthouse until sections are rebuilt in Astro. Fixes above are the **allowed** mirror-layer wins without a full redesign.

---

## Site-specific notes

| Site | P0 URLs | CWV module / notes |
|------|---------|-------------------|
| movey.ae | `/`, `/house-movers-in-dubai/`, `/booking/` | `src/lib/cwv-mirror.js` + fleet `sanitizeMirrorHtml` |

Add rows as other sites implement CWV helpers.
