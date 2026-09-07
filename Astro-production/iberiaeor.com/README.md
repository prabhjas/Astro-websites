# S&P Heavy Machinery Rental - Astro

Production-ready Astro migration of [https://spheavyrental.ae/](https://spheavyrental.ae/).

## Stack

- Astro 7 + TypeScript + Tailwind CSS
- `@astrojs/node` adapter for SSR API + sitemap routes
- Preserved WordPress/Elementor markup + CSS for page fidelity
- Dynamic routes for pages, posts, categories, tags, authors
- Rank Math–compatible SEO (title, description, canonical, Open Graph, Twitter, JSON-LD)
- Contact form API (`/api/contact/`) → local lead store → Pipedrive + optional SMTP
- Machine APIs for central CMS (`/api/internal/*` + `INTERNAL_JOB_SECRET` bearer)

## Commands

```bash
npm install
cp .env.example .env
npm run dev
npm run build
npm run start        # node ./dist/server/entry.mjs
npm run lint
```

### Content refresh from live WordPress

```bash
npm run extract
npm run fetch-assets
```

## Central CMS & Pipedrive

Per-site dashboard UI is removed. Ops run through bearer-authenticated `/api/internal/*` - see **[docs/ADMIN.md](docs/ADMIN.md)**.

- Auth: `Authorization: Bearer <INTERNAL_JOB_SECRET>`
- Public forms → `POST /api/contact/` (JSON) → local lead store → Pipedrive
- Health: `GET /api/health`

## Project layout

```
src/
  layouts/           BaseLayout
  lib/auth/          INTERNAL_JOB_SECRET helpers (+ legacy session utils unused by UI)
  lib/leads/         NDJSON store + ingest service
  services/          Pipedrive + email + logger
  pages/api/         Contact, geo, health, internal CMS APIs
  middleware.ts      Redirects + http_access logging
docs/ADMIN.md        Bearer API guide
docs/13-go-live-server-handoff.md
.env.example         All required environment variables
```

## Notes

- Trailing slash always (`trailingSlash: "always"`).
- Do not put `HOST`/`PORT` in production env files - leave those to systemd per site.
- Lockfile includes linux + darwin optional native bindings for CI/server `npm ci`.
