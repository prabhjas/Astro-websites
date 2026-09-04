# Connect Group — Astro fleet standard

**Copy this file into every site repo** (`evolutionmiddleast`, `cbss`, `spheavyrental`, `iberiaworkforce`, …) and treat it as the shared contract.

| Field | Value |
|-------|--------|
| **Version** | 1.0 — 2026-07-31 |
| **Reference site (source of truth)** | `evolutionmiddleast.com` → `/opt/Astro-production/evolutionmiddleast.com` |
| **Host** | Astro box `178.105.150.67` · deploy root `/opt/Astro-production/` |
| **Goal** | Same layout, same engine pins, same CMS API shape, same harden gates — before site #5 and before ~40 mirrors |

**Repos that already implement this (or are closest):** Evolution Middle East; CBSS (Astro 7.1.6 + leads CMS APIs, Jul 2026).  
**Repos that must catch up:** SP Heavy Rental (near-duplicate CMS — align pins + gates), Iberia (prod process + 7.1 pin).

---

## 1. Non-negotiable decisions

| Topic | Required | Forbidden |
|-------|----------|-----------|
| Package manager (fleet direction) | **pnpm** content-addressed store; each site keeps its own `package.json` | One shared/hoisted `node_modules` for all domains |
| Astro / adapter versions | **Exact pins** (no `^` on fleet packages) | Carets that drift by install date |
| CMS code | Eventually one package `@connect/site-cms`; until then **match Evolution’s API surface + auth** | Per-site dashboard UI; forked internal APIs that diverge |
| Auth for machine APIs | Per-site `INTERNAL_JOB_SECRET` bearer | Giving central CMS `DASHBOARD_SESSION_SECRET`; cookie login for jobs |
| TLS / forms | `security.allowedDomains` + contact bodies as **JSON** | Raw FormData POSTs that trip Astro `checkOrigin` behind Caddy HTTP |
| Unknown URLs | **404** | 503 + `prepare:page` text |
| Prod process | `astro build` → `node ./dist/server/entry.mjs` | `astro dev` in production |
| `.env.prod` | Secrets only; **no** `HOST`/`PORT`; **LF** line endings only | CRLF; bind address in env file |
| Process isolation (ops) | Per-site unix user + `MemoryMax` | All units as `root` with no memory caps |
| Caddy | One guarded canonical Caddyfile + validation before graceful reload | Split-file or staged Caddyfile installs |
| Backups | Off-box restic/borg + restore drill | Disk scrub only |

---

## 2. Fleet version pin (exact)

Every SSR site must declare **exact** versions (drop carets):

```json
{
  "engines": {
    "node": ">=22.12.0",
    "npm": ">=9.6.5"
  },
  "dependencies": {
    "astro": "7.1.6",
    "@astrojs/node": "11.0.3"
  },
  "devDependencies": {
    "typescript": "5.9.2"
  }
}
```

| Package | Pin | Notes |
|---------|-----|--------|
| Node | `>=22.12.0` on host | Host already on 22.x |
| `astro` | `7.1.6` | Not `^7.1.6`, not 5.x, not 7.0.x |
| `@astrojs/node` | `11.0.3` | Must match Astro 7 line (not 9.x) |
| TypeScript | `5.9.x` exact | Prefer `5.9.2` |
| Tailwind (if used) | `4.x` exact | Iberia on 3.x must migrate or document exception |
| `@connect/site-cms` (when exists) | **Exact** per site | Staged rollout: canary → rest; no `^` |

**CBSS today:** Astro `5.12` + `@astrojs/node` `9.x` — treat upgrade as its **own milestone** (breaking). Do not ship new CBSS features on Astro 5.

**Lockfiles:** Generate on **Linux** (or include both `darwin` + `linux` optional bindings) so `pnpm install` / `npm ci` works on the server.

---

## 3. Standard on-disk layout

### 3.1 Per-site tree (required shape)

