# Agent notes — Freelancer DXB Astro

WordPress → Astro HTML mirror of https://freelancerdxb.com/

Peer scaffold: `royalvisa.ae` (FEATURES_FULL_CMS). Port **5109**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter freelancerdxb-com-astro run import:sitemap:download
pnpm --filter freelancerdxb-com-astro run build
node scripts/fleet-local.mjs up freelancerdxb
node scripts/fleet-local.mjs smoke freelancerdxb
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://freelancerdxb.com`
- Never commit `.env` or `.data/`
