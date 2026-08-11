# Phase 02 — Convert / place (theuaegate.com)

**Date:** 2026-08-10  
**Port:** 5117  
**Peer:** connectbusinesscenter.com (FEATURES_FULL_CMS)  
**Status:** scaffolded in `fleet-sites.json` + `FLEET-PORT-REGISTRY.md`

## Done

- [x] Scaffold copied from CBC (no `node_modules` / `dist` / `.env` / peer `wp-content`)
- [x] Rebranded package `theuaegate-astro`, cms `siteId`, astro `allowedDomains`, deploy unit/Caddy
- [x] Local `.env` from example (gitignored)
- [x] `pnpm install --filter theuaegate-astro...`
- [x] Sitemap import (live index + page/post): **25 pages + 88 posts = 113** HTML exports under `source/wordpress-exports/`
- [x] Homepage prepared: `src/legacy/homepage.cleaned.html` + homepage assets under `public/`
- [x] Post-fetch PHP skim under new `public/`: **0** PHP files

## Remaining (Phase 03+ / continue content)

- [ ] `import:sitemap:download` (or prepare remaining 112 slugs) for full cleaned mirrors
- [ ] `chrome:extract` + blog shell / `migrate:posts`
- [ ] Phase 03 CMS/FLOW verify (already inherited from peer mounts)
- [ ] Fleet local smoke on `:5117`
