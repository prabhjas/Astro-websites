# snapsale.ae — Astro fleet site

Snapsale (https://snapsale.ae/) — WordPress/Elementor → Astro SSR mirror.

| | |
|--|--|
| Port | **5098** |
| Fleet id | `kpmpro` |
| Package | `snapsale-ae-astro` |
| CMS | `@connect/site-cms` `FEATURES_FULL_CMS` |
| Peer scaffold | `royalvisa.ae` (WP/Elementor mirror scripts) |

## Local

```bash
# from monorepo root
node scripts/fleet-local.mjs up kpmpro
# → http://127.0.0.1:5122/
```

## Content import

```bash
cd Astro-production/snapsale.ae
node scripts/import-from-sitemap.mjs --download --prepare
node scripts/extract-chrome.mjs
node scripts/migrate-posts-from-legacy.mjs
node scripts/_fetch-all-elementor-chunks.mjs
```

## Legacy performance optimizer

Verification date: 2026-08-14 UTC.

Cleaned legacy pages are post-processed by `scripts/lib/legacy-performance-optimizer.mjs`.
The optimizer is wired into `scripts/prepare-page.mjs` and can also be run across the existing
cleaned HTML files:

```bash
pnpm --filter snapsale-ae-astro run optimize:legacy
```

The optimizer is presentation-only. It removes obsolete WP Rocket runtime and dead Rocket
annotations, recovers responsive image attributes only when every local candidate exists,
promotes blank lazy iframes such as the contact-page Google Map, and normalizes image loading
priority. It must not change API routes, Pipedrive/contact handling, GTM runtime, crawler policy,
environment files, secrets, or production data.

See `AGENTS.md` and `docs/00-NEW-SITE-MASTER.md` at the monorepo root.
