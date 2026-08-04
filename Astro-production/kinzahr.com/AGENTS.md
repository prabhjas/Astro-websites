# Agent notes — KinzaHR Astro

WordPress → Astro Phase 1 static mirror of https://kinzahr.com/

Peer scaffold: `evolutionmiddleast.com` (FEATURES_FULL_CMS). Port **5093**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter kinzahr-astro run import:sitemap:download
pnpm --filter kinzahr-astro run migrate:posts
pnpm --filter kinzahr-astro run build
node scripts/fleet-local.mjs start kinzahr
node scripts/fleet-local.mjs smoke kinzahr
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Rank Math URL names)
- Keep `PUBLIC_SITE_URL=https://kinzahr.com`
- Never commit `.env` or `.data/`
