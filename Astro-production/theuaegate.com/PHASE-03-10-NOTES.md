# theuaegate.com — Phases 03–10 local completion notes

**Date:** 2026-08-10  
**Port:** 5117  
**Peer:** connectbusinesscenter.com  
**Branch:** mushtaq-branch  

## Phase 03 — Fleet + CMS + FLOW

- [x] `FEATURES_FULL_CMS` in `src/cms.ts` (`siteId: theuaegate`)
- [x] Middleware imports `./cms` first
- [x] Thin `/api/internal/*` mounts (peer)
- [x] `runtime-gtm.js.ts` + GTM store/inject
- [x] Fleet id `theuaegate` status `scaffolded`

## Phase 04 — Forms / attribution

- [x] `POST /api/contact` wired
- [x] Attribution lib present (`src/lib/attribution/*`)
- [x] CF7 mirror bridge via `public/js/astro-mirror-fixes.js`
- [x] Local smoke contact **PASS** (placeholder Pipedrive token in gitignored `.env`)

## Phase 05 — Redirects / SEO / slash

- [x] Trailing slash middleware + `trailingSlash: "always"`
- [x] `/sitemap_index.xml` → post + page children (canonical https)
- [x] `/robots.txt` points at `https://theuaegate.com/sitemap_index.xml`
- [x] `/llms.txt` 200
- [x] `published-pages.yml` seeded (113)
- [x] Redirects stub `src/data/redirects.yml` (import live Redirection JSON in a follow-up if needed)

## Phase 06 — Local run

- [x] `fleet-local build/up` green
- [x] Smoke: homepage, health, 404, internal-deny, internal-auth, contact — **all PASS**
- [x] Sample pages: `/about-us/` 200, `/freelance-visa-in-dubai/` 200
- [x] Bare `/about-us` → 301 `/about-us/`

## Phase 07 — Harden

- [x] Bearer-only internal auth (unauth 403)
- [x] `checkOrigin` + allowedDomains for theuaegate / localhost
- [x] Mirror hygiene via `sanitizeMirrorHtml`
- [x] Post-prepare PHP under `public/`: **0**
- [ ] Replace placeholder `PIPEDRIVE_API_TOKEN` / generate unique prod `INTERNAL_JOB_SECRET` before server `.env.prod`

## Phase 08 — Deploy templates (git)

- [x] `deploy/theuaegate.service` PORT 5117
- [x] `deploy/theuaegate.com.caddy`
- [x] Block + www redirect added to `caddy/Caddyfile.production` (git only — do not reload live Caddy)

## Phase 09 — Server sync

- [ ] Owner/webdev: rsync app + `.env.prod` to host, enable systemd unit (not done from laptop)

## Phase 10 — Local verify snapshot

| Check | Result |
|-------|--------|
| Trailing slash | PASS |
| Canonical host in sitemap/robots | `https://theuaegate.com` |
| GTM runtime | `/runtime-gtm.js` 200 + `recreateScript` |
| Forms | Smoke contact PASS |
| APIs health/internal | PASS |
| 404 brand | The UAE Gate title |
| Content | 113 cleaned mirrors + 88 blog JSON |

## Content inventory

- Exports: 113 (`source/wordpress-exports/`)
- Cleaned: 113 (`src/legacy/*.cleaned.html`)
- Blog posts migrated: 88
- Homepage + chrome header/footer extracted
