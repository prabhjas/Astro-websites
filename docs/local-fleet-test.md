# Local fleet test (before server push)

> 2026-09-18 staged contract: [lead list/export retirement](FLOW-LEAD-READ-RETIREMENT.md) supersedes older lead-read examples. Activation requires verified intake/backfill and protected backend rollout; this is not a live-state claim.

**Purpose:** Run the same multi-site architecture as the Astro production host, on your Mac, so you can verify build + SSR + health + forms + internal APIs **before** syncing to `webdev@178.105.150.67`.

**Pairs with:** [server-side-work.md](server-side-work.md) · **[server-ops-only.md](server-ops-only.md)** (host/root work only) · each site’s `docs/CONNECT-ASTRO-FLEET-STANDARD.md`

---

## What “centralized locally” means

| Server (`/opt/Astro-production/`) | Local (`Astro-websites/`) |
|-----------------------------------|---------------------------|
| One tree per domain | `Astro-production/<domain>/` |
| systemd unit + unique `PORT` | `scripts/fleet-local.mjs` starts `node dist/server/entry.mjs` on the **same ports** |
| Caddy reverse-proxy + TLS | Hit `http://127.0.0.1:<PORT>/` directly (optional Caddy later) |
| `sudo site-ctl restart <name>` | `node scripts/fleet-local.mjs restart <id>` |
| `.env.prod` (secrets, no HOST/PORT) | Per-site `.env` (gitignored; local placeholders OK) |
| Smoke over HTTPS hostname | Smoke over loopback ports |

**Same process model as prod:** `astro build` → `node ./dist/server/entry.mjs` with `HOST=127.0.0.1` and fleet ports. Never use `astro dev` to simulate production.

---

## pnpm workspace + shared store + version catalog (done locally)

| Piece | Path / behaviour |
|-------|------------------|
| Workspace | `pnpm-workspace.yaml` → `Astro-production/*` |
| Shared content store | `.pnpm-store/` (gitignored) |
| Virtual store / links | root `node_modules/.pnpm` → each site’s `node_modules` is mostly **symlinks** (~1 MB each) |
| One lockfile | `pnpm-lock.yaml` at repo root |
| Fleet version catalog | `pnpm-workspace.yaml` → `catalogs.default` |
| Site deps | `"astro": "catalog:"` etc. in each `package.json` |
| Engines | `node >=22.12.0`, `pnpm >=9.15.0` |
| Forbidden | One hoisted `node_modules` shared by all domains |

**Bump Astro once for the whole fleet:**

```yaml
# pnpm-workspace.yaml → catalogs.default
astro: '7.1.7'          # change here
'@astrojs/node': '11.0.3'
```

```bash
pnpm install            # from repo root
pnpm -r --filter './Astro-production/*' run build
```

Site-only packages stay explicit in that site’s `package.json` (e.g. SP Heavy `nodemailer@9`, eslint, sharp).

**First-time / after clone:**

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
```

---

## Port map (must match server)

| Site ID | Domain | Local / server PORT | Open in browser |
|---------|--------|---------------------|-----------------|
| `evolutionmiddleast` | evolutionmiddleast.com | **5080** | http://127.0.0.1:5080/ |
| `cbss` | cbss.ae | **5081** | http://127.0.0.1:5081/ |
| `spheavyrental` | spheavyrental.ae | **5082** | http://127.0.0.1:5082/ |
| `iberiaworkforce` | iberiaworkforce.com | **5083** | http://127.0.0.1:5083/ |

Registry: `scripts/fleet-sites.json`

---

## One-command local bring-up (the 3 bring-up sites)

From repo root (`pnpm install` once after clone):

```bash
cd /Users/prabhjasbajwa/Projects/Astro-websites
pnpm install   # workspace + shared store

