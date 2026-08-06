# MBS Consultancy — Astro

Production Astro migration of [https://mbs-consultancy.com/](https://mbs-consultancy.com/).

## Stack

- Astro 7 + TypeScript + Tailwind CSS
- `@astrojs/node` adapter for SSR API + Rank Math–style sitemap routes
- Preserved WordPress/Elementor markup + CSS for page fidelity
- Dynamic routes for pages, posts, guides, press releases, categories, tags, authors
- Contact form API (`/api/contact/`) → local lead store → Pipedrive
- Machine APIs for central CMS (`/api/internal/*` + `INTERNAL_JOB_SECRET` bearer)
- Shared package: `@connect/site-cms` (`FEATURES_FULL_CMS`)

## Fleet

| | |
|--|--|
| Package | `mbs-consultancy-astro` |
| Port | **5099** |
| Unit | `mbs-consultancy` |
| Peer scaffold | `spheavyrental.ae` |

```bash
# From monorepo root
pnpm install
pnpm --filter mbs-consultancy-astro run build
node scripts/fleet-local.mjs up mbs-consultancy
node scripts/fleet-local.mjs smoke mbs-consultancy
```

## Content import from live WordPress

```bash
cd Astro-production/mbs-consultancy.com
pnpm extract                 # WP REST → src/data + critical assets
pnpm refresh:bodies          # Elementor HTML bodies from live pages
# Optional limits while iterating:
# node scripts/extract-wp.mjs --limit-pages=30 --limit-posts=50
# node scripts/refresh-bodies.mjs --paths=/,/contact-us/ --only=pages
```

Sitemaps used as inventory:

- https://mbs-consultancy.com/post-sitemap.xml
- https://mbs-consultancy.com/page-sitemap.xml
- https://mbs-consultancy.com/press-release-sitemap.xml
- https://mbs-consultancy.com/guides-sitemap.xml
- https://mbs-consultancy.com/author-sitemap.xml

## Env

Copy `.env.example` → `.env` for local smoke. On the host: `.env` (build `PUBLIC_SITE_URL` only) + `.env.prod` (secrets, required by systemd). Never put `HOST`/`PORT` in env files.

## Deploy

See `deploy/ROOT_SETUP.md`, `deploy/mbs-consultancy.service`, `deploy/mbs-consultancy.com.caddy` (`tls internal`).
