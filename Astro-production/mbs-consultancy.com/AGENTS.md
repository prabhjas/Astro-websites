# MBS Consultancy — Agent notes

WordPress → Astro fleet site for https://mbs-consultancy.com/

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter mbs-consultancy-astro run extract
pnpm --filter mbs-consultancy-astro run refresh:bodies
pnpm --filter mbs-consultancy-astro run build
node scripts/fleet-local.mjs up mbs-consultancy
node scripts/fleet-local.mjs smoke mbs-consultancy
```

## Conventions

- Peer pattern: `connectresources.ae` (WP mirror + full CMS / Pipedrive)
- Content: `src/data/{pages,posts,authors,categories,tags,site}.json`
- Chrome: `src/data/{header,footer}.html` (Impreza header/footer from live)
- Raw crawl: `_crawl/` · assets under `public/wp-content/…`
- Forms: CF7 bridge → JSON `POST /api/contact/` · CMS: `@connect/site-cms` `FEATURES_FULL_CMS`
- Port **5099** · package `mbs-consultancy-astro`
- Keep `PUBLIC_SITE_URL=https://mbs-consultancy.com`
- Analytics: GA4 `G-ZBM6WBL0ZX` + Hotjar `3535132` (no GTM container on live crawl)
- Never commit `.env` or `.data/`

## Status

See `docs/MIGRATION-VERIFICATION-REPORT.md` — awaiting approval before deployment.
