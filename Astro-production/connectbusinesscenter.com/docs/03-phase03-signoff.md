# Phase 03 sign-off — connectbusinesscenter.com

| | |
|--|--|
| **Port** | **5116** |
| **Fleet id** | `connectbusinesscenter` · status **scaffolded** |
| **Features** | `FEATURES_FULL_CMS` |
| **siteId** | `connectbusinesscenter` |

## Checklist (FLOW onboarding Steps B–J)

| Step | Status |
|------|--------|
| B Fleet register | Done (port 5116, status scaffolded) |
| C Package + `@connect/site-cms` workspace | Done |
| D `astro.config` `allowedDomains` + `trailingSlash: always` | Done |
| E `src/cms.ts` bind FULL_CMS + posts/taxonomy adapters | Done |
| F Middleware `import './cms'` first | Done |
| G Thin `/api/internal/*` mounts (31 routes) | Done — no fat `/internal/**` UI |
| H Public APIs: `POST /api/contact`, `GET /api/health` | Done |
| I GTM skeleton: `runtime-gtm.js.ts` + `lib/gtm/{inject,store}.ts` | Done |
| J `.env.example` + local gitignored `.env` with unique `INTERNAL_JOB_SECRET` | Done |

## Verify

1. `src/cms.ts` → `siteId: 'connectbusinesscenter'`, `FEATURES_FULL_CMS`
2. `src/middleware.ts` first line is `import './cms'`
3. `src/pages/api/internal/leads/index.ts` is a thin re-export from `@connect/site-cms`
4. `.env` exists locally and is gitignored (do not commit)
5. `curl http://127.0.0.1:5116/api/health/` after Phase 06 start should return `service: connectbusinesscenter-astro`

## Next

Phase 04 — forms/attribution smoke (contact path, validation, Ads/UTM fields).
