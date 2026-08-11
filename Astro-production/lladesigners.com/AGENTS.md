# Agent notes — LLA Designers Astro

WordPress → Astro HTML mirror of https://lladesigners.com/

Peer scaffold: `pittant.com` (FEATURES_FULL_CMS). Port **5112**. Website ID **4798**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter lladesigners-astro run import:sitemap:download
pnpm --filter lladesigners-astro run migrate:posts
pnpm --filter lladesigners-astro run build
node scripts/fleet-local.mjs up lladesigners
node scripts/fleet-local.mjs smoke lladesigners
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/` when extracted)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://lladesigners.com`
- Logo: `/wp-content/uploads/2024/01/Logo-new-1.png`
- Never commit `.env` or `.data/`
