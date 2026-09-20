# raadrecruitment.ae

## Backend-only enquiry-read retirement — 2026-09-19

This source change removes the enquiry list/export/single-record/manual-retry
mounts. It does not change contact submission, signed outbound FLOW intake,
Pipedrive delivery, authentication, credentials, or the private retry store.
Production deployment status is recorded separately in
`/opt/ops/flow-lead-read-retirement-20260918/STATUS.md`; a source commit or build
alone does not establish that a backend has switched.

Raad has independently selected presentation and trusted-backend releases.
The presentation selected before this change is `f5476350`; the older backend
is `b8796c84`. To keep this retirement from also changing the retained backend
CMS content, exact public-source posts, pages and authors from `b8796c84` are
kept under `src/backend-compatibility/b8796c84/`. These are public website
content, not enquiries or production credentials.

Only the trusted backend's exact root-launcher environment marker
`INTERNAL_ADMIN_DIR=/data/internal-admin` selects those content snapshots and
the previous backend blog handler. The marker is captured once when the
process starts. It is not an authentication or delivery setting. The offline
build and secretless presentation omit it and continue using the current
`src/data` content and current blog handler. Do not restore the old snapshots
over `src/data` or set this marker in a presentation build/runtime.

Reads and writes use the same selected content path; categories and tags keep
their original paths. The immutable backend's existing inability to write
source JSON is not repaired by this change. Synthetic writable-fixture tests
must not be reported as evidence that production CMS writes are healthy.

The three WordPress stub mounts added after the selected old backend are
excluded from this backend retirement. They were never active on that backend;
their removal does not remove an existing production WordPress service.
The current presentation pointer is not changed. Stale backend fallback HTML
is not the authority for today's public presentation.

The root-owned preservation package under
`/opt/ops/raad-backend-preservation-20260919/` records the fixed public-source
blob hashes, synthetic tests and separate marked/unmarked runtime proofs.
Deployment requires the reviewed signed-child build, isolated compatibility
canary, route-absence checks, guarded backend transaction and fresh signed
FLOW proof. Historical local-development claims below are not current
production deployment or write-health evidence.

RAAD Recruitment — UAE free zone business setup (Astro fleet site).

| | |
|--|--|
| **Port** | `5113` |
| **Unit** | `raadrecruitment` |
| **Peer** | Full CMS (`FEATURES_FULL_CMS`) — scaffolded from `eormiddleast.com` structure |
| **Package** | `raadrecruitment-astro` |

## Local

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up raadrecruitment
node scripts/fleet-local.mjs smoke raadrecruitment
```

## Local run (Phase 06)

See **[LOCAL-TEST.md](./LOCAL-TEST.md)** for the full clickable checklist.

```bash
# From monorepo root
node scripts/fleet-local.mjs up raadrecruitment
node scripts/fleet-local.mjs smoke raadrecruitment
# → http://127.0.0.1:5113/
```

Verified green: homepage, `/about-us/`, `/contact-us/`, `/insights/`, `/search/`, 404, health, SEO files, redirects, full-CMS bearer APIs, contact POST. `.env` / `.env.prod` gitignored (not tracked).

## Security / deploy (Phases 07–08)

| Check | Status |
|-------|--------|
| Harden gates G1–G13 | local pass |
| `deploy/raadrecruitment.service` · `raadrecruitment.ae.caddy` · `ROOT_SETUP.md` | yes |
| `caddy/Caddyfile.production` site block + www one-hop | yes |
| Production secret | generate with `openssl rand -hex 32` (see ROOT_SETUP) |

## Phase 09 (server cutover) — pending ops

Not run from this laptop. Follow `docs/13-go-live-server-handoff.md` on `178.105.150.67`.

## Redirects / SEO (Phase 05)

| Check | Status |
|-------|--------|
| `imports/redirects/` + dated CSV audit sample | yes |
| `src/data/redirects.yml` → middleware 301 | `/home/`, `/index.php/` → `/` |
| `pnpm redirects:generate` → `public/_redirects*` | yes |
| `/robots.txt`, `/sitemap_index.xml`, `/page-sitemap.xml` | 200 |
| `/llms.txt`, `/llm.txt` | 200 (defaults fixed) |
| Local `PUBLIC_SITE_URL` | `http://127.0.0.1:5113` |

Empty `/post-sitemap.xml` returns **404** until posts are imported (peer Rank Math behaviour). Drop a live Rank Math export into `imports/redirects/` when available and merge into `redirects.yml`.

## Forms / attribution (Phase 04)

| Check | Status |
|-------|--------|
| `POST /api/contact` JSON → file lead store → Pipedrive | yes |
| Client + server validation (`parse-contact-body` + `validate`) | yes |
| `lib/attribution/*` + `mergeAttributionIntoContactForm` | yes |
| Ads/UTM aliases (`campaignid`, `adgroupid`, `creative`, `loc_*`, …) | yes |
| `ContactForm.astro` / `ContactForm.cg.astro` hidden fields + capture | yes |
| Legacy mirror: `public/js/astro-mirror-fixes.js` `captureTrackingFields` | yes |
| Pipedrive `fieldKeys` defaults in `src/env/server.ts` | yes |
| `.data/leads` gitignored | yes |

Local attribution smoke:

```bash
curl -sS -X POST "http://127.0.0.1:5113/api/contact/" \
  -H 'content-type: application/json' -H 'origin: http://127.0.0.1:5113' \
  -d '{"name":"Ads User","email":"ads@example.com","phone":"+971500000000","message":"test","gclid":"test","campaignid":"1","device":"m"}'
# Inspect .data/leads/state/*.json for gclid / campaignId / device
```

## Fleet / FLOW (Phase 03)

| Check | Status |
|-------|--------|
| `scripts/fleet-sites.json` · port **5113** · `raadrecruitment` | registered |
| `@connect/site-cms` + `src/cms.ts` · `FEATURES_FULL_CMS` · `siteId: raadrecruitment` | bound |
| `src/middleware.ts` imports `./cms` first; `/internal/operations*` → 404 | yes |
| Thin `src/pages/api/internal/*` → `@connect/site-cms` | yes |
| `GET /api/health/` · `POST /api/contact/` · geo routes | yes |
| Deploy templates · `deploy/raadrecruitment.service` · `raadrecruitment.ae.caddy` | yes |
| Register domain + `INTERNAL_JOB_SECRET` in central FLOW | **pending** (production) |

Bearer smoke (local):

```bash
SECRET=local-fleet-test-secret   # from fleet-local .env
curl -sS -H "Authorization: Bearer $SECRET" http://127.0.0.1:5113/api/internal/posts/
curl -sS -H "Authorization: Bearer $SECRET" http://127.0.0.1:5113/api/internal/redirects/
curl -sS -H "Authorization: Bearer $SECRET" http://127.0.0.1:5113/api/internal/gtm/
```

See `docs/ADMIN.md` and `docs/CONNECT-ASTRO-FLEET-STANDARD.md`.

## Notes

- Live WordPress content/assets not imported yet (Phase 02+ content work).
- Re-run malware scan after any WP mirror lands under `public/` or `source/`.
- Generate a unique production secret: `openssl rand -hex 32` → `INTERNAL_JOB_SECRET` (never reuse across domains).
