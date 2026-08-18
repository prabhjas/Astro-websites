# Connect Staff — WordPress → Astro

Static Astro site migrating **[connectstaff.ae](https://connectstaff.ae/)** off WordPress + Elementor.

## Quick start

```bash
cp .env.example .env   # fill Pipedrive + identity vars
npm install
npm run import:sitemap:download   # first time only
npm run dev                       # http://localhost:4321
```

Production-style (static pages + Node for `/api/contact`):

```bash
npm run build
npm start                         # or: HOST=127.0.0.1 PORT=4321 node ./dist/server/entry.mjs
```

## Strategy

Same Phase 1 approach as the Connect Group Astro migration:

1. Pull live HTML from the Rank Math sitemap index
2. Clean / rewrite absolute URLs → root-relative
3. Download `wp-content` / `wp-includes` assets into `public/`
4. Serve cleaned HTML mirrors from Astro routes
5. Shared header/footer chrome injected on non-home pages
6. CF7 forms intercepted → `POST /api/contact` → file lead store + Pipedrive

Do **not** use headless WordPress for Elementor pages — layout is not in the API.

## Homepage performance canary

Verified 2026-08-14: `src/lib/legacy-page.js` applies a homepage-only first-paint
canary to the legacy mirror. It preloads the first above-fold staff carousel
images, injects a small critical CSS shim for the header/hero/carousel path, and
defers active homepage stylesheet links outside `noscript` while preserving
noscript fallbacks.

## Forms & Pipedrive

Legacy `form.wpcf7-form` markup stays in the HTML. `public/js/astro-mirror-fixes.js` intercepts submit and posts to `/api/contact`.

Evolution CF7 field mapping includes `f-name`, `l-name`, `your-email`, `phonetext-*`, `your-message`.

Required env (see `.env.example`): `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_COMPANY_DOMAIN`, `PIPEDRIVE_OWNER_ID`, `PIPEDRIVE_LEAD_SOURCE_ID`, `WEBSITE_ID`.

Leads persist under `.data/leads/` (gitignored) before Pipedrive delivery.

## Sitemap sources (live WP)

| Sitemap | Role |
|---------|------|
| https://connectstaff.ae/sitemap_index.xml | Index |
| https://connectstaff.ae/page-sitemap.xml | Marketing pages |
| https://connectstaff.ae/post-sitemap.xml | Blog posts |
| https://connectstaff.ae/local-sitemap.xml | KML (skipped) |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server (pages + `/api/contact`) |
| `npm run build` | Static + Node standalone → `dist/` |
| `npm start` | Run Node server from `dist/server/entry.mjs` |
| `npm run preview` | Preview production build |
| `npm test` | Form/parse unit tests |
| `npm run import:sitemap` | Fetch HTML exports from live sitemaps |
| `npm run import:sitemap:download` | Fetch + prepare + download assets |
| `npm run prepare:page -- <slug> --download` | Prepare one page |
| `npm run assets:download-all` | Download assets referenced by cleaned HTML |
| `npm run validate:sitemap` | Validate robots + sitemaps after build |

## SEO endpoints (Rank Math–compatible)

| URL | Role |
|-----|------|
| `/robots.txt` | Crawler rules + `Sitemap:` line |
| `/sitemap_index.xml` | Sitemap index |
| `/page-sitemap.xml` | Indexable pages |
| `/post-sitemap.xml` | Blog posts |

Set `PUBLIC_SITE_URL=https://connectstaff.ae` at build time.

## Folder structure

```text
astro-connectstaff.ae/
├── docs/
├── source/wordpress-exports/   ← raw WP HTML dumps
├── scripts/prepare-page.mjs
├── scripts/import-from-sitemap.mjs
├── public/wp-content/          ← localized assets
├── public/wp-includes/
├── src/legacy/*.cleaned.html   ← generated cleaned HTML
├── src/pages/index.astro       ← homepage mirror
├── src/pages/[slug].astro      ← page/post mirrors
└── src/data/sitemap-inventory.json
```

## Docs

See [docs/00-overview.md](docs/00-overview.md).
