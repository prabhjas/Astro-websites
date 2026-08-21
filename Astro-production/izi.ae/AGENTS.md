# Agent notes — IZI Rent a Car Astro

WordPress → Astro HTML mirror of https://izi.ae/

Peer scaffold: `pittant.com` (FEATURES_FULL_CMS). Port **5121**. Fleet id: `izi`.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter izi-astro run import:sitemap:download
pnpm --filter izi-astro run migrate:posts
pnpm --filter izi-astro run build
node scripts/fleet-local.mjs up izi
node scripts/fleet-local.mjs smoke izi
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html` (nested OK: `car/…`, `vehicles/…`)
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json` (pages + posts + cars CPT)
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://izi.ae`
- Never commit `.env` or `.data/`
