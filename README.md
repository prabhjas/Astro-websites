# Connect Group — Astro websites fleet

Monorepo for **42** Connect Group production Astro websites: one workspace, shared version pins, shared CMS API package, per-site content and secrets.

| | |
|--|--|
| **GitHub** | [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites) |
| **Branch (fleet work)** | `work/astro-sites` |
| **Branch (34-site cut-off)** | `work/live-fleet-34` |
| **Fleet size** | **42 scaffolded sites** (ports **5080–5124**, next free **5125**) |
| **Node** | `>=22.12.0` |
| **Package manager** | **pnpm** `>=9.15.0` (see `packageManager` in root `package.json`) |
| **Updated** | 2026-08-12 |

**New website / developer workflow:** start at **[docs/00-NEW-SITE-MASTER.md](docs/00-NEW-SITE-MASTER.md)** (numbered phases → final deploy checks).

**Fleet status (Aug 2026):** all **42** sites are scaffolded in `Astro-production/`, standardized on catalog pins, deploy templates, `.env.example`, health/contact APIs, and `CONNECT-ASTRO-FLEET-STANDARD.md`. Canonical ports: [`docs/FLEET-PORT-REGISTRY.md`](docs/FLEET-PORT-REGISTRY.md) · `scripts/fleet-sites.json`.

---
## What this repo is for

- Run **many Astro SSR sites** on one host without copying `node_modules` four (or forty) times.
- Keep **exact** Astro / adapter versions aligned via a **pnpm catalog**.
- Expose a **uniform machine CMS API** so central FLOW can call every domain the same way.
- Keep **brand, pages, blog files, and `.env`** per site — not in a shared process.

**Not in this repo:** the human FLOW / CMS UI. That product calls these sites over HTTPS with a per-site bearer secret.

---

## Architecture (current)

```text
Astro-websites/                          ← git monorepo (this repo)
├── package.json                         ← fleet scripts
├── pnpm-workspace.yaml                  ← Astro-production/* + packages/*
├── pnpm-lock.yaml                       ← one lockfile
├── .npmrc                               ← store-dir=.pnpm-store (gitignored store)
├── packages/
│   └── site-cms/                        ← @connect/site-cms (shared CMS APIs)
├── scripts/
│   ├── fleet-sites.json                 ← ports / dirs / unit names
│   ├── fleet-local.mjs                  ← local prod-like runner + smoke
│   └── pull-iberia-env.sh
├── docs/                                ← Cursor guides + playbooks
│   ├── 00-NEW-SITE-MASTER.md            ← START HERE (numbered lifecycle; includes security + SEO gates)
│   ├── FLEET-PORT-REGISTRY.md           ← all domains + ports + status
│   ├── SECURITY-AUDIT-REMEDIATION-2026-08-06.md / SECURITY-AARON-FULL-HANDOFF-2026-08-07.md
│   ├── SEO-AI-CRAWLER-AUDIT-REMEDIATION-2026-08-06.md
│   ├── CONNECT-FLOW-SITE-ONBOARDING.md
│   ├── CONNECT-CADDY-DEPLOYMENT.md
│   └── …
├── caddy/                               ← production Caddyfile mirror + ops archive
├── Astro-production/                    ← one folder per domain (42 sites)
│   ├── evolutionmiddleast.com/          ← :5080
│   ├── cbss.ae/                         ← :5081
│   ├── …                                ← see full table below (5080–5124)
│   └── deploy-host/                     ← restic backup units
```

### Runtime model (production)

```text
Browser / FLOW
    │  HTTPS :443
    ▼
Caddy (TLS, reverse_proxy)     ← single fleet Caddyfile (see caddy/Caddyfile.production)
    │  127.0.0.1:<PORT>
    ▼
systemd unit per site          ← node dist/server/entry.mjs  (NOT astro dev)
    │  User=site-<name> (Tier 1 target)
    ▼
Astro-production/<domain>/
    ├── dist/                  ← build output
    ├── .env                   ← build-only PUBLIC_SITE_URL (no secrets; webdev-readable on host)
    ├── .env.prod              ← runtime secrets for systemd (no HOST/PORT)
    └── .data/                 ← leads / uploads (not in git)
```

