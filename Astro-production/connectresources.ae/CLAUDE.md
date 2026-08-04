# Agent notes — Connect Resources Astro

WordPress → Astro fleet site for https://connectresources.ae/

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter connectresources-astro run extract
pnpm --filter connectresources-astro run refresh:bodies
pnpm --filter connectresources-astro run build
node scripts/fleet-local.mjs up connectresources
node scripts/fleet-local.mjs smoke connectresources
```

## Conventions

- Peer pattern: `spheavyrental.ae` (WP mirror + full CMS)
- Content: `src/data/{pages,posts,authors,categories,tags}.json`
- Posts JSON also holds CPTs `guides` and `press-release` (path-prefixed)
- Raw crawl: `_crawl/` · assets under `public/wp-content/…`
- Forms: JSON `POST /api/contact/` · CMS: `@connect/site-cms` `FEATURES_FULL_CMS`
- Port **5086** · package `connectresources-astro`
- Keep `PUBLIC_SITE_URL=https://connectresources.ae`
- Never commit `.env` or `.data/`
