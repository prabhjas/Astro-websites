# Connect Group — Astro new-site playbook

**One document for converting an existing (or new) website into the Connect Group Astro fleet.**  
Share this with anyone cloning CBSS / Evolution / Iberia / SP Heavy patterns into site #5+.

| Field | Value |
|-------|--------|
| **Version** | 1.0 — 2026-07-31 |
| **Monorepo** | `Connect-Group-Tech/Astro-websites` |
| **Host** | `webdev@178.105.150.67` (`Astro`) · `/opt/Astro-production/` |
| **Reference implementations** | Leads-heavy: **cbss.ae** · Full CMS APIs: **evolutionmiddleast.com** · Slim marketing + EN/ES: **iberiaworkforce.com** · Mirror CMS: **spheavyrental.ae** |

**Related (detail):** [FLEET-PORT-REGISTRY](FLEET-PORT-REGISTRY.md) · [CONNECT-CADDY-DEPLOYMENT](CONNECT-CADDY-DEPLOYMENT.md) · [CONNECT-ASTRO-FLEET-STANDARD](../Astro-production/evolutionmiddleast.com/docs/CONNECT-ASTRO-FLEET-STANDARD.md) · [15-platform-work-plan](../Astro-production/evolutionmiddleast.com/docs/15-platform-work-plan.md) · [server-side-work](server-side-work.md) · [local-fleet-test](local-fleet-test.md) · [server-ops-only](server-ops-only.md)

---

## 0. What we already built (Jul 2026)

All four production sites live under `Astro-production/<domain>/` in this monorepo.

| Domain | Port | Unit | What landed in git |
|--------|------|------|--------------------|
| evolutionmiddleast.com | 5080 | `evolutionmiddleast` | Astro 7.1.6, full internal CMS APIs, health, 404, bearer auth, `deploy/` |
| cbss.ae | 5081 | `cbss` | Astro 5→7.1.6, leads pipeline, intl-tel + geo, dashboard removed, `deploy/` |
| spheavyrental.ae | 5082 | `spheavyrental` | Brought into fleet, Tailwind 4, CMS API mirror, `deploy/` |
| iberiaworkforce.com | 5083 | `iberiaworkforce` | Fleet-shaped: Astro 7.1.6, Tailwind 4 via Vite, `/api/contact`, leads stack, EN/ES kept |

**Fleet tooling (repo root):**

- `pnpm-workspace.yaml` + catalog pins + `.npmrc` (`store-dir=.pnpm-store`)
- One `pnpm-lock.yaml` — per-site `node_modules` are **symlinks**, not four full copies
- `scripts/fleet-local.mjs` + `scripts/fleet-sites.json` — local prod-like runner (same ports)
- Per-site `deploy/*.service`, `*.caddy`, `ROOT_SETUP.md`
- Docs 16–18 for server / local / root-only work

**Still host/root (not finished on the box — see doc 18):** Tier 1 `User=site-*` + MemoryMax, guarded canonical Caddy integration, off-box backups, Iberia port 5075→5083, SP Heavy unit install.

**Principle:** Fix shared fate and version drift at **4** sites, not at **40**. Do not invent a second dashboard or a second auth scheme.

---

## 1. Decide: SSR vs static

| Need | Choice |
|------|--------|
| Contact form, `/api/*`, Pipedrive, CMS machine APIs | **SSR** — Astro + `@astrojs/node` standalone |
| Brochure only (no forms/APIs) | **Static** — `astro build` + Caddy `file_server` (0 MB Node) |

Budget **~110–120 MB RSS** per SSR process. Only run Node when you need forms/APIs.

---

## 2. Non-negotiables

