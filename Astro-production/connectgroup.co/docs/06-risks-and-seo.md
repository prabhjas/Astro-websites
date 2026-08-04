# 06 — Risks and SEO

---

## SEO parity checklist

Rank Math already provides strong on-page SEO in the homepage dump. Preserve or recreate:

- [ ] Exact URL paths (prefer no path changes)
- [ ] `<title>` and meta description
- [ ] Canonical URL
- [ ] Open Graph / Twitter tags
- [ ] JSON-LD (`Organization`, `WebSite`, `WebPage`, etc.)
- [ ] `robots` directives
- [ ] Favicons / apple-touch-icon
- [ ] Image `alt` text from Elementor content
- [ ] Internal linking structure (mega menu)

Set `site: 'https://connectgroup.co'` in `astro.config.mjs` for correct absolute URLs in sitemaps.

---

## Redirects

| Situation | Action |
|-----------|--------|
| Path unchanged | No redirect needed |
| Trailing slash differences | Normalize in host config to match WP |
| Removed pages | 301 to closest equivalent or homepage |
| WWW / HTTPS | Keep current canonical host |

Export redirect plugins (if any) from WordPress before cutover.

---

## Risks register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Elementor CSS tied to HTML IDs | Layout breaks if markup edited | Keep Elementor HTML until Phase 4 |
| Large number of landings | Long Phase 1 | Prioritize by traffic; mirror long-tail |
| Lead forms → Pipedrive | Lost conversions | Rebuild form before DNS; E2E test |
| URL / meta changes | Ranking drop | Path parity + meta port + Search Console |
| WP edits during migration | Stale static pages | Content freeze or re-export before launch |
| Asset still on WP host | Outage if WP dies | Localize all assets to Astro `public/` |
| Heavy Elementor JS | Poor Lighthouse | Accept in Phase 1; rebuild in Phase 4 |
| Missing page in crawl | 404 after cutover | Phase 0 sitemap inventory + crawl QA |

---

## Content freeze

Before final export for cutover:

1. Announce freeze window to content editors
2. Re-export P0 pages
3. Re-run localize + build
4. Staging QA sign-off
5. DNS cutover
6. Keep WP read-only for emergency rollback (optional 1–2 weeks)

---

## Rollback plan

| Approach | When |
|----------|------|
| DNS back to WordPress | Critical production failure |
| Keep WP host warm (billing continues) | First 1–2 weeks post-cutover |
| Feature flags / staging hostname | Prefers testing before DNS |

---

## Success metrics (post-launch)

- Core Web Vitals equal or better than WP
- Organic landing pages: no major indexed URL loss
- Form conversion rate within expected range
- 404 rate low vs Phase 0 inventory

---

## Next document

→ [07-first-sprint.md](07-first-sprint.md)
