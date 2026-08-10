# Movey local asset audit

Generated: 2026-08-07T12:50:03.441Z

## Status
**PASS** after restore + fill (Connect FZ soft-404 mode mitigated).

## What went wrong (same as Connect FZ)
Live WordPress/Astro **301s missing upload URLs to the homepage HTML**. Early `prepare:page --download` / `assets:download-all` **followed redirects and saved HTML as `.jpg`/`.png`**, then **skipped** those paths on later runs because the file “existed”.

## Fixes applied
1. Restored 74 junk uploads via WP media (token-scored) + same-page featured-image fallbacks (`scripts/restore-junk-uploads.mjs`).
2. Filled 95 missing refs (resize `-WxH` from local full-size + live fetch with HTML rejection) (`scripts/fill-missing-assets.mjs`).
3. Hardened `prepare-page.mjs` and `download-all-assets.mjs` to **never write HTML soft-404s** and **never skip junk files**.
4. Gate: `pnpm run assets:verify` → `scripts/verify-local-assets.mjs` (fail build if missing/html-junk).

## Pre-deploy checklist
- [ ] `pnpm run assets:verify`
- [ ] `pnpm run build` (runs sync-public-to-dist)
- [ ] Smoke key pages on localhost — images load from `/` only (no hotlinked movey.ae uploads)