Each domain = **its own Node process**. Shared = **code + lockfile + package**, not one Node for all domains.

---

## Fleet inventory — all 42 sites (`work/astro-sites`)

| | |
|--|--|
| **Total** | **42 scaffolded** · **0 placeholders** |
| **Port range** | **5080–5124** (next free **5125**) |
| **Machine registry** | [`scripts/fleet-sites.json`](scripts/fleet-sites.json) |
| **Human registry** | [`docs/FLEET-PORT-REGISTRY.md`](docs/FLEET-PORT-REGISTRY.md) |

### Full list (port order)

| Port | Domain | Unit |
|------|--------|------|
| **5080** | evolutionmiddleast.com | `evolutionmiddleast` |
| **5081** | cbss.ae | `cbss` |
| **5082** | spheavyrental.ae | `spheavyrental` |
| **5083** | iberiaworkforce.com | `iberiaworkforce` |
| **5084** | connecthr.ae | `connecthr` |
| **5085** | connectgroup.co | `connectgroup` |
| **5086** | connectresources.ae | `connectresources` |
| **5087** | connectfm.ae | `connectfm` |
| **5088** | connectresources.sa | `connectresources-sa` |
| **5089** | iberiaeor.com | `iberiaeor` |
| **5090** | eormiddleast.com | `eormiddleast` |
| **5091** | connectstaff.ae | `connectstaff` |
| **5092** | c-uae.com | `cuae` |
| **5093** | kinzahr.com | `kinzahr` |
| **5094** | connectfreelance.ae | `connectfreelance` |
| **5095** | redo.ae | `redo` |
| **5096** | connectfz.com | `connectfz` |
| **5097** | royalvisa.ae | `royalvisa` |
| **5098** | connectresourcesint.com | `connectresourcesint` |
| **5099** | mbs-consultancy.com | `mbs-consultancy` |
| **5100** | thefreelancergate.com | `thefreelancergate` |
| **5101** | connectzone.ae | `connectzone` |
| **5102** | ngmanpower.com | `ngmanpower` |
| **5103** | emiratiguard.com | `emiratiguard` |
| **5104** | movey.ae | `movey` |
| **5105** | emiratisationgate.org | `emiratisationgate` |
| **5106** | emiratisationgateway.com | `emiratisationgateway` |
| **5107** | emiratisationhub.com | `emiratisationhub` |
| **5109** | freelancerdxb.com | `freelancerdxb` |
| **5110** | payrollmiddleast.org | `payrollmiddleast` |
| **5111** | pittant.com | `pittant` |
| **5112** | lladesigners.com | `lladesigners` |
| **5113** | raadrecruitment.ae | `raadrecruitment` |
| **5114** | companyformationsaudi.com | `companyformationsaudi` |
| **5115** | saudicompanyformation.com | `saudicompanyformation` |
| **5116** | connectbusinesscenter.com | `connectbusinesscenter` |
| **5117** | theuaegate.com | `theuaegate` |
| **5118** | peomiddleast.com | `peomiddleeast` |
| **5120** | alburaq.ae | `alburaq` |
| **5121** | izi.ae | `izi` |
| **5122** | snapsale.ae | `snapsale` |
| **5124** | kpmpro.ae | `kpmpro` |

Retired (removed from repo): `emiratisationnafis.org`, `interlibya.com`, `connectresources.info`.

The **34-site live cutover** below is Aaron’s go-live set (28 already live + next 6). The other scaffolded sites (including the eight **5112–5122** additions and **5098** connectresourcesint) stay on `work/astro-sites` until baked and switched.

## Production / fleet sites (34 live cutover)

