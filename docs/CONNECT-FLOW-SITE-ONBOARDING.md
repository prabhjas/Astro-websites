# Connect Group — New site → Astro fleet → FLOW (full standard)

**Start with the numbered lifecycle:** [00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md) (this file is Phase 03 detail).

**One playbook to take any website (WordPress clone, static export, or greenfield) into the Connect Group Astro fleet and wire it for the central FLOW / CMS platform.**

Paste into Cursor: *Follow docs/CONNECT-FLOW-SITE-ONBOARDING.md for \<domain\>.*  
Or (preferred): *Follow docs/00-NEW-SITE-MASTER.md for \<domain\>.*

| Field | Value |
|-------|--------|
| **Version** | 1.1 — 2026-08-03 |
| **Monorepo** | [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites) |
| **Shared CMS** | `@connect/site-cms` (`packages/site-cms`) |
| **Runtime** | Astro **7.1.6** + `@astrojs/node` **11.0.3** (pnpm catalog) |
| **Host** | `/opt/Astro-production/<domain>/` · loopback ports **5080+** |
| **Reference peers** | Leads-only: **cbss.ae** / **iberiaworkforce.com** · Full FLOW CMS: **evolutionmiddleast.com** / **spheavyrental.ae** / **connectgroup.co** |

**Related detail (optional):** [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) · [CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md) · [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) · [packages/site-cms/README.md](../packages/site-cms/README.md)

---

## 0. Mental model (read once)

