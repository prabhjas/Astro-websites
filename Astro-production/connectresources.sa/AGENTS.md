# Agent notes — Connect Resources Saudi Astro

WordPress → Astro Phase 1 static mirror of https://connectresources.sa/

Peer scaffold: `kinzahr.com` / `evolutionmiddleast.com` (FEATURES_FULL_CMS). Port **5088**.
Brand sibling: `connectresources.ae`.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter connectresources-sa-astro run import:sitemap:download
pnpm --filter connectresources-sa-astro run migrate:posts
pnpm --filter connectresources-sa-astro run build
node scripts/fleet-local.mjs up connectresources-sa
node scripts/fleet-local.mjs smoke connectresources-sa
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Yoast URL names)
- Keep `PUBLIC_SITE_URL=https://connectresources.sa`
- Never commit `.env` or `.data/`
