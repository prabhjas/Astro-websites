# 00 — Overview

## Goal

Move **evolutionmiddleast.com** from WordPress (Elementor, Rank Math, etc.) to a **static Astro** site that:

- Matches current design and URLs (SEO parity)
- Does **not** depend on PHP / WordPress at runtime
- Is maintainable going forward

## Strategy

**Ship a cleaned static HTML mirror in Astro first**, then progressively rebuild shared chrome and high-traffic pages into real Astro components.

This matches the Connect Group (`Desktop/astro`) Phase 1 pipeline.

## Live inventory

| Source | Count (approx.) |
|--------|-----------------|
| `page-sitemap.xml` | 24 pages |
| `post-sitemap.xml` | 59 posts |
| `local-sitemap.xml` | KML only (not mirrored as HTML) |

Refresh inventory + exports:

```bash
npm run import:sitemap:download
```

## Status

| Item | Status |
|------|--------|
| Astro scaffold | Done |
| Sitemap import pipeline | Done |
| Prepare / localize assets | Done |
| Rank Math–style robots/sitemaps | Done |
| Shared header/footer chrome | Done |
| Nav dropdowns (Elementor Pro chunk + fallbacks) | Done |
| Forms → lead store + Pipedrive | Done |
| Phone flags / IP country / dial-code fixes | Done |
| Dynamic blog + archive layout parity | Done |
| Internal operations dashboard | Done |
| Global GTM (runtime loader, all pages) | Done |
| Redirects (CSV + JSON import, middleware) | Done |
| DNS cutover | Not started |

Reusable checklist for the next site: [13-wp-astro-mirror-playbook.md](13-wp-astro-mirror-playbook.md).