| Topic | Required | Forbidden |
|-------|----------|-----------|
| Package manager | **pnpm** workspace + content store | One hoisted `node_modules` for all domains |
| Versions | **Exact pins** via catalog / `package.json` | Carets (`^`) that drift by install date |
| Prod process | `astro build` → `node ./dist/server/entry.mjs` | `astro dev` in production |
| Forms | `POST` **JSON** to `/api/contact` | Raw FormData that breaks Origin behind Caddy |
| Unknown URLs | HTTP **404** | 503 + `prepare:page` |
| CMS UI | Central CMS only | Per-site `/internal/operations` dashboards |
| Machine auth | Per-site `INTERNAL_JOB_SECRET` bearer | Cookie/session as job credential |
| Env | Secrets in `.env` / `.env.prod`; **no** `HOST`/`PORT`; **LF** only | CRLF; bind address in env file |
| Lead notify | File store + **Pipedrive** | Configuring `FORM_NOTIFICATION_*` / `SMTP_*` |
| Isolation (ops) | `User=site-<name>` + `MemoryMax=256M` | All units as `root`, no caps |
| Caddy | One guarded canonical production file | Split-file or staged installs |
| Backups | Off-box restic/borg + restore drill | Disk scrub only |

---

## 3. Exact version pins

From repo catalog (`pnpm-workspace.yaml`):

```text
astro              7.1.6
@astrojs/node      11.0.3
typescript         5.9.2
Node               >=22.12.0
pnpm               >=9.15.0
Tailwind (if used) 4.x via @tailwindcss/vite
```

In each site `package.json` prefer `"astro": "catalog:"` (or exact versions).  
Lockfile is generated at **repo root**. Install once: `pnpm install` from monorepo root.

---

## 4. On-disk layout (every site)

```text
Astro-production/<domain>/          # later server: /opt/Astro-production/<domain>/
  .env                  # local secrets (gitignored)
  .env.example          # committed
  .env.prod             # server secrets only (gitignored); no HOST/PORT
  package.json
  astro.config.mjs      # site + security.allowedDomains
  src/
    components/         # UI + ContactForm / SiteScripts
    env/server.ts       # typed env
    lib/
      attribution/
      auth/internal-job.ts
      leads/            # file-store, service, retry-policy, types
      security/
    middleware.ts       # 404 old dashboards + access log
    pages/
      404.astro
      api/
        contact.ts
        geo.ts          # or geo/country for Evolution-style
        health.ts
        internal/       # bearer-protected
      index.astro       # + other routes
    services/pipedrive/
    utils/form/         # validate, parse, rate-limit, field-rules
  public/
  deploy/               # *.service, *.caddy, ROOT_SETUP.md
  docs/
  .data/                # leads, uploads — NOT in git
  dist/                 # build output — NOT in git
```

Register the site in `scripts/fleet-sites.json` (id, domain, dir, **unique port**, unit name).

---

## 5. Step-by-step: add a new / convert an existing site

### A. Scaffold in the monorepo

1. Copy closest peer under `Astro-production/<new-domain>/`:
   - Marketing + contact only → start from **iberiaworkforce.com**
   - Multi-step / intl-tel / heavy attribution → start from **cbss.ae**
   - WP mirror + posts/redirects/GTM CMS → start from **evolutionmiddleast.com** or **spheavyrental.ae**
2. Strip content/branding; keep `src/lib/leads`, `utils/form`, `api/contact`, `api/health`, `api/geo`, `middleware`, `deploy/` shape.
3. Update `package.json` name + catalog deps; remove per-site `package-lock.json`.
4. Add row to `scripts/fleet-sites.json` with next free port (5084+).
5. `pnpm install` at repo root → `pnpm --filter <pkg> run build`.

### B. Configure Astro

```js
// astro.config.mjs — pattern
security: {
  allowedDomains: [
    { hostname: 'www.example.com', protocol: 'https' },
    { hostname: 'example.com', protocol: 'https' },
    // include http if edge terminates TLS and Origin can be http on hop
  ],
},
adapter: node({ mode: 'standalone' }),
```

### C. Env

Copy `.env.example` → `.env`. Fill:

| Group | Keys |
|-------|------|
| Site | `PUBLIC_SITE_URL` |
| Leads | `LEAD_STORE_DIR`, `LEAD_STORE_MAX_FILE_BYTES` |
| Pipedrive | `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_COMPANY_DOMAIN`, owner/source/labels, `PIPEDRIVE_FIELD_*` |
| Identity | `WEBSITE_ID`, `WEBSITE_NAME`, `FORM_SOURCE`, `FORM_NAME`, `LEAD_TITLE_PREFIX` |
| Internal | `INTERNAL_JOB_SECRET` (**unique per site**), admin/upload dirs |
| Logging | `LOG_LEVEL` |

**Do not set:** `HOST`, `PORT`, `FORM_NOTIFICATION_*`, `SMTP_*`.

### D. Local prove

```bash
pnpm install
node scripts/fleet-local.mjs up <id>
node scripts/fleet-local.mjs smoke <id>
```

### E. Deploy templates

Fill `deploy/<unit>.service` (`User=site-…`, `PORT=…`, MemoryMax/CPUQuota/Protect*) and `deploy/<domain>.caddy` → `127.0.0.1:<PORT>`.

### F. Server (root) — doc 18

Create unix user → `.env.prod` owned by site user → install unit → merge the complete block into the guarded canonical Caddyfile → validate → graceful reload → smoke public hostname. Preserve `.data/` and secrets on sync.

---

## 6. Contact / lead pipeline (application)

### 6.1 Flow

```text
Browser form
  → POST /api/contact  (JSON, Content-Type: application/json)
  → size ≤ 32 KB
  → IP rate limit (5 / 60s)
  → parse body + honeypot
  → validate fields
  → merge attribution (UTM / gclid / …)
  → FileLeadStore (.data/leads)
  → deliverStoredLead → Pipedrive (person → lead → note)
  → JSON { success, submissionId, message }
```

Client **must** send JSON (not multipart FormData) so Astro Origin checks work behind Caddy.

| Site pattern | Client | Notes |
|--------------|--------|-------|
| CBSS | `SiteScripts.astro` → `/api/contact` | Multi-step quiz can synthesise `message` |
| Iberia | `ContactForm.astro` → `/api/contact/` | `/api/lead` re-exports same handler |
| Evolution / SP | Site contact components | Same server pipeline family |

### 6.2 Validation (shared rules)

Typical `src/utils/form/field-rules.ts`:

| Field | Rules |
|-------|--------|
| Name | Required; letters / spaces / `'/-` |
| Email | Required; regex |
| Phone | Digits 7–15 after dial merge; **required on CBSS**, optional on Iberia |
| Message | No URLs; max ~1000; required or **synthesised** from sector/service |
| Company / sector | Optional; no URLs |
| Honeypot | Must be empty |

Prefer Iberia’s honeypot behaviour for bots: filled `_gotcha` / `website` → **fake success** (no 422 that teaches bots).

### 6.3 Country flags / phone picker

| Pattern | When to use | How |
|---------|-------------|-----|
| **intl-tel-input** (CBSS) | UAE-centric lead forms | CDN intl-tel-input; `initialCountry: 'auto'`; `geoIpLookup` → `/api/geo`; preferred `ae, sa, us, ca, gb, in, pk`; submit dial + national → `country_code` + `phone` |
| **phone-flags sprites** (Evolution / SP) | WP/Elementor mirrors | `/js/phone-flags/` or `phone-flags.js`; geo via `/api/geo/country` (SP also `/api/geo/`) |
| **Plain `<input type="tel">`** (Iberia) | Simple forms | No flags; optional phone |

New sites with serious phone capture: copy **CBSS** intl-tel + `/api/geo`.

### 6.4 IP / geo

`GET /api/geo` (CBSS/Iberia) or `GET /api/geo/country` (Evolution/SP):

1. Edge headers first: `cf-ipcountry`, `x-vercel-ip-country`, `cloudfront-viewer-country` (skip `XX`)
2. Else client IP from `x-forwarded-for` / `x-real-ip` → public geo API (ipwho.is / ipapi.co)
3. Response: `{ country, source: 'header'|'ip'|'unknown' }` (cache ~5 min)

