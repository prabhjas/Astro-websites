# Agent notes — Emiratisation Gate Astro

WordPress → Astro HTML mirror of https://emiratisationgate.org/

Peer scaffold: `pittant.com` (FEATURES_FULL_CMS). Port **5105**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter emiratisationgate-astro run import:sitemap:download
pnpm --filter emiratisationgate-astro run migrate:posts
pnpm --filter emiratisationgate-astro run build
node scripts/fleet-local.mjs up emiratisationgate
node scripts/fleet-local.mjs smoke emiratisationgate
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://emiratisationgate.org`
- Never commit `.env` or `.data/`
