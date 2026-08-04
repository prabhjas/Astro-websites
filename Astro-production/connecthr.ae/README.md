# Connect HR — Astro (connecthr.ae)

Production-ready Astro migration of [https://connecthr.ae/](https://connecthr.ae/) —
bilingual **EN + AR** HR / payroll / workforce-management marketing site, blog and
case studies.

Part of the Connect Group Astro fleet. Port **5084** · systemd unit **`connecthr`**.

## How this site was built

| | |
|--|--|
| **Peer copied from** | `spheavyrental.ae` (WP/Elementor mirror + full CMS + blog) |
| **Source** | WordPress + Rank Math + WPML + Elementor at connecthr.ae |
| **Extraction** | `scripts/extract-connecthr.mjs` via the WP REST API (`/wp-json/wp/v2/`) |
| **Content stored in** | `src/data/*.json` (+ `header/footer` HTML) — served by SSR |
| **Assets mirrored to** | `public/wp-content/**` (static only — **no PHP runtime**) |

### URL coverage (matches the live Rank Math sitemaps)

| Type | Count | Route |
|------|-------|-------|
| Pages (EN + AR) | **85** (53 EN + 32 AR) | `[...slug].astro` |
| Blog posts | **227** | `[...slug].astro` (root `/slug/`) |
| Case studies (`case_studies` CPT) | **5** | `[...slug].astro` (`/case_studies/<slug>/`) |
| Blog index | `/blogs/` (mirrored page) | `[...slug].astro` |
| Archives | category / tag / author | `src/pages/{category,tag,author}/[slug]` |

All 317 sitemap URLs return **200** on local `:5084`. Arabic routes render
`<html lang="ar" dir="rtl">` with EN/AR header + footer picked by path.

Sitemaps mirror the live structure: `sitemap_index.xml` →
`page-sitemap.xml` (85), `post-sitemap.xml` + `post-sitemap2/3.xml` (227),
`case_studies-sitemap.xml` (5).

## Stack

- Astro 7 + TypeScript + Tailwind (pnpm catalog pins, fleet-wide)
- `@astrojs/node` standalone adapter (SSR APIs + sitemap routes)
- Preserved WordPress/Elementor markup + CSS for visual fidelity
- Rank Math–compatible SEO (title, description, canonical, OG, Twitter, JSON-LD)
- Shared CMS via `@connect/site-cms` (`FEATURES_FULL_CMS`) — leads, posts,
  taxonomy, redirects, GTM, SEO, uploads
- Contact form `POST /api/contact/` (JSON) → `.data/leads` → Pipedrive

## Commands (from repo root)

```bash
pnpm install
cp Astro-production/connecthr.ae/.env.example Astro-production/connecthr.ae/.env   # local, gitignored
pnpm --filter connecthr-astro run build
node scripts/fleet-local.mjs up connecthr        # http://127.0.0.1:5084
node scripts/fleet-local.mjs smoke connecthr
node scripts/fleet-local.mjs stop connecthr
```

### Rebuild content from live WordPress

```bash
cd Astro-production/connecthr.ae
pnpm run extract            # REST pull: pages(EN+AR)+posts+case_studies+taxonomy, assets, header/footer, SEO
pnpm run extract:data       # SKIP_MEDIA=1 — data only, no asset download
# env flags: SKIP_MEDIA=1 (no downloads), SKIP_SEO=1 (SEO from REST only, skip per-URL Rank Math crawl)
```

The extractor treats the **live sitemaps as the checklist** and writes
`src/data/sitemap-urls.json` (lastmod + reconciliation).

## Central CMS & Pipedrive

Machine-only ops through bearer-authenticated `/api/internal/*`:

- Auth: `Authorization: Bearer <INTERNAL_JOB_SECRET>` (one secret per domain)
- Public forms → `POST /api/contact/` (JSON) → `.data/leads` → Pipedrive
- Health: `GET /api/health/` → `{"service":"connecthr-astro"}`

## Security — WP-clone malware scan

Ran `docs/CURSOR-WP-CLONE-MALWARE-SCAN.md` on `public/` + `_crawl/` after mirror:

- **0** runnable PHP/phtml/phar, no double-extensions, no `.htaccess`, no webshell names
- No JS obfuscation / miners / `eval(atob)` / `document.write(unescape)`; no `<script>` in SVGs
- No injected iframes / rogue trackers / SEO-spam link farms
- External hosts referenced are all legitimate (self, W3C/schema.org, Gravatar,
  Connect Group Pipedrive + sister brands, CDNs, app stores, UAE-gov + blog citations)
- No secrets mirrored (`wp-config.php` / `.env` / keys)

**Verdict: SAFE TO CONTINUE.** (The "C99" substring inside SVG hex/path data is a
false positive, not the C99 webshell.)

## Runtime fidelity (Elementor on a static mirror)

The live site runs Elementor + WP Rocket. To reproduce the look without WordPress:

- **Inline head CSS** (`src/data/inline-head.css`) is captured from the live `<head>`
  (`wp-custom-css`, `global-styles`/Elementor global colours, brand `@font-face`,
  WP Rocket used-CSS) and injected globally by `BaseLayout` — this holds the
  gradients, hover states and colours the linked `post-*.css` files reference.
- **Brand font** GeneralSans (`/wp-content/uploads/2025/07/GeneralSans-*`) is
  downloaded from the inline `@font-face`.
- **Elementor runtime JS** (`elementor`/`elementor-pro` frontend) is downloaded and
  loaded by `ElementorScripts.astro` (WP Rocket combines these on the live page, so
  they are not in the mirrored HTML — the extractor adds them explicitly).
- Elementor's webpack frontend does **not** fully bootstrap without WordPress, so
  `public/scripts/connecthr-widgets.js` provides vanilla handlers for the widgets
  that need JS: **self-hosted background video** (hero), **animated counters**, and
  Pro **sticky** header. Accordions/toggles → `accordion.js`; nested FAQ accordions
  use native `<details>`.

> **Rebuild after changing anything under `public/`** — assets are served from
> `dist/client`, so `pnpm --filter connecthr-astro run build` must run for new
> assets/scripts to be picked up (a bare `fleet-local restart` reuses the old dist).

### Known parity caveats (spot-check against live before go-live)

- Counter/sticky/hover effects fire on scroll/viewport events — verify in a real
  browser (they can't trigger in a headless pane).
- REST `content.rendered` does not expand Elementor **global templates**, so a
  handful of widgets injected via theme-builder/global blocks may be absent; a
  full-HTML crawl would be needed for 100% widget parity.

## Notes / deploy

- Trailing slash always (`trailingSlash: "always"`); unknown URLs → real 404.
- Do **not** put `HOST`/`PORT` in env files — systemd sets them (`deploy/connecthr.service`, port 5084).
- Deploy templates in `deploy/`: `connecthr.service`, `connecthr.ae.caddy`
  (`http://`+`https://`+`tls internal`), `ROOT_SETUP.md`.
- **Production deploy + Cloudflare cutover are out of scope** until a follow-up is assigned (root/Aaron).