```text
/opt/Astro-production/<domain>/          # later: .../sites/<domain>/
  .env.prod                 # root-readable by service user; mode 600
  .env.example              # committed; no secrets
  package.json              # exact pins + engines
  pnpm-lock.yaml            # or package-lock until pnpm cutover
  astro.config.mjs          # site URL + security.allowedDomains
  src/
  public/
  dist/                     # or releases/<id> + current -> symlink
  deploy/                   # unit snippet, Caddy snippet, ROOT_SETUP notes
  docs/
  .data/                    # leads, uploads, admin JSON — NOT in git
```

### 3.2 Target monorepo (platform direction)

```text
/opt/Astro-production/
├── pnpm-workspace.yaml
├── packages/
│   ├── site-cms/           # @connect/site-cms
│   └── site-config/        # shared config + unit/Caddy templates
└── sites/
    ├── cbss.ae/
    ├── evolutionmiddleast.com/
    ├── iberiaworkforce.com/
    └── spheavyrental.ae/
```

Until the monorepo exists: keep each git repo separate, but **obey this standard** so merge into `sites/<domain>/` is mechanical.

---

## 4. Application harden gates (every site)

Copy Evolution’s behaviour. Block “ready for factory / CMS connect” until all pass.

| # | Gate | Pass criteria |
|---|------|----------------|
| G1 | Unknown URL | HTTP **404**; body has no `prepare:page`, no 503 “not prepared” |
| G2 | HTTPS Origin | Behind Caddy: `POST /api/contact` with JSON + `Origin: https://…` is **not** 403 |
| G3 | Health | `GET /api/health` → `200` + `{ "ok": true, ... }` |
| G4 | Access log | Node emits structured `http_access` (or equivalent) for HTML/API |
| G5 | No per-site CMS UI | No `/internal/operations/*`; humans use central CMS |
| G6 | Machine auth | All `/api/internal/*` require bearer `INTERNAL_JOB_SECRET` (or header/`?secret=`) |
| G7 | Env | `.env.prod` has no `HOST`/`PORT`; LF only; `INTERNAL_JOB_SECRET` set |
| G8 | Prod binary | Unit runs built `dist/server/entry.mjs`, not `astro dev` |
| G9 | Lockfile | Clean install + `astro build` on Linux |
| G10 | allowedDomains | `astro.config` lists apex + `www` for https (and http if needed) |

### 4.1 `astro.config` pattern

```js
security: {
  allowedDomains: [
    { hostname: 'www.example.com', protocol: 'https' },
    { hostname: 'example.com', protocol: 'https' },
  ],
},
adapter: node({ mode: 'standalone' }),
output: 'static', // pages static; APIs via Node adapter
```

### 4.2 Contact client

Public forms must `POST` **JSON** to `/api/contact` (not multipart FormData), so Astro’s form `checkOrigin` path is avoided while still validating Origin for JSON if you add checks.

---

## 5. Central CMS API contract

Per-site dashboards are **removed**. Central CMS calls each site.

### 5.1 Auth

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Also accepted: `x-internal-job-secret: <secret>` or `?secret=<secret>` (cron only).

- **One secret per site** — never reuse across domains.
- Do **not** use dashboard session cookies as the machine credential.

### 5.2 Public

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| POST | `/api/contact` | Lead capture (JSON) |

### 5.3 Internal — reads (JSON)

| Method | Path |
|--------|------|
| GET | `/api/internal/leads` |
| GET | `/api/internal/leads/:publicId` |
| GET | `/api/internal/export-leads` |
| GET | `/api/internal/posts` |
| GET | `/api/internal/posts/:slug` |
| GET | `/api/internal/posts/categories` |
| GET | `/api/internal/posts/tags` |
| GET | `/api/internal/redirects` |
| GET | `/api/internal/gtm` |

### 5.4 Internal — writes