Used to preselect phone country — not as a hard security boundary.

### 6.5 Attribution (required)

`src/lib/attribution/` — keep in sync with peers (`connectgroup.co` is the reference):

| File | Role |
|------|------|
| `config.ts` | `ATTRIBUTION_PRIMARY_KEYS` + `ATTRIBUTION_KEY_ALIASES` |
| `client.ts` | First/last touch → cookies + storage; populate form hidden fields |
| `server.ts` | `normaliseAttribution` + `mergeAttributionIntoContactForm` |

**Must capture** (URL aliases in parentheses): `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `utm_*`, `campaign_id` (`campaignid`, `gad_campaignid`), `adgroup_id` (`adgroupid`), `creative_id` (`creative`), `keyword`, `matchtype`, `device`, `network`, `placement`, `target`/`target_id` (`targetid`), `adposition`, `loc_physical_ms`, `loc_interest_ms`, `gad_source`.

Wire **every** submit path:

1. Astro forms — `captureAttribution` / `populateAttributionFields`
2. Legacy mirrors — `astro-mirror-fixes.js` `captureTrackingFields` must **ensureHiddenField** for the full map (not only pre-existing inputs)
3. Custom JS (CBSS `SiteScripts`) — same alias map in the JSON body
4. `parse-contact-body.ts` — accept Ads-style names; `contact.ts` calls `mergeAttributionIntoContactForm` after validate

Pipedrive: `PIPEDRIVE_FIELD_*` defaults live in `env/server.ts` even when `.env` lines are commented. Store values on the lead payload for FLOW / retries.

Full checklist: [CONNECT-FLOW-SITE-ONBOARDING.md § Attribution](CONNECT-FLOW-SITE-ONBOARDING.md#attribution--google-ads--utm-required).

### 6.6 Rate limit

`src/utils/form/rate-limit.ts`: **5 POSTs / 60 seconds / IP** (in-memory). Over → **429**. IP = first `x-forwarded-for` hop or `x-real-ip`.

### 6.7 Pipedrive + file store

- **Source of truth:** NDJSON under `LEAD_STORE_DIR` (default `.data/leads`)
- **Delivery:** create person → lead → note; retries 1m → 5m → 15m → 1h → 6h (max `PIPEDRIVE_MAX_RETRY_ATTEMPTS`)
- **Cron / CMS:** `POST|GET /api/internal/run-retries`, `POST /api/internal/retry-lead` (bearer)
- Store success even if Pipedrive is down — user still gets success response after store

Email helper may still be called in code; it **no-ops** without SMTP — leave SMTP unset.

---

## 7. Security layers

### 7.1 Application

| Layer | Mechanism |
|-------|-----------|
| Origin / CSRF-ish | `security.allowedDomains` + JSON POST |
| Bots | Honeypot (`website` / `_gotcha`) |
| Abuse | 32 KB body cap → 413; rate limit → 429 |
| Idempotency | `x-idempotency-key` / `submissionId` |
| Machine APIs | `Authorization: Bearer <INTERNAL_JOB_SECRET>` (also header / `?secret=` for cron) |
| Old dashboards | Middleware → **404** on `/internal/operations*` |
| Secrets | Per-site secret; never reuse across domains |
| Logging | Structured access / lead attempts (no secrets in logs) |

### 7.2 Server (Tier 1)

| Layer | Mechanism |
|-------|-----------|
| Process user | `User=site-<name>` (not root) |
| Memory / CPU | `MemoryMax=256M`, `MemoryHigh=200M`, `CPUQuota=50%` |
| Hardening | `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`, `ReadWritePaths=…/.data` |
| Bind | `HOST=127.0.0.1` + unique `PORT` from **systemd**, not `.env.prod` |
| Edge | Caddy TLS → reverse_proxy to loopback only |
| Backups | Encrypted off-box snapshot of trees + units + Caddy |
| Deploy | Never overwrite `.env.prod` / `.data` with empty laptop files |

---

## 8. Public + internal API contract

### Public

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness `{ ok: true, … }` |
| GET | `/api/geo` or `/api/geo/country` | Phone country hint |
| POST | `/api/contact` | Lead capture (JSON) |

### Internal (bearer)

Reads: leads, export-leads, posts, categories, tags, redirects, GTM (as site needs).  
Writes: save/delete mutations return **JSON** (`{ success: true }`), not dashboard redirects.  
Retries: `retry-lead`, `run-retries`.

Sites without blog/CMS ship **leads subset only** via `@connect/site-cms` + `FEATURES_LEADS_ONLY` (CBSS/Iberia). Full CMS sites use `FEATURES_FULL_CMS`; posts/redirects/GTM route files still live in the site until Phase B adapters.

---

## 9. Harden gates (must pass before “done”)

| # | Gate | Pass |
|---|------|------|
| G1 | Unknown URL | **404**, no `prepare:page` |
| G2 | Contact Origin | JSON + `Origin: https://…` not 403 |
| G3 | Health | `GET /api/health` → 200 |
| G4 | Access log | Structured HTTP access |
| G5 | No per-site CMS UI | `/internal/operations` gone |
| G6 | Machine auth | Internal routes 403 without secret |
| G7 | Env | No HOST/PORT in env file; LF; secret set |
| G8 | Prod binary | Unit = `node dist/server/entry.mjs` |
| G9 | Lockfile / build | Clean `pnpm install` + build |
| G10 | allowedDomains | Apex + www listed |

