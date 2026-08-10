# Agent notes — Movey Astro

WordPress → Astro HTML mirror of https://movey.ae/

Peer scaffold: `connecthr.ae` / `kpmpro.ae` (`FEATURES_FULL_CMS`). Port **5104**.

## Common commands

```bash
# From monorepo root
pnpm install
pnpm --filter movey-ae-astro run import:sitemap:download
pnpm --filter movey-ae-astro run migrate:posts
pnpm --filter movey-ae-astro run build
node scripts/fleet-local.mjs up movey
node scripts/fleet-local.mjs smoke movey
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Keep `PUBLIC_SITE_URL=https://movey.ae`
- Never commit `.env` or `.data/`
