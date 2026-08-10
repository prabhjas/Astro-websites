# Phase 02 sign-off — connectbusinesscenter.com

| | |
|--|--|
| **Port** | **5116** |
| **Peer** | Full CMS — `companyformationsaudi.com` |
| **Package** | `connectbusinesscenter-astro` |
| **Fleet status** | **scaffolded** (`scripts/fleet-sites.json` + `docs/FLEET-PORT-REGISTRY.md`) |
| **Prepared mirrors** | **222/222** `src/legacy/*.cleaned.html` |
| **Build** | `pnpm --filter connectbusinesscenter-astro run build` — OK |

## Done

- [x] Astro app under `Astro-production/connectbusinesscenter.com/`
- [x] Rebranded from CFS peer (domain, port 5116, form name, `siteId`)
- [x] Preserved Phase 01 `source/` + `public/` assets
- [x] Restored CBC sitemap inventory (27 pages + 195 posts)
- [x] `prepare:all` → 222 cleaned HTML
- [x] Shared chrome extracted (`extract-chrome.mjs`)
- [x] Root `pnpm install` + production build succeeded
- [x] Fleet registry → scaffolded (33 scaffolded / 12 placeholders)

## Verify

1. `package.json` name is `connectbusinesscenter-astro`
2. Spot-check `src/legacy/homepage.cleaned.html`
3. Spot-check a post slug cleaned file
4. Confirm `scripts/fleet-sites.json` status is `scaffolded` for id `connectbusinesscenter`

## Next

Phase 03 — CMS/FLOW wiring check (`src/cms.ts`, thin `/api/internal/*`, middleware, `.env` from example).
