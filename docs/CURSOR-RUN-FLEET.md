# Run the Connect Group Astro fleet (local)

**Audience:** developers and Cursor agents who need to clone this repo and run sites the way the fleet is structured today.  
**Repo:** [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites)  
**Companion:** [CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md) (add / convert a new site)

| Field | Value |
|-------|--------|
| **Updated** | 2026-08-03 |
| **Node** | `>=22.12.0` |
| **pnpm** | `>=9.15.0` (repo pins `pnpm@9.15.9` via `packageManager`) |
| **Default branch for fleet work** | Prefer current `main` (or your team’s working branch) |

Paste into Cursor: *Follow CURSOR-RUN-FLEET.md to set up and run this monorepo.*

---

## 1. What you are running

```text
Astro-websites/                     ← monorepo root (pnpm workspace)
├── packages/site-cms/              ← @connect/site-cms (shared)
├── scripts/fleet-local.mjs         ← local prod-like runner
├── scripts/fleet-sites.json        ← ports / dirs / unit names
└── Astro-production/
    ├── evolutionmiddleast.com/     ← :5080
    ├── cbss.ae/                    ← :5081
    ├── spheavyrental.ae/           ← :5082
    ├── iberiaworkforce.com/        ← :5083
    ├── connecthr.ae/               ← :5084
    └── connectgroup.co/            ← :5085
```

Same model as production: **build once → `node dist/server/entry.mjs` on a fixed port**.  
Local runner hits `http://127.0.0.1:<PORT>/` (no Caddy required on the laptop).

---

## 2. Clone and toolchain

```bash
git clone git@github.com:Connect-Group-Tech/Astro-websites.git
cd Astro-websites

# Node 22+
node -v   # expect v22.12+ 

corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm -v
```

Install **once from the repo root** (all sites + shared package + one lockfile):

```bash
pnpm install
```

Do **not** run `npm install` inside a single site folder as the primary workflow.

---

## 3. Environment files (important)

### Laptop (local)

| File | Purpose |
|------|---------|
| `Astro-production/<domain>/.env` | Gitignored. Copy from `.env.example`. Full secrets OK for smoke. |
| `.env.example` | Committed template |

```bash
# Example for one site
cp Astro-production/cbss.ae/.env.example Astro-production/cbss.ae/.env
# Edit PUBLIC_SITE_URL, INTERNAL_JOB_SECRET, Pipedrive keys as needed
```

`HOST` / `PORT` are set by `fleet-local` / systemd — leave them out of `.env`.

### Production host (for awareness)

| File | Purpose |
|------|---------|
| `.env` | Build-only `PUBLIC_SITE_URL` (no secrets) |
| `.env.prod` | Runtime secrets loaded by systemd (`EnvironmentFile=` **required**, no `-`) |

When syncing to the server: **never overwrite** live `.env.prod` or `.data/` with empty laptop files.

---

## 4. Port map

| Site ID | Domain | Port | Browser |
|---------|--------|------|---------|
| `evolutionmiddleast` | evolutionmiddleast.com | **5080** | http://127.0.0.1:5080/ |
| `cbss` | cbss.ae | **5081** | http://127.0.0.1:5081/ |
| `spheavyrental` | spheavyrental.ae | **5082** | http://127.0.0.1:5082/ |
| `iberiaworkforce` | iberiaworkforce.com | **5083** | http://127.0.0.1:5083/ |
| `connecthr` | connecthr.ae | **5084** | http://127.0.0.1:5084/ |
| `connectgroup` | connectgroup.co | **5085** | http://127.0.0.1:5085/ |

Registry: `scripts/fleet-sites.json`. New sites take **5086+**.

---

## 5. Daily commands (from repo root)

### List sites

```bash
pnpm fleet:list
# or
node scripts/fleet-local.mjs list
```

### Build

```bash
# All production sites
pnpm fleet:build

# One site (use package.json "name")
pnpm --filter astro-cbss run build
pnpm --filter evolutionmiddleast-astro run build
pnpm --filter spheavy-rental run build
pnpm --filter iberiaworkforce-astro run build
```

### Start (prod-like SSR)

```bash
# One site
node scripts/fleet-local.mjs up cbss

# Several (comma-separated ids)
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental,iberiaworkforce

# npm-script trio (Evolution + CBSS + SP) — see package.json
pnpm fleet:up
```

### Smoke / status / stop

```bash
node scripts/fleet-local.mjs smoke cbss
node scripts/fleet-local.mjs status cbss
node scripts/fleet-local.mjs stop cbss
node scripts/fleet-local.mjs restart cbss
```

Root helpers:

```bash
pnpm fleet:smoke
pnpm fleet:status
pnpm fleet:stop
```

Logs/PIDs: `local/logs/`, `local/pids/` (gitignored).

---

## 6. Optional: Astro dev (UI only)

For fast UI iteration **on one site**:

```bash
cd Astro-production/cbss.ae
pnpm exec astro dev --port 4321
```

Do **not** treat `astro dev` as a production or fleet-smoke substitute. Forms/CMS/auth paths are validated with `fleet-local` (built `entry.mjs`).

---

## 7. Quick health checks

```bash
curl -sS http://127.0.0.1:5081/api/health/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5081/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5081/this-should-404-fleet-test
# expect 404

# SP LLM routes (when that site is up)
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5082/llms.txt
```

Contact smoke: JSON `POST` to `/api/contact/` (see peer `ContactForm` / playbook). Internal CMS needs:

```http
Authorization: Bearer <INTERNAL_JOB_SECRET from that site's .env>
```

---

## 8. Workspace layout rules

| Piece | Role |
|-------|------|
| `pnpm-workspace.yaml` | Members + **version catalog** |
| `pnpm-lock.yaml` | Single lockfile at root |
| `.pnpm-store/` | Content store (gitignored) |
| `@connect/site-cms` | Shared `/api/internal/*` handlers |
| Per-site `node_modules` | Symlink trees into the store — not four full copies |

Bump Astro for everyone: edit catalog in `pnpm-workspace.yaml` → `pnpm install` → rebuild.

---

## 9. Production (read-only for most developers)

| | |
|--|--|
| Host tree | `/opt/Astro-production/` |
| Process | systemd `site-*` user → `entry.mjs` |
| Edge | Caddy `sites.d/*.caddy` → `127.0.0.1:<PORT>` |
| Restart | `sudo site-ctl restart <unit>` |
| Backups | `Astro-production/deploy-host/` → restic `/var/backups/astro-fleet` |

Host checklist: [server-ops-only.md](server-ops-only.md).  
Do not experiment with `astro dev` on the live box.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `pnpm: command not found` | `corepack enable` + prepare `pnpm@9.15.9` |
| Wrong Astro version | Install from **root**; check catalog, not a nested lockfile |
| Port in use | `fleet-local stop <id>` or free 5080–5085 |
| Health 500 / empty Pipedrive | Fill `.env` from `.env.example`; never expect server `.env.prod` on laptop |
| Origin / contact 403 | JSON POST + `PUBLIC_SITE_URL` / `allowedDomains` match how you open the site |
| Workspace package missing | `pnpm install` after adding `"@connect/site-cms": "workspace:*"` |

---

## 11. Related docs

| Doc | When |
|-----|------|
| [CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md) | New site / WP → Astro |
| [local-fleet-test.md](local-fleet-test.md) | Deeper fleet-local behaviour |
| [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Forms + FLOW APIs |
| Root [README.md](../README.md) | Architecture overview |
| [packages/site-cms/README.md](../packages/site-cms/README.md) | CMS package bind |