# Install + build + start + smoke (Evolution, CBSS, SP Heavy)
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental
```

Useful follow-ups:

```bash
node scripts/fleet-local.mjs status evolutionmiddleast,cbss,spheavyrental
node scripts/fleet-local.mjs smoke evolutionmiddleast,cbss,spheavyrental
node scripts/fleet-local.mjs stop all          # when done
node scripts/fleet-local.mjs list
```

Include Iberia too:

```bash
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental,iberiaworkforce
```

---

## What the smoke suite checks (per site)

Set `FLEET_SMOKE_CONTACT=0` for this route-retirement check. The local runner can otherwise submit real enquiries depending on registry flags; never use it against production. Production verification uses owner-controlled GET-only probes with existing keys, not the local synthetic key.

| Check | Expect |
|-------|--------|
| Homepage `GET /` | `200` |
| `GET /api/health/` | `200` + `{ "ok": true }` |
| Unknown URL | real **`404`** |
| List/export/detail/manual-retry GET, both spellings, with and without local synthetic auth | **`404`**, optionally one exact canonical slash redirect; includes list query and JSON/CSV export variants; response bodies are discarded |
| Redirects/GTM GET where mounted | **`200`** with local synthetic auth; **`401/403`** without auth |
| `POST /api/contact/` JSON + Origin | **`200`** + `success: true` for **next/scaffold** sites. **Skipped** for `tier: live` (28 production sites) so smoke does not spam Pipedrive. After form changes on a live site: `FLEET_SMOKE_CONTACT=1 node scripts/fleet-local.mjs smoke <id>` |

Logs: `local/logs/<site-id>.log` · PIDs: `local/pids/<site-id>.pid`

---

## Local result (this machine — 2026-07-31)

Brought up and smoke-tested:

| Site | Port | Result |
|------|------|--------|
| evolutionmiddleast | 5080 | **All checks PASS** |
| cbss | 5081 | **All checks PASS** |
| spheavyrental | 5082 | **All checks PASS** |

Processes left running for manual browser testing. Stop when finished:

```bash
node scripts/fleet-local.mjs stop evolutionmiddleast,cbss,spheavyrental
```

---

## What you should click / verify manually

1. **Homepage** for each port (layout, assets, no 500).
2. **Contact form** (UI) → submit once; confirm thank-you UI. Lead JSON appears under `Astro-production/<site>/.data/leads/` (Pipedrive may stay pending with the local placeholder token).
3. Optional: `curl` health again after a restart.

---

## Env notes (local only)

`fleet-local.mjs env` creates/updates each site’s `.env` (gitignored):

- `PUBLIC_SITE_URL=http://127.0.0.1:<PORT>`
- `INTERNAL_JOB_SECRET=local-fleet-test-secret`
- Placeholder Pipedrive / website IDs so Evolution & SP Heavy `getServerEnv()` can boot

**Do not commit `.env`.** For a real Pipedrive round-trip locally, replace `PIPEDRIVE_API_TOKEN` with a real token, then `restart` that site.

---

## What you cannot fully test on Mac (server-only from doc 16)

| Item | Why |
|------|-----|
| systemd `User=` / `MemoryMax` / `ProtectSystem` | Linux units only |
| Canonical Caddy TLS integration | Needs Caddy on host (optional later on Mac) |
| Off-box backups / restic | Server P0.4 |
| Real prod `.env.prod` secrets | Stay on server; never copy into git |
| `site-ctl` allowlist | Server `/usr/local/sbin/site-ctl` |

Local green ≠ “skip P0 on server” — it means **app build + SSR contract** is ready to push.

---

## After local green → push / server

1. Commit on branch `work/astro-sites` (Connect Group GitHub / `prabhjass-afk`).
2. Push remote; sync tree to `/opt/Astro-production/<domain>/` (preserve server `.env.prod` + `.data/`).
3. On server: `npm ci && npm run build` per site → `sudo site-ctl restart <unit>`.
4. Run doc **16** smoke against public HTTPS hostnames.
5. Continue Tier 1 items in `server-side-work.md` (units, Caddy split, backups).

---

## Commands cheat sheet

```bash
# List fleet
node scripts/fleet-local.mjs list

# Seed/fix local .env only
node scripts/fleet-local.mjs env evolutionmiddleast,cbss,spheavyrental

# Install / build only
node scripts/fleet-local.mjs install evolutionmiddleast,cbss,spheavyrental
node scripts/fleet-local.mjs build   evolutionmiddleast,cbss,spheavyrental

# Process control (prod-like)
node scripts/fleet-local.mjs start|stop|restart|status <ids|all>

# Full local gate before push
node scripts/fleet-local.mjs up evolutionmiddleast,cbss,spheavyrental
```

---

## Files added for this workflow

| Path | Role |
|------|------|
| `pnpm-workspace.yaml` | Workspace members + **version catalog** |
| `.npmrc` | `store-dir=.pnpm-store`, no shameful hoist |
| `pnpm-lock.yaml` | Single lockfile for all production sites |
| `.pnpm-store/` | Content-addressed package store (gitignored) |
| `scripts/fleet-sites.json` | Site registry (ports / dirs) |
| `scripts/fleet-local.mjs` | Local site-ctl equivalent (uses **pnpm**) |
| `local/logs/` · `local/pids/` | Runtime (gitignored) |
| `docs/local-fleet-test.md` | This document |
