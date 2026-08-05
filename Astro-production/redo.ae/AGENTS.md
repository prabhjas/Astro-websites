# Agent notes — Redo Astro

WordPress → Astro HTML mirror of https://redo.ae/

Peer scaffold: `royalvisa.ae` (FEATURES_FULL_CMS). Port **5095**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter redo-ae-astro run import:sitemap:download
pnpm --filter redo-ae-astro run migrate:posts
pnpm --filter redo-ae-astro run build
node scripts/fleet-local.mjs up redo
node scripts/fleet-local.mjs smoke redo
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://redo.ae`
- Never commit `.env` or `.data/`