---

## 10. Smoke tests

```bash
BASE=https://www.example.com
SECRET=…   # INTERNAL_JOB_SECRET

curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -sS "$BASE/api/health"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"   # 404
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/api/internal/leads"          # 403
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/leads?limit=1"
curl -sS -X POST "$BASE/api/contact" \
  -H "Content-Type: application/json" \
  -H "Origin: $BASE" \
  -d '{"name":"Smoke","email":"smoke@example.com","phone":"+971500000000","message":"smoke","website":""}'
```

Local equivalent: `node scripts/fleet-local.mjs smoke <id>`.

---

## 11. New-site checklist (copy & tick)

### Repo / app

- [ ] Site folder under `Astro-production/<domain>/`
- [ ] Catalog pins: Astro 7.1.6 + `@astrojs/node` 11.0.3 + TS 5.9.2
- [ ] Listed in `scripts/fleet-sites.json` (unique port)
- [ ] `security.allowedDomains` set
- [ ] `404.astro` + middleware blocks old dashboards
- [ ] `GET /api/health`
- [ ] `POST /api/contact` JSON + honeypot + validate + rate limit
- [ ] Attribution wired (full Ads/UTM alias set — see onboarding § Attribution; not “if paid traffic expected” only)
- [ ] Geo endpoint if using intl-tel / flags
- [ ] File lead store + Pipedrive + retry APIs
- [ ] `/api/internal/*` bearer-only
- [ ] `.env.example` complete; no SMTP / HOST / PORT
- [ ] `docs/CONNECT-ASTRO-FLEET-STANDARD.md` present (or link to monorepo docs)
- [ ] Local: `fleet-local` up + smoke green

### Deploy / host

- [ ] `deploy/*.service` + `*.caddy` + `ROOT_SETUP.md`
- [ ] Unique PORT + `site-<name>` user
- [ ] `.env.prod` mode 600, site-owned; LF only
- [ ] Unit: built entry, MemoryMax, Protect*
- [ ] Caddy site file + validate before reload
- [ ] Public smoke G1–G3 + contact
- [ ] Backups include this tree

---

## 12. What not to do