Posts / categories / tags save+delete · redirects save/delete/bulk/import · GTM save · SEO text/llms/sitemap · uploads · PHP files · `POST /api/internal/retry-lead` · `GET|POST /api/internal/run-retries`.

Mutations return **JSON** (`{ "success": true, ... }`), not 303 redirects to a dashboard.

### 5.5 Env keys (minimum)

```bash
PUBLIC_SITE_URL=https://www.example.com

LEAD_STORE_DIR=.data/leads
INTERNAL_JOB_SECRET=
INTERNAL_ADMIN_DIR=.data/internal-admin
INTERNAL_UPLOAD_DIR=.data/internal-uploads
INTERNAL_ENHANCED_LIVE_DIR=.data/enhanced-live

# Pipedrive + WEBSITE_ID as required by contact pipeline
WEBSITE_ID=
WEBSITE_NAME=
PIPEDRIVE_API_TOKEN=
# ... site-specific Pipedrive fields

# Do NOT set HOST or PORT here — systemd sets them.
```

---

## 6. Deploy & runtime (per site)

### 6.1 Build / restart

```bash
# On server (or CI → rsync dist)
pnpm install   # or npm ci until pnpm cutover
pnpm run build # or npm run build
sudo site-ctl restart <unit-name>
```

Preserve on deploy: `.env.prod`, `.data/`. Do not overwrite secrets with empty local files.

### 6.2 Systemd template (Tier 1 — required)

```ini
[Service]
User=site-<shortname>
Group=site-<shortname>
WorkingDirectory=/opt/Astro-production/<domain>
EnvironmentFile=-/opt/Astro-production/<domain>/.env.prod
Environment=HOST=127.0.0.1
Environment=PORT=<unique-port>
Environment=NODE_ENV=production
ExecStart=/usr/bin/node ./dist/server/entry.mjs
MemoryMax=256M
MemoryHigh=200M
CPUQuota=50%
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/Astro-production/<domain>/.data
# add other writable paths if LEAD_STORE_DIR is outside tree
```

| Site | Example unit / port (confirm on host) |
|------|----------------------------------------|
| evolutionmiddleast.com | `evolutionmiddleast` · often `5080` |
| cbss.ae | `cbss` · confirm |
| iberiaworkforce.com | `iberiaworkforce` · confirm |
| spheavyrental.ae | confirm |

### 6.3 Caddy

- Production uses the single reviewed `/etc/caddy/Caddyfile`, mirrored by `caddy/Caddyfile.production`; never add a `sites.d` import.
- Always `caddy validate` before `reload`.
- Proxy to `127.0.0.1:<PORT>` for SSR sites; use `file_server` for pure static brochure sites.

### 6.4 Rollback

Keep last good `dist` (e.g. `dist.prev-*`) or `releases/<id>` + `current` symlink. Revert → restart → smoke G1–G3.

---

## 7. Shared CMS package (before site #5)

| Step | Action |
|------|--------|
| 1 | Extract Evolution `src/pages/api/internal/**` + lead/post/redirect/GTM libs → `@connect/site-cms` |
| 2 | Evolution imports package (canary) |
| 3 | SP Heavy deletes duplicate tree; same package + **exact** version pin |
| 4 | CBSS / Iberia after Astro 7.1 pin |
| 5 | Rollouts: 1 site → rest (never bump all 40 on `^`) |

Per-site differences = **config / env / content**, not forked handlers.

---

## 8. Process / capacity rules

- Budget **~110–120 MB RSS** per SSR process; 40 SSR ≈ ~4.5 GB on a 15 GB box.
- **Only** run Node if the site needs forms, `/api/*`, or CMS APIs.
- Pure brochure → static build + Caddy `file_server` (0 MB Node).
- Shard to 3–4 hosts only after ~10 SSR sites — **after** Tier 1 isolation + backups.

---

## 9. Per-repo catch-up checklist

Paste into each workspace and tick.

