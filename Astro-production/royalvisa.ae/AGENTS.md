# Agent notes — Royal Visa Astro

WordPress → Astro Phase 1 static mirror of https://royalvisa.ae/

Peer scaffold: `kinzahr.com` / `evolutionmiddleast.com` (FEATURES_FULL_CMS). Port **5097**.
Brand sibling: `royalvisa.ae`.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter royalvisa-ae-astro run import:sitemap:download
pnpm --filter royalvisa-ae-astro run migrate:posts
pnpm --filter royalvisa-ae-astro run build
node scripts/fleet-local.mjs up royalvisa
node scripts/fleet-local.mjs smoke royalvisa
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Yoast URL names)
- Keep `PUBLIC_SITE_URL=https://royalvisa.ae`
- Never commit `.env` or `.data/`
