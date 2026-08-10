# Agent notes — Al Buraq Astro

WordPress → Astro HTML mirror of https://alburaq.ae/

Peer scaffold: `pittant.com` (FEATURES_FULL_CMS). Port **5120**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter alburaq-astro run import:sitemap:download
pnpm --filter alburaq-astro run migrate:posts
pnpm --filter alburaq-astro run build
node scripts/fleet-local.mjs up alburaq
node scripts/fleet-local.mjs smoke alburaq
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://alburaq.ae`
- Never commit `.env` or `.data/`
