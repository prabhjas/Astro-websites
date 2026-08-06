# peomiddleast.com — 404 / link backlog (confirm before build)

Generated: 2026-08-06T10:38:13.530Z
Live origin: https://peomiddleast.com
Local QA reference: docs/10-final-qa-report.json (when present)

## Verdict

- **Official sitemap URLs are healthy on Astro local** (prior sweep: 138/138 pages + 148/148 posts → 200).
- **Production is still WordPress** (Link: `wp-json`). Astro is not cut over yet — live vs local is not an apples-to-apples SSR comparison.
- **Click-through 404s will still happen on Astro** from stale in-content links even when sitemap URLs work.

## P0 — fix before / during cutover

| ID | Issue | Evidence | Proposed fix |
|----|-------|----------|--------------|
| P0.1 | `/blog/` → `/insights/` | **DONE** — route redirect + `redirects.yml` + breadcrumbs | Keep; verify after rebuild. |
| P0.2 | `/contact-us/` → `/` on both Astro + live WP | Live audit confirms 301 → home | Product choose: keep WP parity **or** improve to `/contact/` (recommended). |
| P0.3 | **13 inventory aliases** are 200 on Astro but **301 on live** to canonical URLs | Local vs live diffs (e.g. `/employer-of-record/` → `/uae-employer-of-record`, several PEO posts → `/peo-pros-and-cons/`) | Port these 13 live redirects into `redirects.yml` before cutover so SEO parity matches WP. |
| P0.4 | Only 5 redirects committed; Rank Math / full live map not imported | `redirects.yml` comment | Export Rank Math CSV → `imports/redirects/` → merge. |
| P0.5 | Old `/locations/...` URLs **404 on Astro**; **live WP 301 → `/`** | Live + local crawl | Prefer map to real country/service pages where possible; otherwise match live → `/`. |
| P0.6 | Confirm About destinations | Live + local: `/about/`, `/about-us/` → `/` | Keep home (WP parity) **or** point to `/our-history/` (200 on both). |

## P1 — content / SEO hygiene (post cutover ok if redirects cover)

| ID | Issue | Evidence | Proposed fix |
|----|-------|----------|--------------|
| P1.1 | ~410 stale internal paths from mirrored HTML (old post slugs, renamed URLs) | Link crawl of `src/legacy/*.cleaned.html` | Prefer redirects for high-traffic URLs; rewrite remaining hrefs in prepare/clean pipeline. |
| P1.2 | ~286 WordPress `?p={id}` links in HTML | Legacy mirrors | Redirect `?p=` via lookup table from WP export, or strip/rewrite at prepare time. |
| P1.3 | Category/tag 404 for unknown slugs | `/category/hr/` 404; real routes exist | Validate nav/filter slugs against `getAllCategorySlugs()`; fix wrong links. |
| P1.4 | `/api/geo/country` 301 (trailing slash) | final-qa fail | Accept both paths or call `/api/geo/country/` from client. |
| P1.5 | WP leftovers (`/feed/`, `/comments/feed/`, some `wp-json`) | Link crawl | 410 or 301 to home / insights; not user-facing nav. |

## P2 — nice-to-have

| ID | Issue | Proposed fix |
|----|-------|--------------|
| P2.1 | Local fleet marks peomiddleeast `placeholder` on some branches | Sync `scripts/fleet-sites.json` + registry to `scaffolded` on working branch. |
| P2.2 | Hard-refresh / missing `src` while on mushtaq-branch | Work on `rajpal-branch`/`dev` or merge peo tree so local always has mirrors. |

## Suggested build order

1. **P0.3** port the **13 live canonical redirects** (Astro currently soft-serves old URLs as 200)
2. **P0.1** decide `/blog/` target (`/` WP-parity vs `/insights/` UX) — eliminate Astro 404
3. **P0.2 / P0.6** product call on contact-us / about destinations
4. **P0.4 + P0.5** Rank Math import + `/locations/` map
5. Re-run local link crawl; aim for 0 broken **nav + sitemap** links
6. Owner cutover only after smoke on staging/loopback with Caddy template

## Live inventory snapshot (this run)

- Live is still **WordPress** (`wp-json` Link headers)
- Live inventory 200: **273/286**
- Live redirects: **13** (0 broken)
- Local vs live status diffs: **13** (all Astro=200 / live=301 → canonical)

See `docs/10-local-vs-live-audit.json` for raw rows.
