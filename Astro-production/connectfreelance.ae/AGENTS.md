# Agent notes — Connect Freelance Astro

WordPress → Astro Phase 1 static mirror of https://connectfreelance.ae/

Peer scaffold: `royalvisa.ae` (FEATURES_FULL_CMS). Port **5094**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter connectfreelance-ae-astro run import:sitemap:download
pnpm --filter connectfreelance-ae-astro run migrate:posts
pnpm --filter connectfreelance-ae-astro run build
node scripts/fleet-local.mjs up connectfreelance
node scripts/fleet-local.mjs smoke connectfreelance
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Yoast URL names)
- Keep `PUBLIC_SITE_URL=https://connectfreelance.ae`
- Never commit `.env` or `.data/`
