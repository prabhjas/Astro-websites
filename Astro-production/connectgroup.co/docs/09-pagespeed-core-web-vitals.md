# 09 — PageSpeed & Core Web Vitals

How performance is managed in the WordPress → Astro migration.

---

## Goal

After cutover, public pages should meet **good** Core Web Vitals on mobile for P0 URLs (homepage + top landings), without depending on WP Rocket as a crutch.

| Metric | Good threshold (Google) | Our focus |
|--------|-------------------------|-----------|
| **LCP** | ≤ 2.5s | Hero image + server/CDN TTFB |
| **INP** | ≤ 200ms | Less JS (kill Elementor/jQuery stack) |
| **CLS** | ≤ 0.1 | Image dimensions, font stability |

---

## Why Astro helps

1. **Static HTML** — no PHP, MySQL, or WordPress plugins on the request.
2. **CDN-friendly** — `dist/` ships to Cloudflare/Netlify/Vercel edge.
3. **Selective JS** — islands only where interaction is needed.
4. **Asset pipeline** — compress/resize images at build (Phase 4).

Phase 1 (Elementor HTML mirror) improves **TTFB** mainly. Full Lighthouse wins come in **Phase 4 rebuild**.

---

## Phase plan (performance)

| Phase | Action | CWV effect |
|-------|--------|------------|
| 1 | Mirror HTML, localize assets, static host | Faster TTFB; LCP/INP still heavy |
| 2 | Replace CF7 / Instagram / plugin scripts | Fewer blocking third parties → INP |
| 3 | Shared Header/Footer | Shared, smaller chrome assets |
| 4 | Rebuild sections in Astro; drop Elementor CSS/JS | **Primary LCP/INP/CLS gains** |
| 5 | CDN + caching headers | Global latency |

---

## Operating model for the team

### Before merge (P0 pages)

- [ ] Lighthouse mobile on staging (or PageSpeed Insights)
- [ ] No regression vs previous staging build on LCP/INP/CLS
- [ ] Images have width/height (or Astro Image)
- [ ] No new sync third-party scripts without SEO/perf sign-off

### Tools

| Tool | Use |
|------|-----|
| PageSpeed Insights / CrUX | Field + lab for live URLs |
| Lighthouse CI (optional later) | PR gates |
| WebPageTest | Deep network waterfalls |
| Chrome Performance panel | Debug INP |

### Budgets (suggested starting targets after Phase 4)

| Budget | Target |
|--------|--------|
| JS (homepage) | &lt; 150 KB gzipped total |
| CSS (homepage) | &lt; 80 KB gzipped |
| LCP image | &lt; 200 KB, modern format |
| Third-party tags | Deferred / consented |

Tune after first rebuild baseline.

---

## Concrete techniques in Astro

1. **Images** — `astro:assets` or pre-optimized WebP/AVIF in `public/`; preload LCP image.
2. **Fonts** — self-host; `font-display: swap`; subset if possible.
3. **JS** — default none; `client:visible` / `client:idle` for carousels/menus.
4. **CSS** — component-scoped styles; delete unused Elementor rules when rebuilding.
5. **HTML** — semantic landmarks; avoid giant inline style blocks from Elementor over time.
6. **Caching** — long-cache hashed assets; HTML short or CDN purge on deploy.
7. **Third parties** — GTM once; audit Leadfeeder / ZoomInfo / Instagram.

---

## Phase 1 honesty (for demos)

The mirrored homepage still loads Elementor + theme + plugin CSS/JS. Do **not** promise a 95 Lighthouse on that dump.

Demo narrative:

1. WordPress today → plugin/theme cost on every request.
2. Astro mirror → same look, static files, better TTFB.
3. Rebuild → lean markup + SEO YAML → lasting CWV scores.

Demo page: `/demo/performance/`

---

## Related

- [08-seo-strategy.md](08-seo-strategy.md)
- [02-migration-phases.md](02-migration-phases.md)
- [06-risks-and-seo.md](06-risks-and-seo.md)
