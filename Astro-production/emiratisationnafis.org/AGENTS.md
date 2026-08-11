# Agent notes — Emiratisation Nafis Astro

WordPress → Astro HTML mirror of https://emiratisationnafis.org/

Peer scaffold: `pittant.com` (FEATURES_FULL_CMS). Port **5108**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter emiratisationnafis-astro run import:sitemap:download
pnpm --filter emiratisationnafis-astro run migrate:posts
pnpm --filter emiratisationnafis-astro run build
node scripts/fleet-local.mjs up emiratisationnafis
node scripts/fleet-local.mjs smoke emiratisationnafis
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://emiratisationnafis.org`
- Never commit `.env` or `.data/`
