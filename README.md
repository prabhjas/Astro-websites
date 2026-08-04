# Connect Group — Astro websites fleet

Monorepo for Connect Group production Astro sites: one workspace, shared version pins, shared CMS API package, per-site content and secrets.

| | |
|--|--|
| **GitHub** | [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites) |
| **Branch (fleet work)** | `work/astro-sites` |
| **Node** | `>=22.12.0` |
| **Package manager** | **pnpm** `>=9.15.0` (see `packageManager` in root `package.json`) |

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
│   ├── CURSOR-CONVERT-STATIC-TO-ASTRO.md
│   ├── CURSOR-RUN-FLEET.md
│   └── …
├── Astro-production/                    ← live-shaped sites
│   ├── evolutionmiddleast.com/          ← full CMS + WP mirror
│   ├── cbss.ae/                         ← leads-heavy marketing
│   ├── spheavyrental.ae/                ← full CMS (SP data store)
│   ├── iberiaworkforce.com/             ← leads + EN/ES marketing
│   ├── connectresources.ae/             ← full CMS + Impreza WP mirror
│   └── deploy-host/                     ← restic backup units
```

### Runtime model (production)

```text
Browser / FLOW
    │  HTTPS :443
    ▼
Caddy (TLS, reverse_proxy)     ← prefer one file per site under sites.d/
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

## Production sites

| Domain | Local / unit port | Unit name | CMS features | Blog content (on disk) |
|--------|-------------------|-----------|--------------|-------------------------|
| evolutionmiddleast.com | **5080** | `evolutionmiddleast` | Full | `src/content/blog/*.json` |
| cbss.ae | **5081** | `cbss` | Leads only | — |
| spheavyrental.ae | **5082** | `spheavyrental` | Full | `src/data/posts.json` (+ categories/tags/…) |
| iberiaworkforce.com | **5083** | `iberiaworkforce` | Leads only | — |
| connectresources.ae | **5084** | `connectresources` | Full | `src/data/posts.json` (+ pages/guides/press) |

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

```bash
# examples
cp Astro-production/cbss.ae/.env.example Astro-production/cbss.ae/.env
cp Astro-production/iberiaworkforce.com/.env.example Astro-production/iberiaworkforce.com/.env
# … same for evolution / spheavy
```

For local fleet, set `PUBLIC_SITE_URL=http://127.0.0.1:<PORT>` (ports in the table above).  
**Never commit** `.env` / `.env.prod` / `.data/`.

### 4. Build & run (fleet runner — recommended)

Same ports as production; process model matches prod (`node dist/server/entry.mjs`):

```bash
# All four (or subset)
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental,iberiaworkforce
node scripts/fleet-local.mjs status all
node scripts/fleet-local.mjs smoke evolutionmiddleast,cbss,spheavyrental,iberiaworkforce
node scripts/fleet-local.mjs stop all
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
- http://127.0.0.1:5083/ — Iberia  
- http://127.0.0.1:5084/ — Connect Resources  

### 5. Single-site (optional)

```bash
pnpm --filter iberiaworkforce-astro run build
pnpm --filter iberiaworkforce-astro run start   # needs HOST/PORT in env or use fleet-local
```

---

## Deploy templates & server

Each production site has `deploy/`:

- `*.service` — systemd unit (`User=site-*`, `MemoryMax`, **required** `EnvironmentFile=…/.env.prod` with **no** leading `-`)
- `*.caddy` — `http://` + `https://` + `tls internal` (not bare hostnames — Cloudflare Flexible redirect loop)
- `ROOT_SETUP.md` — host notes

**Authoritative host checklist:** [docs/server-ops-only.md](docs/server-ops-only.md)

Tier 1 is live (all four units + Caddy `sites.d`). Restic timer is live; templates live under [Astro-production/deploy-host/](Astro-production/deploy-host/). Repo `deploy/*.caddy` / `*.service` on this branch match the live footguns (tls internal; required `.env.prod`).

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
