# Agent notes — Pittant Astro

WordPress → Astro HTML mirror of https://pittant.com/

Peer scaffold: `royalvisa.ae` (FEATURES_FULL_CMS). Port **5111**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter pittant-astro run import:sitemap:download
pnpm --filter pittant-astro run migrate:posts
pnpm --filter pittant-astro run build
node scripts/fleet-local.mjs up pittant
node scripts/fleet-local.mjs smoke pittant
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://pittant.com`
- Never commit `.env` or `.data/`
