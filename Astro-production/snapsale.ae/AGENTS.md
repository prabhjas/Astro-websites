# Agent notes — Snapsale Astro

WordPress → Astro HTML mirror of https://snapsale.ae/

Peer scaffold: `movey.ae` / `connecthr.ae` (`FEATURES_FULL_CMS`). Port **5122**.
WEBSITE_ID **5065**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter snapsale-ae-astro run import:sitemap:download
pnpm --filter snapsale-ae-astro run migrate:posts
pnpm --filter snapsale-ae-astro run build
node scripts/fleet-local.mjs up snapsale
node scripts/fleet-local.mjs smoke snapsale
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://snapsale.ae`
- Blog/insights path: `/insight/` (not `/blog/`)
- Never commit `.env` or `.data/`