1. Do **not** run `astro dev` in production.
2. Do **not** configure SMTP / form-notification email for leads.
3. Do **not** rebuild per-site login dashboards — central CMS + bearer APIs only.
4. Do **not** put `HOST`/`PORT` in shared env files.
5. Do **not** reuse one `INTERNAL_JOB_SECRET` across domains.
6. Do **not** ship FormData-only contact POSTs behind TLS-terminating Caddy.
7. Do **not** overwrite live `.env.prod` / `.data` on deploy.
8. Do **not** copy leads/auth into site #5 — depend on `@connect/site-cms` (`workspace:*`), `src/cms.ts` bind, thin API re-exports.
9. Do **not** shamefully-hoist one `node_modules` for all sites.
10. Do **not** reload Caddy without `caddy validate`.

---

## 13. Platform roadmap (context)

| Priority | Work |
|----------|------|
| **P0** | Host Tier 1: non-root units, MemoryMax, split Caddy, off-box backups ([server-ops-only](server-ops-only.md)) |
| **P1** | pnpm on host; all sites on exact 7.1.6 pins (done in monorepo) |
| **P2** | `@connect/site-cms` **landed** (leads + auth) — Phase B: posts/redirects/GTM into package |
| **P3** | SSR vs static inventory; shard hosts after ~10 SSR |

Day-by-day history: [15-platform-work-plan](../Astro-production/evolutionmiddleast.com/docs/15-platform-work-plan.md).

---

## 14. Quick reference — current ports & users

| Domain | Unit | PORT | Unix user |
|--------|------|------|-----------|
| evolutionmiddleast.com | `evolutionmiddleast` | 5080 | `site-evolutionmiddleast` |
| cbss.ae | `cbss` | 5081 | `site-cbss` |
| spheavyrental.ae | `spheavyrental` | 5082 | `site-spheavyrental` |
| iberiaworkforce.com | `iberiaworkforce` | 5083 | `site-iberiaworkforce` |
| connecthr.ae | `connecthr` | 5084 | `site-connecthr` |
| connectgroup.co | `connectgroup` | 5085 | `site-connectgroup` |

Next free local/server port: **5086** (confirm free on host).

---

## 15. Doc map

| Doc | Use when |
|-----|----------|
| **This playbook** | Onboarding / converting any new site |
| [CONNECT-ASTRO-FLEET-STANDARD](../Astro-production/cbss.ae/docs/CONNECT-ASTRO-FLEET-STANDARD.md) | Contract to copy into each site |
| [15-platform-work-plan](../Astro-production/evolutionmiddleast.com/docs/15-platform-work-plan.md) | Why Tier 1 / pnpm / shared CMS |
| [server-side-work](server-side-work.md) | Host overview |
| [local-fleet-test](local-fleet-test.md) | Laptop fleet runner |
| [server-ops-only](server-ops-only.md) | Root checklist on the box |

---

## 16. Shared CMS package (live — Phase A + B)

| Piece | Location |
|-------|----------|
| Package | `packages/site-cms` → `@connect/site-cms` **v0.2** |
| Bind | each site `src/cms.ts` + `import './cms'` in middleware |
| Features | `FEATURES_LEADS_ONLY` (CBSS, Iberia) · `FEATURES_FULL_CMS` (Evolution, SP Heavy) |
| **In package** | leads, auth, GTM, uploads, php-files, SEO stores, redirects store, **all API handlers** including posts/redirects/GTM/SEO |
| **Per-site adapters** | posts + taxonomy data backends (Evolution `content/blog` vs SP `data-store`) |
| **Per-site services** | Pipedrive, email, logger |

Central CMS UI: HTTPS + `Authorization: Bearer <per-site INTERNAL_JOB_SECRET>` — unchanged.

See `packages/site-cms/README.md`.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-31 | v1.0 — Single shareable playbook |
| 2026-07-31 | v1.1 — `@connect/site-cms` leads + auth |
| 2026-08-03 | v1.3 — Attribution required fleet-wide (Ads/UTM aliases); link to onboarding § Attribution |
| 2026-07-31 | v1.2 — Phase B: posts/redirects/GTM/SEO/uploads handlers centralized |
