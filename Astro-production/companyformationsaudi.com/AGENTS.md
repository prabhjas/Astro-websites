# Agent notes — Company Formation Saudi Astro

WordPress → Astro Phase 1 static mirror of /

Peer scaffold: `kinzahr.com` / `evolutionmiddleast.com` (FEATURES_FULL_CMS). Port **5114**.
Brand sibling: `companyformationsaudi.com`.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter companyformationsaudi-astro run import:sitemap:download
pnpm --filter companyformationsaudi-astro run migrate:posts
pnpm --filter companyformationsaudi-astro run build
node scripts/fleet-local.mjs up companyformationsaudi
node scripts/fleet-local.mjs smoke companyformationsaudi
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Yoast URL names)
- Keep `PUBLIC_SITE_URL=https://companyformationsaudi.com`
- Never commit `.env` or `.data/`
