# 07 — First sprint (this week)

Concrete tasks to start the migration. Check items off as you go.

---

## Day 1–2 — Scaffold + homepage shell

- [x] Confirm Node.js ≥ 22.12.0 (`node -v`)
- [x] Scaffold Astro in this folder — see [04-phase1-static-mirror.md](04-phase1-static-mirror.md)
- [x] Set `site: 'https://connectgroup.co'` in `astro.config.mjs`
- [x] Create `src/layouts/BaseLayout.astro` with basic `<head>`
- [x] Create `src/pages/index.astro` (Phase 1 HTML mirror)
- [x] Run `npm run dev` and confirm page loads

**Done in repo:** `npm install` · `npm run prepare:homepage:download` · `npm run build`

---

## Day 3–4 — Clean + localize homepage

- [ ] Copy homepage dump into a working file (do not edit the raw export in place without a backup)
- [ ] Strip admin-bar CSS/markup
- [ ] List all unique `wp-content` / `wp-includes` asset URLs from the dump
- [ ] Download critical path assets (hero image, fonts, Elementor CSS/JS)
- [ ] Rewrite URLs to `/assets/...`
- [ ] Embed cleaned body into `index.astro` (or serve cleaned HTML via layout)
- [ ] Visual compare vs https://connectgroup.co/ (desktop + mobile)

Raw export stays at:

`source/wordpress-exports/homepage/index-https.html`

---

## Day 5 — Forms inventory + sitemap

- [ ] Document all CF7 fields and Pipedrive mapping (from WP admin)
- [ ] Choose form replacement approach ([05-forms-and-dynamic.md](05-forms-and-dynamic.md))
- [ ] Export or crawl full sitemap → save as `docs/inventory/urls.md` (create when ready)
- [ ] Mark URLs P0 / P1 / P2 for mirroring order
- [ ] Estimate total page count for Phase 1

---

## Definition of done (end of sprint)

| Done means… |
|-------------|
| Astro project exists in this workspace |
| Homepage renders locally with **local** critical assets |
| Team agrees on form replacement approach |
| URL inventory started |

---

## Explicitly out of this sprint

- Full site crawl of every mega-menu URL
- DNS cutover
- Full Astro component rebuild of homepage
- Headless WordPress GraphQL setup

---

## After this sprint

Continue **Phase 1** for P0 URLs, then **Phase 2** form implementation before any production cutover.

Back to phases: [02-migration-phases.md](02-migration-phases.md)