### 9.1 All sites

- [ ] This document committed as `docs/CONNECT-ASTRO-FLEET-STANDARD.md` (or repo root)
- [ ] Exact pins: `astro@7.1.6`, `@astrojs/node@11.0.3`
- [ ] `engines.node` ≥ 22.12
- [ ] `security.allowedDomains` for this hostname
- [ ] `404.astro` + catch-all never serves prepare:page 503
- [ ] `GET /api/health`
- [ ] No `/internal/operations` UI
- [ ] `/api/internal/*` bearer-only; JSON mutations
- [ ] Contact posts JSON; HTTPS Origin smoke passes
- [ ] `.env.example` documents `INTERNAL_JOB_SECRET`; no HOST/PORT
- [ ] Unit: built entry, not `astro dev`
- [ ] Linux-clean lockfile + build

### 9.2 Evolution (reference)

- [x] Gates G1–G10 largely done on prod (2026-07)
- [ ] Exact pin (remove remaining `^` on astro/adapter)
- [ ] Tier 1 unit user + MemoryMax
- [ ] Donate code → `@connect/site-cms`

### 9.3 SP Heavy (`spheavyrental.ae`)

- [ ] Diff `/api/internal` vs Evolution; close gaps
- [ ] Same auth + health + 404 + allowedDomains
- [ ] Exact version pins
- [ ] Switch to `@connect/site-cms` when package exists (delete fork)
- [ ] Tier 1 unit + Caddy snippet under `deploy/`

### 9.4 CBSS (`cbss.ae`)

- [x] **Major:** Astro 5 → 7.1.6 + adapter 11 (own test plan)
- [x] Port middleware / security.allowedDomains / contact JSON
- [x] Align internal API surface to §5 leads subset (health, leads, export, retry, run-retries); posts/CMS when package lands
- [x] Remove per-site dashboard (`/internal/operations` → 404)
- [x] Exact pins after upgrade; Tier 1 unit + Caddy snippet under `deploy/`

### 9.5 Iberia (`iberiaworkforce.com`)

- [ ] Confirm ExecStart; **stop `astro dev` in prod** if present
- [ ] Astro `7.1.6` + Tailwind 4 (or written exception)
- [ ] Exact pins; health; Origin; bearer CMS as applicable

---

## 10. Smoke tests (run after every deploy)

```bash
BASE=https://www.example.com   # set per site
SECRET=…                       # INTERNAL_JOB_SECRET

curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -sS "$BASE/api/health"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"   # expect 404
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/api/internal/leads"          # expect 403
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/leads?limit=1" # expect 200
curl -sS -X POST "$BASE/api/contact" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE" \
  -d '{"name":"Smoke","email":"smoke@example.com","phone":"+971500000000","message":"smoke","website":""}'
```

---

## 11. Work order (fleet, not per-repo alone)

| Priority | Work | Owner hint | Est. |
|----------|------|------------|------|
| P0 | Iberia prod process; unit `User=`+MemoryMax×4; split Caddy; off-box backup | Needs **root** | 1–2 days |
| P1 | Exact pins Evo+SP Heavy; pnpm pilot; Iberia→7.1.6 | Dev + ops | 1–2 days |
| P1b | CBSS Astro 5→7 | Dev | 2–3 days |
| P2 | `@connect/site-cms` + Evo + SP Heavy | Dev | 2–4 days |
| P3 | Static vs SSR inventory; release symlinks | Ops | ongoing |

Do **not** add site #5 until P0 is green and either `@connect/site-cms` exists or an explicit exception is written.

---

## 12. How to use this file in another workspace

1. Copy **this entire file** into `docs/CONNECT-ASTRO-FLEET-STANDARD.md`.
2. Replace hostname examples in §4–§5–§10 with that site’s domain.
3. Tick §9 checklist for that repo.
4. Prefer matching Evolution’s `src/pages/api/internal/**` and auth helper until the shared package lands — then delete the fork.
5. Do not invent a second dashboard or a second auth scheme.

