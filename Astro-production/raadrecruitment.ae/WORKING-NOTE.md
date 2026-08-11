# raadrecruitment.ae — Phase 01–10 local (2026-08-10)

| Field | Value |
|-------|--------|
| Domain | raadrecruitment.ae |
| Fleet id / unit | `raadrecruitment` |
| Port | **5113** |
| Peer | Full CMS — `connectbusinesscenter.com` / `companyformationsaudi.com` / `connectgroup.co` |
| Theme (live) | **Astra + Elementor** (static assets under `public/wp-content`) |
| Status | scaffolded in `fleet-sites.json` + `FLEET-PORT-REGISTRY.md` |

## Content (Phase 02)
- Cloned from live Rank Math sitemaps: **8 pages**, **92 posts**, **local** → `/locations.kml`
- Importer: `scripts/import-live-html.mjs` (fixed to prefer `main` / Elementor over small related `<article>`)
- Asset catch-up: `scripts/fetch-missing-assets.mjs` (Astra/Elementor CSS now local; some avatar PNGs soft-404 on origin)
- Sitemap sync: `npm run sitemap:sync` → `src/data/sitemap-urls.json`
- Public sitemaps: `/sitemap_index.xml`, `/page-sitemap.xml`, `/post-sitemap.xml`, `/local-sitemap.xml`
- Malware: `docs/malware-scan-2026-08-10.md` — CLEAN

## Local
```bash
pnpm install   # from monorepo root
node scripts/fleet-local.mjs up raadrecruitment
node scripts/fleet-local.mjs smoke raadrecruitment   # PASS 2026-08-10
```
Loopback: http://127.0.0.1:5113/

## Deploy templates (git only — Phase 08)
- `deploy/raadrecruitment.service`
- `deploy/raadrecruitment.ae.caddy`
- `deploy/ROOT_SETUP.md`
- **Not** in live Caddy cutover set — owner later per `docs/OPS-OWNER-CADDY-CUTOVER.md`

## Secrets
- `.env` / `.env.prod` gitignored — do not commit
- Local smoke may show Pipedrive `config_error` if `PIPEDRIVE_API_TOKEN` empty (lead still stored + attribution OK)
- Unique `INTERNAL_JOB_SECRET` required for prod

## Visual / layout (2026-08-10)
- Root cause: Impreza chrome + CSS while live is **Astra + Elementor**; new `public/` assets were missing from `dist/client` until rebuild
- Fixed: Astra layout shell, live CSS/JS order, Astra inline CSS, `/blog/` route (was hard-redirect to peer `/insights/`)
- Fonts: Poppins self-hosted at `/css/fonts-poppins.css` + `/fonts/poppins/*`; Elementor Roboto/Inter etc. under `uploads/elementor/google-fonts/`
- Icons: eicons / FA / dashicons woff2 local; CSS absolute origin rewritten to root-relative
- Images: soft-404 HTML masquerades removed; dead live WebPs remapped to working JPG/PNG where origin files missing
- Verify: http://127.0.0.1:5113/ hard-refresh (not live WP domain)
