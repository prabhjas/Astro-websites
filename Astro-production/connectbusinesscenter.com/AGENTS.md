# Agent notes — Connect Business Center Astro

WordPress → Astro Phase 1 static mirror of https://connectbusinesscenter.com/

Peer scaffold: `kinzahr.com` / `evolutionmiddleast.com` (FEATURES_FULL_CMS). Port **5116**.
Brand sibling: `connectbusinesscenter.com`.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter connectbusinesscenter-astro run import:sitemap:download
pnpm --filter connectbusinesscenter-astro run migrate:posts
pnpm --filter connectbusinesscenter-astro run build
node scripts/fleet-local.mjs up connectbusinesscenter
node scripts/fleet-local.mjs smoke connectbusinesscenter
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Yoast URL names)
- Keep `PUBLIC_SITE_URL=https://connectbusinesscenter.com`
- Never commit `.env` or `.data/`