```text
┌─────────────────────────────────────────────────────────────┐
│  FLOW (central CMS UI)                                      │
│  One dashboard for all domains                              │
│  Calls each site over HTTPS with Bearer token               │
└───────────────────────────┬─────────────────────────────────┘
                            │ Authorization: Bearer <per-site INTERNAL_JOB_SECRET>
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Per domain: Astro SSR process                              │
│  node dist/server/entry.mjs on 127.0.0.1:<PORT>             │
│  Thin /api/internal/* → @connect/site-cms handlers          │
│  Content data stays in the site (posts adapters, .data/)    │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Where it lives | Rule |
|-------|----------------|------|
| FLOW UI | Separate app | Never rebuild per-site HTML dashboards |
| API handlers | `packages/site-cms` | One codebase for leads, posts, redirects, GTM, SEO, uploads… |
| Route files | `Astro-production/<domain>/src/pages/api/internal/**` | **Thin mounts only** (2 lines) |
| Posts / taxonomy data | Site `src/lib/internal-posts/*` via adapters in `src/cms.ts` | Site-owned storage |
| Leads / GTM / redirects files | Package defaults under site `.data/` | Gitignored runtime |
| Secrets | Per-site `.env` / `.env.prod` | **Unique** `INTERNAL_JOB_SECRET` per domain |

**Do not** invent a second auth scheme, a second leads stack, or cookie login for ops.

---

## 1. Prerequisites

```bash
git clone git@github.com:Connect-Group-Tech/Astro-websites.git
cd Astro-websites
node -v    # >= 22.12
corepack enable && corepack prepare pnpm@9.15.9 --activate
pnpm install   # ALWAYS from monorepo root
```

Local runner: `scripts/fleet-local.mjs` + `scripts/fleet-sites.json`.  
See [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) for daily `up` / `smoke` / `stop`.

---

## 2. Choose the peer (what to copy)

| Site need | Copy from | FLOW features flag |
|-----------|-----------|--------------------|
| Marketing + contact only (no blog CMS in FLOW) | `iberiaworkforce.com` or `cbss.ae` | `FEATURES_LEADS_ONLY` |
| Heavy intl-tel / multi-step leads | `cbss.ae` | `FEATURES_LEADS_ONLY` |
| WordPress / Elementor mirror + blog + redirects + GTM + SEO in FLOW | `spheavyrental.ae` or `connectgroup.co` | `FEATURES_FULL_CMS` |
| File-backed blog content collections | `evolutionmiddleast.com` | `FEATURES_FULL_CMS` |

For FLOW “see posts, sitemap, redirects, GTM on this domain” you almost always want **`FEATURES_FULL_CMS`**.

---

## 3. End-to-end checklist (execute in order)

### Step A — Clone / place the site

1. Put the working tree under `Astro-production/<domain>/`.
2. If converting WP: keep mirrored static assets under `public/wp-content/…` and `public/wp-includes/…` (CSS/JS/fonts/images only — **not** running WordPress).
3. Scan WP clones for malware first: [CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md).
4. Remove nested `package-lock.json` / stray `node_modules` from the site folder.

### Step B — Register in the fleet

Edit `scripts/fleet-sites.json` — next free port (**5093+**; 5080–5087 + 5090/5092 reserved — see § Port map):

```json
{
  "id": "example",
  "domain": "example.com",
  "dir": "example.com",
  "port": 5086,
  "unit": "example"
}
```

### Step C — Package + workspace

In `Astro-production/<domain>/package.json`:

```json
{
  "name": "example-astro",
  "dependencies": {
    "astro": "catalog:",
    "@astrojs/node": "catalog:",
    "@connect/site-cms": "workspace:*"
  }
}
```

- Prefer `catalog:` pins — **no carets** (`^`).
- From repo root: `pnpm install`.
- Confirm `node_modules/@connect/site-cms` resolves (symlink into workspace).

### Step D — Astro config

```js
adapter: node({ mode: 'standalone' }),
security: {
  allowedDomains: [
    { hostname: 'example.com', protocol: 'https' },
    { hostname: 'www.example.com', protocol: 'https' },
    { hostname: '127.0.0.1', protocol: 'http' },
    { hostname: 'localhost', protocol: 'http' },
  ],
},
```

### Step E — Bind shared CMS (`src/cms.ts`)

**Full FLOW (posts + redirects + GTM + SEO + uploads):**

```ts
import {
  configureSiteCms,
  FEATURES_FULL_CMS,
  type PostsAdapter,
  type TaxonomyAdapter,
} from '@connect/site-cms';
import * as postsStore from './lib/internal-posts/store';
import * as taxonomyStore from './lib/internal-posts/taxonomy-store';
// + getServerEnv, pipedrive, email, logger

configureSiteCms({
  siteId: 'example',
  features: FEATURES_FULL_CMS,
  getLeadEnv: () => getServerEnv() as any,
  createPipedriveLead,
  sendFormNotification,
  logFormSuccess,
  logPipedriveFailure,
  logWarn,
  posts: { /* PostsAdapter methods from local store */ },
  taxonomy: { /* TaxonomyAdapter methods */ },
});
```

**Leads-only:** use `FEATURES_LEADS_ONLY` and omit `posts` / `taxonomy`.

**Middleware must import the bind first:**

```ts
import './cms';
```

Copy peer shape from `spheavyrental.ae/src/cms.ts` or `connectgroup.co/src/cms.ts`.

### Step F — Thin `/api/internal/*` mounts (mandatory for FLOW)

Do **not** keep fat local handler copies (cookie/dashboard session code).

Copy the mount tree from a full-CMS peer:

```bash
# From monorepo root — replace <domain>
rm -rf Astro-production/<domain>/src/pages/api/internal
rsync -a Astro-production/spheavyrental.ae/src/pages/api/internal/ \
         Astro-production/<domain>/src/pages/api/internal/
```

Every file should look like:

```ts
export const prerender = false;
export { GET } from '@connect/site-cms/astro/posts/index';
```

(`prerender = false` must stay in the **site** file — Astro static analysis.)

### Step G — Remove per-site CMS UI

- Delete `src/pages/internal/**` if present.
- Middleware must **404** `/internal/operations*` and `/internal/lead-operations*` (never redirect into a local dashboard).
- Delete cookie `login` / `logout` internal routes if any remain.

Ops happens only in **FLOW** → bearer APIs.

### Step H — Public APIs every site needs

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Liveness |
| `POST` | `/api/contact` | JSON lead capture → file store → Pipedrive |
| `GET` | `/api/geo` or `/api/geo/country` | Phone country hint (if flags / intl-tel) |
| Custom | `404.astro` | Real **HTTP 404** (not 503 / prepare:page) |

Contact client **must** send `Content-Type: application/json` (not multipart FormData) so Origin checks work behind Caddy.

**Attribution (required for every site):** copy `src/lib/attribution/{config,client,server}.ts` from a peer and wire capture on **all** contact paths (React/Astro forms **and** legacy WP mirrors). See [§ Attribution / Google Ads / UTM](#attribution--google-ads--utm-required).

### Step I — Env

| File | Role |
|------|------|
| `.env.example` | Committed template |
| `.env` (laptop) | Full secrets for `fleet-local` |
| Server `.env` | Build-only `PUBLIC_SITE_URL` |
| Server `.env.prod` | Runtime secrets; **required** `EnvironmentFile=` (no leading `-`) |

**Required groups**

- `PUBLIC_SITE_URL`
- `LEAD_STORE_DIR`, Pipedrive keys, `WEBSITE_*` / form identity
- `INTERNAL_JOB_SECRET` (**unique per domain** — `openssl rand -hex 32`)
- `INTERNAL_ADMIN_DIR`, `INTERNAL_UPLOAD_DIR`, `INTERNAL_ENHANCED_LIVE_DIR`

**Forbidden in env files**

- `HOST`, `PORT` (systemd / fleet-local only)
- Relying on `SMTP_*` / `FORM_NOTIFICATION_*` for lead delivery
- CRLF line endings (breaks systemd)

### Step J — Deploy templates

Under `Astro-production/<domain>/deploy/`:

1. **`<unit>.service`** — `User=site-<name>`, `EnvironmentFile=…/.env.prod` (no `-`), `HOST=127.0.0.1` + `PORT=<n>` on `ExecStart`, `MemoryMax=256M`, `ProtectSystem=strict`, `ReadWritePaths=…/.data`
2. **`<domain>.caddy`** — `http://` + `https://` + `tls internal` → `reverse_proxy 127.0.0.1:<PORT>`
3. **`ROOT_SETUP.md`** — short host notes

### Step K — Prove locally

```bash
pnpm install
pnpm --filter <package-name> run build
node scripts/fleet-local.mjs up <id>
node scripts/fleet-local.mjs smoke <id>
```

Then FLOW surface smoke (replace port + secret):

```bash
BASE=http://127.0.0.1:5086
SECRET=…   # from that site's .env

# Expect 403 without secret, 200 with Bearer
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/api/internal/posts/"
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/posts/" | head
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/redirects/" | head
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/gtm/" | head
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/leads?limit=1" | head
```

### Step L — Server handoff (ops)

1. Sync **code** to `/opt/Astro-production/<domain>/` — never overwrite live `.env.prod` / `.data/` with empty laptop files.
2. Root: create `site-<name>`, install unit + Caddy `sites.d`, `caddy validate`, reload.
3. `pnpm --filter <pkg> run build` → `sudo site-ctl restart <unit>`.
4. Public smoke on hostname + register domain + secret in FLOW.

---

## 4. FLOW API contract (what the central platform calls)

All machine routes: `/api/internal/*`  
Auth header:

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Also accepted: `x-internal-job-secret`. Query `?secret=` is rejected (use Bearer / header only).

### Always (leads-only or full)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/internal/leads` | List / filter |
| GET | `/api/internal/leads/[publicId]` | One lead |
| GET | `/api/internal/export-leads` | CSV export |
| POST | `/api/internal/retry-lead` | Retry Pipedrive delivery |
| GET, POST | `/api/internal/run-retries` | Batch retries |

### Full CMS (`FEATURES_FULL_CMS`)

| Area | Paths (examples) |
|------|------------------|
| Posts | `GET/POST …/posts/`, `…/posts/[slug]`, `…/posts/save`, `…/posts/delete` |
| Taxonomy | `…/posts/categories/*`, `…/posts/tags/*` |
| Redirects | `GET …/redirects/`, save / delete / import / bulk-delete |
| GTM | `GET …/gtm/`, `POST …/gtm/save` |
| SEO | `…/seo/sitemap/*`, `…/seo/llms/save`, `…/seo/text-files/save` |
| Uploads | `POST …/uploads`, `GET …/uploads/[uploadId]`, delete |
| PHP files | `…/php-files/save`, `…/php-files/upload` |

Writes return **JSON** (`{ success: true, … }`), not HTML redirects.

Public SEO endpoints (sitemaps / robots / llms) stay as normal Astro routes under `src/pages/` — FLOW edits data via internal SEO APIs; the site serves the public files.

### Interim redirects import (before FLOW UI)

If a developer shares a Rank Math / SEO **CSV or JSON** export before the dashboard is ready:

1. Save under `Astro-production/<domain>/imports/redirects/`
2. Follow [CURSOR-IMPORT-REDIRECTS.md](CURSOR-IMPORT-REDIRECTS.md)
3. Merge into `src/data/redirects.yml` + run `redirects:generate`

After FLOW: use `/api/internal/redirects/*` from the dashboard; keep `imports/redirects/` as audit only.

### Interim GTM / GA4 (before FLOW UI)

Shared resolver: `@connect/site-cms` → `resolveEffectiveGtmConfig` (Connect Group, Evolution, SP Heavy, Connect HR).

Until FLOW edits tags via `/api/internal/gtm/*`, set IDs on the site env / `.env.prod`:

```bash
# Astro-production/<domain>/.env  (laptop) or .env.prod (server)
PUBLIC_GTM_ID=GTM-AAAA,GTM-BBBB   # one or more Tag Manager containers
PUBLIC_GA4_ID=G-XXXX,G-YYYY       # one or more GA4 measurement IDs
```

Lists accept comma, space, or semicolon separators. Both vars can be set; the loader injects every valid ID. A lone `G-…` in `PUBLIC_GTM_ID` is also accepted as GA4.

Priority for `/runtime-gtm.js` (and SSR inject when present):

1. FLOW file `.data/internal-admin/gtm.json` (if snippets present)
2. Optional `GTM_HEAD_SCRIPT` / `GTM_BODY_HTML` / `GTM_FOOTER_SCRIPT`
3. `PUBLIC_GTM_ID` + `PUBLIC_GA4_ID` → standard snippets

Do **not** hardcode tags into every legacy HTML file — the runtime loader injects them.

Verify: `curl -s http://127.0.0.1:<port>/runtime-gtm.js | grep -E 'GTM-|G-'`

### Attribution / Google Ads / UTM (required)

Every fleet site must capture paid-traffic and UTM params on lead submit and map them into the file lead store + Pipedrive custom fields.

**Reference implementation (copy from peer):** `connectgroup.co` / `evolutionmiddleast.com` / `spheavyrental.ae` / `cbss.ae`.

#### Required files

| Path | Role |
|------|------|
| `src/lib/attribution/config.ts` | Primary keys + URL aliases (`campaignid` → `campaign_id`, etc.) |
| `src/lib/attribution/client.ts` | Browser capture → cookies / localStorage first+last touch |
| `src/lib/attribution/server.ts` | `normaliseAttribution` + `mergeAttributionIntoContactForm` |
| `src/utils/form/parse-contact-body.ts` | Accept canonical **and** Google Ads names (`campaignid`, `adgroupid`, `creative`, `targetid`, …) |
| `src/pages/api/contact.ts` | After validate: `mergeAttributionIntoContactForm(form, lastTouch, firstTouch, attribution)` |
| Contact UI | Hidden fields + `captureAttribution` / `populateAttributionFields`, **or** full param map in legacy JS |

#### Params that must be captured

From the landing URL (ValueTrack / UTMs), including aliases:

| Canonical (form / store) | Also accept from URL |
|--------------------------|----------------------|
| `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid` | same |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | same |
| `campaign_id` | `campaignid`, `gad_campaignid`, `campaign` |
| `adgroup_id` | `adgroupid` |
| `creative_id` | `creative`, `creativeid` |
| `keyword` | `kw`, `q`, `utm_term` |
| `matchtype`, `device`, `network`, `placement` | same |
| `target` / `target_id` | `targetid` |
| `adposition` | `ad_position` |
| `loc_physical_ms`, `loc_interest_ms` | camelCase variants |
| `gad_source` | `gadsource` (also may fill `source`) |

Keys live in `ATTRIBUTION_PRIMARY_KEYS` / `ATTRIBUTION_KEY_ALIASES` in `config.ts` — keep that file identical across sites when extending.

#### Wire every contact path

1. **Astro / shared forms** (`ContactForm.astro`, `ContactForm.cg.astro`): hidden inputs for the fields above + `captureAttribution` / `populateAttributionFields` on load and submit.
2. **Legacy WP / Elementor mirrors** (`public/js/astro-mirror-fixes.js` → `captureTrackingFields`): **create** hidden inputs (do not only set fields that already exist). Use the same alias map as `config.ts`.
3. **Custom site scripts** (e.g. CBSS `SiteScripts.astro` `getUrlParams()`): same alias map when building the JSON body.
4. **Server:** `parse-contact-body` aliases + `mergeAttributionIntoContactForm` so Pipedrive still gets values if the client only sent Ads-style names.

#### Pipedrive field keys

`PIPEDRIVE_FIELD_*` in `.env` / `.env.example` may stay commented. Peers ship **hashed defaults** in `src/env/server.ts` (`fieldKeys`) for message, gclid, campaign, keyword, loc_*, device, network, etc. Override in `.env.prod` only when a domain uses different Pipedrive keys.

Do **not** assume “commented in `.env` = disabled”.

#### Smoke (attribution)

```bash
# After submit from a URL like:
# /contact-us/?gclid=…&campaignid=…&device=c&network=x&loc_physical_ms=…&loc_interest_ms=…&gbraid=…&gad_source=1
# Check the new lead under .data/leads/state/*.json — payload must include:
#   gclid, campaignId, device, network, locPhysicalMs, locInterestMs, gbraid, source (from gad_source)
```

Empty optional Ads fields (blank `keyword`, `adgroupid`, …) are fine; non-empty ones must not be dropped.

---

## 5. Harden gates (must pass before “done”)

| # | Gate | Pass |
|---|------|------|
| G1 | Unknown URL | HTTP **404** (custom `404.astro`) |
| G2 | Contact | JSON POST + Origin not 403 |
| G3 | Health | `GET /api/health` → 200 |
| G4 | Access log | Structured `http_access` in middleware |
| G5 | No per-site CMS UI | `/internal/operations` → 404 |
| G6 | Machine auth | Internal routes **403** without secret, **200** with |
| G7 | Env | No HOST/PORT; unique secret; LF |
| G8 | Prod binary | `node dist/server/entry.mjs` |
| G9 | Lockfile / build | Root `pnpm install` + clean build |
| G10 | allowedDomains | Apex + www (+ local for laptop) |
| G11 | Thin mounts | `/api/internal/**` re-exports `@connect/site-cms` only |
| G12 | FLOW reads | Bearer GET posts / redirects / gtm / leads succeed |
| G13 | Attribution | Ads/UTM aliases captured on legacy + Astro forms; lead payload has gclid/campaignId/device/… when present in URL |

---

## 6. On-disk layout (every production site)

```text
Astro-production/<domain>/
  .env / .env.example / (.env.prod on server only)
  package.json                 # catalog: + @connect/site-cms workspace:*
  astro.config.mjs
  src/
    cms.ts                     # configureSiteCms + adapters
    middleware.ts              # import './cms'; 404 ops UI; redirects; access log
    env/server.ts
    lib/internal-posts/        # posts + taxonomy stores (FULL_CMS)
    lib/leads/ attribution/ auth/ …
    pages/
      404.astro
      api/health.ts
      api/contact.ts
      api/geo/…                # if phone flags / intl-tel
      api/internal/**          # THIN mounts only
    services/pipedrive|email|logger/
  public/                      # WP mirror assets if needed
  deploy/*.service *.caddy ROOT_SETUP.md
  docs/CONNECT-ASTRO-FLEET-STANDARD.md
  .data/                       # gitignored runtime
  dist/                        # build output (site root only — not public/**/dist)
