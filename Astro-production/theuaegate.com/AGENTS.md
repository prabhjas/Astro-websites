# Agent notes — The UAE Gate Astro

WordPress → Astro full-CMS mirror of https://theuaegate.com/

Peer scaffold: `connectbusinesscenter.com` (FEATURES_FULL_CMS). Port **5117**.
Sitemap sources: live `page-sitemap.xml` + `post-sitemap.xml`; Astro serves `/sitemap_index.xml`.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter theuaegate-astro run import:sitemap
pnpm --filter theuaegate-astro run import:sitemap:download
pnpm --filter theuaegate-astro run migrate:posts
pnpm --filter theuaegate-astro run build
node scripts/fleet-local.mjs up theuaegate
node scripts/fleet-local.mjs smoke theuaegate
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Rank Math URL names)
- Keep `PUBLIC_SITE_URL=https://theuaegate.com`
- Never commit `.env` or `.data/`
- Branch: `mushtaq-branch`
