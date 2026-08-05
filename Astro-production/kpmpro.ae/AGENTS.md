# Agent notes — KPM Pro Astro

WordPress → Astro Phase 1 static mirror of https://kpmpro.ae/

Peer scaffold: `royalvisa.ae` / `kinzahr.com` (`FEATURES_FULL_CMS`). Port **5098**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter kpmpro-ae-astro run import:sitemap:download
pnpm --filter kpmpro-ae-astro run migrate:posts
pnpm --filter kpmpro-ae-astro run build
node scripts/fleet-local.mjs up kpmpro
node scripts/fleet-local.mjs smoke kpmpro
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Rank Math URL names)
- Keep `PUBLIC_SITE_URL=https://kpmpro.ae`
- Never commit `.env` or `.data/`