**Reference implementation:** `https://github.com/prabhjas/astro-evolutionmiddleast.com` (internal APIs, health, 404, Origin, env example).

---

## 13. Observability (required with Tier 1)

| Layer | Requirement |
|-------|-------------|
| **Caddy** | Per-site (or global) **access logs** in JSON; error logs to journald or `/var/log/caddy/`; rotate |
| **Node** | Structured JSON stdout; `http_access` for HTML/API (Evolution pattern) |
| **Health** | `GET /api/health` probed by ops / Caddy / monitoring |
| **Alerts** | Unit restart storms, 5xx rate, `/api/contact` failures, disk on `LEAD_STORE_DIR` |
| **Retention** | ≥14 days access logs; lead JSON per site policy |

Without Caddy access logs, cutovers and outages cannot be proved from the edge.

---

## 14. Appendix — fleet state when this was written (Jul 2026)

| Site | Astro | `@astrojs/node` | Tailwind | TS | Gap vs this standard |
|------|-------|-----------------|----------|-----|----------------------|
| cbss.ae | 7.1.6 | 11.0.3 | — | 5.9.2 | Leads CMS APIs aligned; posts/GTM/SEO via `@connect/site-cms` later |
| iberiaworkforce.com | 7.0.3 | 11.0 | 3.4 | 6.0 | Pin 7.1.6; Tailwind 4; **no `astro dev` in prod** |
| evolutionmiddleast.com | 7.1.6 | 11.0 | — | 5.9 | Reference; still has `^` carets + root unit |
| spheavyrental.ae | 7.1.6 | 11.0 | 4.3 | 5.9 | Duplicate `/api/internal` tree → adopt `@connect/site-cms` |

**Disk:** ~1.16 GB `node_modules` across 4 sites (~290 MB each) → ~12 GB at 40 with npm copies → **pnpm store** target ~1–2 GB.

**Ops facts that drove Tier 1:** every unit runs as **root**; no `MemoryMax`; one monolithic Caddyfile (~130 directives) with `.bak` scares; **no off-box backups** (only disk scrub). One RCE or OOM today = all sites / all `.env.prod` / all Pipedrive keys.

**Blast radius (accept consciously):** one host + one Caddy + one flow server. Mitigate with Tier 1 isolation first; shard to 3–4 hosts only after ~10 SSR; push static sites off Node (CDN/object storage later). Shared CMS package must use **exact** versions + staged rollout so a bad release does not hit 40 sites at once.

**Deploy gotcha (Evolution):** root-owned `.env` can block `astro build` in the prod tree — build in a writable staging dir or fix ownership; never overwrite `.env.prod` / `.data` on rsync.

### Open questions (ops — resolve with Aaron)

1. Off-box backup destination (S3 / B2 / VPS) and credential owner?
2. Unix user naming: `site-evolutionmiddleast` vs short `site-evo`?
3. Who installs units / reloads Caddy (root vs expanded `site-ctl`)?
4. Confirm Iberia ExecStart before changing.
5. Can CBSS stay on Astro 5 one more week while Tier 1 lands?

Detailed day-by-day execution: keep `docs/15-platform-work-plan.md` in the Evolution repo (or copy alongside this file).

---

## 15. Changelog

| Date | Change |
|------|--------|
| 2026-07-31 | v1.0 — Initial fleet standard from Evolution reference + Aaron platform review |
| 2026-07-31 | v1.1 — Appendix: version matrix, disk/ops facts, observability, blast radius, open questions, deploy gotcha |
| 2026-09-04 | Lead delivery: Flow added as a second, independent destination alongside Pipedrive (site id `cbss`). Config in this site's backend env; adapter is shared in `@connect/site-cms`. Verify with `GET /api/internal/run-retries/?selftest=flow`. |
