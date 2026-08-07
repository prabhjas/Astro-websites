# Agent notes — Emiratisation Gateway Astro

WordPress → Astro HTML mirror of https://emiratisationgateway.com/

Peer scaffold: `emiratisationgate.org` (FEATURES_FULL_CMS). Port **5106**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter emiratisationgateway-astro run import:sitemap:download
pnpm --filter emiratisationgateway-astro run migrate:posts
pnpm --filter emiratisationgateway-astro run build
node scripts/fleet-local.mjs up emiratisationgateway
node scripts/fleet-local.mjs smoke emiratisationgateway
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://emiratisationgateway.com`
- Never commit `.env` or `.data/`