```

**Gitignore footgun:** never use a bare `dist/` rule that also ignores `public/**/dist/` (theme CSS / wp-includes js). Prefer `/dist/` at the site root (and monorepo patterns that only ignore `Astro-production/*/dist/`).

---

## 7. Port map (current)

Canonical list: **[FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)** + `scripts/fleet-sites.json`.

| ID | Domain | Port |
|----|--------|------|
| evolutionmiddleast | evolutionmiddleast.com | 5080 |
| cbss | cbss.ae | 5081 |
| spheavyrental | spheavyrental.ae | 5082 |
| iberiaworkforce | iberiaworkforce.com | 5083 |
| connecthr | connecthr.ae | 5084 |
| connectgroup | connectgroup.co | 5085 |
| connectresources | connectresources.ae | 5086 |
| iberiaeor | iberiaeor.com | 5089 |
| eormiddleast | eormiddleast.com | 5090 |
| connectstaff | connectstaff.ae | 5091 |
| cuae | c-uae.com | 5092 |
| *(next free)* | | **5124** |

Do not invent ports — take the next free from the registry.
---

## 8. What not to do

1. Do not run `astro dev` in production or as the only “CMS smoke”.
2. Do not ship FormData-only contact POSTs behind TLS-terminating Caddy.
3. Do not rebuild `/internal/operations` dashboards — FLOW only.
4. Do not copy fat `/api/internal` handlers between sites — thin mounts + package.
5. Do not reuse one `INTERNAL_JOB_SECRET` across domains.
6. Do not put `HOST`/`PORT` in `.env` / `.env.prod`.
7. Do not overwrite live `.env.prod` / `.data` on deploy.
8. Do not shamefully-hoist one `node_modules` for all sites — pnpm workspace only.
9. Do not reload Caddy without `caddy validate`.
10. Do not ignore nested `public/**/dist` assets with a global `dist/` gitignore.

---

## 9. Definition of done (copy & tick)

### Repo / app

- [ ] `Astro-production/<domain>/` + row in `fleet-sites.json`
- [ ] Catalog pins + `@connect/site-cms` + `src/cms.ts` bind
- [ ] `FEATURES_FULL_CMS` **or** documented `FEATURES_LEADS_ONLY`
- [ ] Thin `/api/internal/**` mounts (no fat locals)
- [ ] Posts/taxonomy adapters if full CMS
- [ ] No `/internal/operations` UI; middleware 404
- [ ] Health, contact JSON, 404.astro, geo if needed
- [ ] Attribution: `lib/attribution/*` + parse aliases + contact merge; legacy mirror / SiteScripts capture full Ads+UTM set
- [ ] `.env.example` fleet-shaped; unique secret locally
- [ ] `fleet-local` smoke green
- [ ] Bearer smoke: posts / redirects / gtm / leads (as featured)
- [ ] Attribution smoke: submit with `?gclid=&campaignid=&device=&loc_physical_ms=` → lead JSON populated

### Deploy / FLOW

- [ ] `deploy/*.service` + `*.caddy` (`tls internal`) + `ROOT_SETUP.md`
- [ ] Host unit + Caddy + health 200
- [ ] Domain + `INTERNAL_JOB_SECRET` registered in FLOW
- [ ] FLOW can list posts / redirects / leads for this site

---

## 10. Quick commands cheat sheet

```bash
# Install (root)
pnpm install

# Build one site
pnpm --filter connectgroup-astro run build

# Run + smoke
node scripts/fleet-local.mjs up connectgroup
node scripts/fleet-local.mjs smoke connectgroup
node scripts/fleet-local.mjs status connectgroup
node scripts/fleet-local.mjs stop connectgroup

# New unique secret
openssl rand -hex 32
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-03 | v1.1 — Attribution / Google Ads / UTM required for all sites (aliases, legacy mirror, Pipedrive defaults note) |
| 2026-08-03 | v1.0 — Single clone → fleet → FLOW onboarding doc; connectgroup.co completed FULL_CMS thin mounts |
