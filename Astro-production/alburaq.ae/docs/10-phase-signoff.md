# Phase 01–10 sign-off — alburaq.ae

| Field | Value |
|-------|--------|
| **Date** | 2026-08-07 |
| **Branch** | `tabish-branch` |
| **Peer** | `pittant.com` · `FEATURES_FULL_CMS` |
| **Port / unit** | **5120** / `alburaq` |
| **Canonical** | `https://alburaq.ae` |
| **Local** | `http://127.0.0.1:5120` |
| **Developer verdict** | **Phases 01–08 + 10 PASS** · Phase 09 **handoff ready** (host sync + owner Caddy pending) |

## Phase map

| Phase | Status | Evidence |
|-------|--------|----------|
| **01** Security scan | **PASS** | `docs/01-malware-scan-report.md` — 0 PHP in `public/` |
| **02** Convert / place | **PASS** | `Astro-production/alburaq.ae/` · 87 cleaned HTML · 744 WP assets |
| **03** Fleet + CMS + FLOW | **PASS** | `fleet-sites.json` scaffolded · `src/cms.ts` FULL_CMS · thin `/api/internal/*` |
| **04** Forms / attribution / Pipedrive | **PASS** | `/api/contact` · gclid/campaignId/device on leads · no SMTP required |
| **05** Redirects / SEO / slash / llms | **PASS** | `trailingSlash: always` · robots/sitemaps/llms 200 · absolute canonicals |
| **06** Local run + smoke | **PASS** | `fleet-local up/smoke alburaq` green |
| **07** Harden gates | **PASS** | unique secret · internal 403/200 · contact validation · allowedDomains |
| **08** Deploy templates (git only) | **PASS** | `deploy/*` · `caddy/Caddyfile.production` alburaq block — **not** live-reloaded |
| **09** Server app sync | **READY / PENDING HOST** | `docs/13-go-live-server-handoff.md` + `deploy/ROOT_SETUP.md` — needs webdev sync to `178.105.150.67` |
| **10** Go-live verify (loopback) | **PASS** | `docs/10-go-live-verify-report.json` — **38/38** checks |
| **Owner** Caddy cutover | **NOT STARTED** | `docs/OPS-OWNER-CADDY-CUTOVER.md` (root only) |

## Phase 10 matrix (loopback)

| Check block | Local |
|-------------|-------|
| 1 Trailing slash | ✅ |
| 2 Canonical / SEO | ✅ |
| 3 GTM / GA4 (`G-9WMEJS3R07`) | ✅ |
| 4 Forms / attribution | ✅ |
| 5 Internal APIs | ✅ |
| 6 Redirects store | ✅ |
| 7 Process / deploy templates | ✅ |
| 8 Cleanup / no SMTP | ✅ |
| 9 404 branding | ✅ |
| 10 Content + media (10 pages / 77 posts) | ✅ |

## Re-run locally

```bash
pnpm install
node scripts/fleet-local.mjs up alburaq
node scripts/fleet-local.mjs smoke alburaq
pnpm --filter alburaq-astro run verify:phase10
```

## Paste for owner

*Phase 01–08 + 10 complete for alburaq.ae. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md (`docs/10-go-live-verify-report.json`). Phase 09: sync app to `/opt/Astro-production/alburaq.ae/` per site `docs/13-go-live-server-handoff.md`. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md (Caddy + root units already templated in git).*
