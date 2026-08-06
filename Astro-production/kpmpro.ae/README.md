# kpmpro.ae — Astro fleet site

KPM Pro (https://kpmpro.ae/) — WordPress/Elementor → Astro SSR mirror.

| | |
|--|--|
| Port | **5098** |
| Fleet id | `kpmpro` |
| Package | `kpmpro-ae-astro` |
| CMS | `@connect/site-cms` `FEATURES_FULL_CMS` |
| Peer scaffold | `royalvisa.ae` (WP/Elementor mirror scripts) |

## Local

```bash
# from monorepo root
node scripts/fleet-local.mjs up kpmpro
# → http://127.0.0.1:5098/
```

## Content import

```bash
cd Astro-production/kpmpro.ae
node scripts/import-from-sitemap.mjs --download --prepare
node scripts/extract-chrome.mjs
node scripts/migrate-posts-from-legacy.mjs
node scripts/_fetch-all-elementor-chunks.mjs
```

See `AGENTS.md` and `docs/00-NEW-SITE-MASTER.md` at the monorepo root.
