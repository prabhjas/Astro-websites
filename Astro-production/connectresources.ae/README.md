# Connect Resources — Astro

Production Astro migration of [https://connectresources.ae/](https://connectresources.ae/).

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
| Package | `connectresources-astro` |
| Port | **5086** |
| Unit | `connectresources` |
| Peer scaffold | `spheavyrental.ae` |

```bash
# From monorepo root
pnpm install
pnpm --filter connectresources-astro run build
node scripts/fleet-local.mjs up connectresources
node scripts/fleet-local.mjs smoke connectresources
```

## Content import from live WordPress

```bash
cd Astro-production/connectresources.ae
pnpm extract                 # WP REST → src/data + critical assets
pnpm refresh:bodies          # Elementor HTML bodies from live pages
# Optional limits while iterating:
# node scripts/extract-wp.mjs --limit-pages=30 --limit-posts=50
# node scripts/refresh-bodies.mjs --paths=/,/contact-us/ --only=pages
```

Sitemaps used as inventory:

- https://connectresources.ae/post-sitemap.xml
- https://connectresources.ae/page-sitemap.xml
- https://connectresources.ae/press-release-sitemap.xml
- https://connectresources.ae/guides-sitemap.xml
- https://connectresources.ae/author-sitemap.xml

## Env

Copy `.env.example` → `.env` for local smoke. On the host: `.env` (build `PUBLIC_SITE_URL` only) + `.env.prod` (secrets, required by systemd). Never put `HOST`/`PORT` in env files.

## Deploy

See `deploy/ROOT_SETUP.md`, `deploy/connectresources.service`, `deploy/connectresources.ae.caddy` (named CA `astro_origin_2026` with paired manual cert/key loaders).
