# Phase 01 sign-off — connectbusinesscenter.com

| | |
|--|--|
| **Port (reserved)** | **5116** (`docs/FLEET-PORT-REGISTRY.md` — placeholder until Phase 02+) |
| **Peer** | Full CMS HTML-mirror — scaffold peer **connectbusinesscenter.com** |
| **Content source** | Live Rank Math `page-sitemap.xml` (27) + `post-sitemap.xml` (195) = **222** URLs |
| **Astro sitemap (planned)** | `/sitemap_index.xml` (Phase 05) |
| **Fetched** | 2026-08-08 |
| **Malware verdict** | **SAFE TO CONTINUE** (0 HIGH RISK) |

## Done

- [x] Confirmed port **5116**
- [x] Saved local sitemaps under `source/sitemaps/`
- [x] Inventory: `src/data/sitemap-inventory.json`
- [x] Fetched **222/222** HTML mirrors → `source/wordpress-exports/<slug>/index-https.html`
- [x] Downloaded **1525** same-origin assets → `public/` (0 PHP)
- [x] Malware scan report: `source/phase01-malware-scan-report.md`

## Verify (optional)

1. Open `source/phase01-malware-scan-report.md` — confirm verdict.
2. Spot-check a page export, e.g. `source/wordpress-exports/homepage/index-https.html`.
3. Spot-check an asset, e.g. `public/wp-content/...` image referenced on homepage.

## Next

Phase 02 — scaffold Astro package from **connectbusinesscenter.com**, rebrand, `prepare:all` cleaned HTML.
