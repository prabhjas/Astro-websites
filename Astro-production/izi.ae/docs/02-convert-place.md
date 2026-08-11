# Phase 02 — Convert / place (izi.ae)

| Field | Value |
|-------|--------|
| Domain | `izi.ae` |
| Peer | `pittant.com` |
| Mode | **full CMS** (`FEATURES_FULL_CMS`) |
| Port | **5121** |
| Package | `izi-astro` |
| Fleet id | `izi` |

## Done

- [x] Folder `Astro-production/izi.ae/`
- [x] Astro 7 + `@astrojs/node` standalone via pnpm catalog
- [x] Live Rank Math import: **21 pages + 83 posts + 11 cars** (115 mirrors)
- [x] Blog JSON migrated (83)
- [x] Assets under `public/wp-content` (+ thin `wp-includes`)
- [x] `astro build` OK → `dist/server/entry.mjs`
- [x] 404 branded to IZI logo (`/wp-content/uploads/2024/04/logo-izi.png`)
- [x] Blank `licence.json` (no DET invent)
- [x] Fleet registry + `scripts/fleet-sites.json` → scaffolded

## Fix applied during convert

Peer retarget initially broke asset regexes (`pittant.com` → `izi.com` inside `\.com` patterns). Scripts corrected to `izi.ae`; all pages re-prepared.

## Next → Phase 03

Thin `/api/internal/*` mounts, env secret, GTM skeleton already copied from peer — verify + local `.env`, then Phase 04 forms smoke.
