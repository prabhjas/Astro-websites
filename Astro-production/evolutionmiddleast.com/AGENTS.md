# Agent notes — Evolution Middle East Astro

WordPress → Astro Phase 1 static mirror of https://www.evolutionmiddleast.com/

## Common commands

```bash
npm install
npm run import:sitemap:download   # first-time: fetch HTML + assets
npm run dev
npm run build && npm run validate:sitemap
npm start                         # Node standalone (required for /api/contact in prod)
npm test
```

## Conventions

- Cleaned HTML lives in `src/legacy/<slug>.cleaned.html`
- Shared chrome: `src/legacy/chrome/{header,footer}.html` (+ `public/chrome/`)
- Raw exports: `source/wordpress-exports/<slug>/index-https.html`
- Inventory: `src/data/sitemap-inventory.json`
- Forms: CF7 intercepted by `public/js/astro-mirror-fixes.js` → `POST /api/contact`
- Do not add `@astrojs/sitemap` (conflicts with Rank Math URL names)
- Keep `PUBLIC_SITE_URL=https://www.evolutionmiddleast.com`
- Never commit `.env` or `.data/`
