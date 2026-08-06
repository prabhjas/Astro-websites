# ngmanpower.com

NG Manpower — UAE free zone business setup (Astro fleet site).

| | |
|--|--|
| **Port** | `5102` |
| **Unit** | `ngmanpower` |
| **Peer** | Full CMS (`FEATURES_FULL_CMS`) — scaffolded from `eormiddleast.com` structure |
| **Package** | `ngmanpower-astro` |

## Local

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up ngmanpower
node scripts/fleet-local.mjs smoke ngmanpower
```

## Local run (Phase 06)

See **[LOCAL-TEST.md](./LOCAL-TEST.md)** for the full clickable checklist.

```bash
# From monorepo root
node scripts/fleet-local.mjs up ngmanpower
node scripts/fleet-local.mjs smoke ngmanpower
# → http://127.0.0.1:5102/
```

Verified green: homepage, `/about-us/`, `/contact-us/`, `/insights/`, `/search/`, 404, health, SEO files, redirects, full-CMS bearer APIs, contact POST. `.env` / `.env.prod` gitignored (not tracked).

## Security / deploy (Phases 07–08)

| Check | Status |
|-------|--------|
| Harden gates G1–G13 | local pass |
| `deploy/ngmanpower.service` · `ngmanpower.com.caddy` · `ROOT_SETUP.md` | yes |
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
| Local `PUBLIC_SITE_URL` | `http://127.0.0.1:5102` |

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
curl -sS -X POST "http://127.0.0.1:5102/api/contact/" \
  -H 'content-type: application/json' -H 'origin: http://127.0.0.1:5102' \
  -d '{"name":"Ads User","email":"ads@example.com","phone":"+971500000000","message":"test","gclid":"test","campaignid":"1","device":"m"}'
# Inspect .data/leads/state/*.json for gclid / campaignId / device
```

## Fleet / FLOW (Phase 03)

| Check | Status |
|-------|--------|
| `scripts/fleet-sites.json` · port **5102** · `ngmanpower` | registered |
| `@connect/site-cms` + `src/cms.ts` · `FEATURES_FULL_CMS` · `siteId: ngmanpower` | bound |
| `src/middleware.ts` imports `./cms` first; `/internal/operations*` → 404 | yes |
| Thin `src/pages/api/internal/*` → `@connect/site-cms` | yes |
| `GET /api/health/` · `POST /api/contact/` · geo routes | yes |
| Deploy templates · `deploy/ngmanpower.service` · `ngmanpower.com.caddy` | yes |
| Register domain + `INTERNAL_JOB_SECRET` in central FLOW | **pending** (production) |

Bearer smoke (local):

```bash
SECRET=local-fleet-test-secret   # from fleet-local .env
curl -sS -H "Authorization: Bearer $SECRET" http://127.0.0.1:5102/api/internal/posts/
curl -sS -H "Authorization: Bearer $SECRET" http://127.0.0.1:5102/api/internal/redirects/
curl -sS -H "Authorization: Bearer $SECRET" http://127.0.0.1:5102/api/internal/gtm/
```

See `docs/ADMIN.md` and `docs/CONNECT-ASTRO-FLEET-STANDARD.md`.

## Notes

- Live WordPress content/assets not imported yet (Phase 02+ content work).
- Re-run malware scan after any WP mirror lands under `public/` or `source/`.
- Generate a unique production secret: `openssl rand -hex 32` → `INTERNAL_JOB_SECRET` (never reuse across domains).