**Cut-off branch:** [`work/live-fleet-34`](https://github.com/Connect-Group-Tech/Astro-websites/tree/work/live-fleet-34) (same tree on personal) · working branch: `work/astro-sites`  
**34 domains** going live · ports **5080–5124** · **28 already live** + **6 next cutover**

### Already live (28)

| Domain | Port | Unit | CMS shape |
|--------|------|------|-----------|
| evolutionmiddleast.com | **5080** | `evolutionmiddleast` | Full |
| cbss.ae | **5081** | `cbss` | Leads only |
| spheavyrental.ae | **5082** | `spheavyrental` | Full |
| iberiaworkforce.com | **5083** | `iberiaworkforce` | Leads only |
| connecthr.ae | **5084** | `connecthr` | Full |
| connectgroup.co | **5085** | `connectgroup` | Full |
| connectresources.ae | **5086** | `connectresources` | Full |
| connectfm.ae | **5087** | `connectfm` | Full |
| connectresources.sa | **5088** | `connectresources-sa` | Full |
| iberiaeor.com | **5089** | `iberiaeor` | Full |
| eormiddleast.com | **5090** | `eormiddleast` | Full |
| connectstaff.ae | **5091** | `connectstaff` | Full |
| c-uae.com | **5092** | `cuae` | Full |
| kinzahr.com | **5093** | `kinzahr` | Full |
| connectfreelance.ae | **5094** | `connectfreelance` | Full |
| redo.ae | **5095** | `redo` | Full |
| connectfz.com | **5096** | `connectfz` | Full |
| royalvisa.ae | **5097** | `royalvisa` | Full |
| thefreelancergate.com | **5100** | `thefreelancergate` | Full |
| ngmanpower.com | **5102** | `ngmanpower` | Full |
| emiratiguard.com | **5103** | `emiratiguard` | Full |
| emiratisationgate.org | **5105** | `emiratisationgate` | Full |
| emiratisationgateway.com | **5106** | `emiratisationgateway` | Full |
| freelancerdxb.com | **5109** | `freelancerdxb` | Full |
| payrollmiddleast.org | **5110** | `payrollmiddleast` | Full |
| pittant.com | **5111** | `pittant` | Full |
| peomiddleast.com | **5118** | `peomiddleeast` | Full |
| kpmpro.ae | **5124** | `kpmpro` | Full |

### Next 6 (cutover / go-live)

| Domain | Port | Unit | CMS shape |
|--------|------|------|-----------|
| mbs-consultancy.com | **5099** | `mbs-consultancy` | Full |
| connectzone.ae | **5101** | `connectzone` | Full |
| movey.ae | **5104** | `movey` | Full |
| emiratisationhub.com | **5107** | `emiratisationhub` | Full |
| companyformationsaudi.com | **5114** | `companyformationsaudi` | Full |
| alburaq.ae | **5120** | `alburaq` | Full |

**Also on live Caddy (Aaron):** `connectresourcesint.com` (**5098**) — live stub; counted in the **42** fleet, not in the 34-site cut-off branch.

Fleet version pin (catalog): **Astro `7.1.6`** · **`@astrojs/node` `11.0.3`** · **TypeScript `5.9.2`**.

---

## Centralized dependencies (pnpm)

| Piece | Role |
|-------|------|
| `pnpm-workspace.yaml` | Members: `Astro-production/*`, `packages/*` + **version catalog** |
| `.npmrc` | `store-dir=.pnpm-store`, `shamefully-hoist=false` |
| Root `pnpm-lock.yaml` | Single lockfile for the fleet |
| Per-site `node_modules` | Small **symlink trees** into the store (~1 MB), not full copies |
| `.pnpm-store/` | Content-addressed packages (gitignored) |

```bash
# From repo root — install once for all sites + @connect/site-cms
pnpm install
```

Upgrade Astro fleet-wide: bump the catalog in `pnpm-workspace.yaml` → `pnpm install` → rebuild.

---

## Shared CMS — `@connect/site-cms`

Package: [`packages/site-cms`](packages/site-cms/README.md).

| In the package | Per site |
|----------------|----------|
| HTTP handlers for `/api/internal/*` (leads, posts, redirects, GTM, SEO, uploads, php-files) | `src/cms.ts` — `configureSiteCms({ siteId, features, … })` |
| Leads file-store, bearer auth, default GTM/uploads/SEO/redirects stores | Pipedrive / logger / email services |
| | Blog/posts **data** (Evolution JSON files vs SP `src/data/`) via adapters |
| | Thin route files that re-export package handlers |

**Features flags**

- `FEATURES_LEADS_ONLY` — CBSS, Iberia  
- `FEATURES_FULL_CMS` — Evolution, SP Heavy  

**FLOW / machine auth**

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

One secret **per domain**. No per-site login dashboard — FLOW is the UI.

### Public APIs (all SSR sites)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/health` | Liveness |
| `POST` | `/api/contact` | JSON lead capture → file store → Pipedrive |
| `GET` | `/api/geo` | Country hint for phone UI (where enabled) |

### Internal APIs (bearer)

**All sites (leads):**  
`/api/internal/leads`, `/api/internal/leads/:publicId`, `/api/internal/export-leads`, `/api/internal/retry-lead`, `/api/internal/run-retries`

**Full CMS only (Evolution, SP Heavy):**  
posts (+ categories/tags), redirects, gtm, seo/*, uploads, php-files  

Details for Aaron / FLOW: see [docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) § public + internal contract.

---

## Forms / leads / security (app level)

- Contact body: **JSON** to `/api/contact` (not raw FormData behind Caddy).
- Validation, honeypot, **5 req / 60s / IP** rate limit, attribution (UTM/gclid/…).
- Phone: CBSS uses intl-tel + `/api/geo`; Iberia plain tel.
- Lead path: **file store + Pipedrive only** — do **not** configure SMTP / `FORM_NOTIFICATION_*`.
- Pipedrive “User Landed On” is sourced from `landingPageUrl` (first landing page/session URL), not `referrerUrl` — verified in source on 2026-08-13 UTC.
- `astro.config` `security.allowedDomains` for apex + www.
- Unknown URLs → **404** (not prepare:page 503).
- Prod binary: `astro build` → `node ./dist/server/entry.mjs` — never `astro dev` in production.

---

## Getting started (local)

### 1. Prerequisites

- Node `>=22.12.0`
- Corepack / pnpm 9.15+ (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)

### 2. Clone & install

```bash
git clone git@github-connectgroup:Connect-Group-Tech/Astro-websites.git
cd Astro-websites
git checkout work/astro-sites   # fleet branch
pnpm install
```

### 3. Env files (gitignored)

Copy each site’s `.env.example` → `.env` and fill secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …).  
**Never commit** `.env` / `.env.prod` / `.data/` or local `*.code-workspace` files (gitignored).

### 4. Build & run (fleet runner — recommended)

Same ports as production; process model matches prod (`node dist/server/entry.mjs`):

```bash
# All scaffolded sites (or comma-separated subset)
node scripts/fleet-local.mjs up all
node scripts/fleet-local.mjs status all
node scripts/fleet-local.mjs smoke all
node scripts/fleet-local.mjs stop all

# Example subset
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental,iberiaworkforce
```

Or use root scripts (default trio without Iberia):

```bash
pnpm run fleet:up
pnpm run fleet:smoke
pnpm run fleet:stop
```

Open:

- http://127.0.0.1:5080/ — Evolution  
- http://127.0.0.1:5081/ — CBSS  
- http://127.0.0.1:5082/ — SP Heavy  
- http://127.0.0.1:5083/ — Iberia Workforce  
- http://127.0.0.1:5084/ — Connect HR  
- http://127.0.0.1:5116/ — Connect Business Center  
- http://127.0.0.1:5121/ — IZI Rent a Car  

Full port list: table above or [`docs/FLEET-PORT-REGISTRY.md`](docs/FLEET-PORT-REGISTRY.md).

### 5. Single-site (optional)

```bash
pnpm --filter iberiaworkforce-astro run build
pnpm --filter iberiaworkforce-astro run start   # needs HOST/PORT in env or use fleet-local
```

---

## Deploy templates & server

Each production site has `deploy/`:

- `*.service` — systemd unit (`User=site-*`, `MemoryMax`, **required** `EnvironmentFile=…/.env.prod` with **no** leading `-`)
- `*.caddy` — bare hosts, named CA `astro_origin_2026`, paired manual loaders and canonical redirects
- `ROOT_SETUP.md` — host notes

**Authoritative host checklist:** [docs/server-ops-only.md](docs/server-ops-only.md)

Tier 1 is live with the root-owned single Caddyfile. Restic timer is live; templates live under [Astro-production/deploy-host/](Astro-production/deploy-host/). Repo `deploy/*.caddy` / `*.service` use named CAs, paired loaders and required `.env.prod`.

Preserve on deploy: `.env.prod`, `.data/`, and the non-secret `.env` (`PUBLIC_SITE_URL`). Do not overwrite with empty laptop files.

---

## Adding site #5+

1. Copy closest peer under `Astro-production/<domain>/` (leads → Iberia/CBSS; full CMS → Evolution/SP).
2. Add row to `scripts/fleet-sites.json` (unique port).
3. `package.json`: catalog deps + `"@connect/site-cms": "workspace:*"`.
4. `src/cms.ts` + middleware `import './cms'`.
5. Thin `/api/internal/*` mounts from the package.
6. Blog? Keep files under **that site** (`src/content/blog` or `src/data/…`) and register posts/taxonomy adapters.
7. `pnpm install` → `fleet-local` up + smoke.

Full checklist: [docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md).

---

## Documentation map

| Doc | When to read |
|-----|----------------|
| **This README** | Start here — architecture & local start |
| [docs/CURSOR-CONVERT-STATIC-TO-ASTRO.md](docs/CURSOR-CONVERT-STATIC-TO-ASTRO.md) | **Cursor:** convert WP/static → fleet site |
| [docs/CURSOR-RUN-FLEET.md](docs/CURSOR-RUN-FLEET.md) | **Cursor:** clone + run this monorepo |
| [docs/CURSOR-WP-CLONE-MALWARE-SCAN.md](docs/CURSOR-WP-CLONE-MALWARE-SCAN.md) | **Cursor:** WP clone malware / inject scan |
| [docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Convert/add a site; forms; FLOW API summary |
| [docs/local-fleet-test.md](docs/local-fleet-test.md) | Fleet runner details |
| [docs/server-side-work.md](docs/server-side-work.md) | Server overview |
| [docs/server-ops-only.md](docs/server-ops-only.md) | Root-only host work |
| [Astro-production/deploy-host/](Astro-production/deploy-host/) | Restic backup install (path `/var/backups/astro-fleet`) |
| [packages/site-cms/README.md](packages/site-cms/README.md) | Shared CMS package bind/mount |
| `Astro-production/<domain>/docs/CONNECT-ASTRO-FLEET-STANDARD.md` | Per-site contract copy |

---

## Principles (do / don’t)

| Do | Don’t |
|----|--------|
| Exact version pins / catalog | Carets (`^`) that drift by install date |
| JSON contact + bearer CMS | Per-site dashboard UI; FormData-only contact behind Caddy |
| One `INTERNAL_JOB_SECRET` per domain | Reuse one secret for all sites |
| Pipedrive + file lead store | Configure SMTP for lead notify |
| `astro build` + `entry.mjs` in prod | `astro dev` on the server |
| Thin site mounts + adapters | Fork full `/api/internal` trees again |

---

## License / ownership

Private Connect Group Tech repository. Internal use only.
