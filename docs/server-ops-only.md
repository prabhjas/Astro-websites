# Server-only ops (Astro host)

**Do this on the box:** `ssh astro-connectgroup` → `webdev@178.105.150.67`  
**Needs root** for users, units, Caddy, backups (webdev only has `sudo site-ctl`).  
**App/code is ready in git** — this file is only what **cannot** be finished on a laptop.

Related: [server-side-work.md](server-side-work.md) · [local-fleet-test.md](local-fleet-test.md) · each site `deploy/`

**Deferred for now:** pulling Iberia `.env` (root:root 600) — leave until ops unlocks readability.

---

## Live facts (as of last check)

| Check | Live state | Target |
|-------|------------|--------|
| Unit `User=` | empty → **root** | `site-<name>` |
| `MemoryMax` | infinity | `256M` |
| Caddy | one big Caddyfile (+ `.bak`s) | `sites.d/*.caddy` + `import` |
| Backups | `e2scrub_all` only | restic/borg off-box |
| Iberia ExecStart | `node dist/server/entry.mjs` (good) but port **5075**, env root-only | port **5083**, `.env.prod` for site user |
| SP Heavy unit | **inactive / missing** | install from `deploy/spheavyrental.service` |
| `site-ctl` ALLOWED | missing `spheavyrental` | all 4 names |

---

## Port / user / unit map

| Domain | Unit | PORT | Unix user | Deploy templates |
|--------|------|------|-----------|------------------|
| evolutionmiddleast.com | `evolutionmiddleast` | 5080 | `site-evolutionmiddleast` | `Astro-production/evolutionmiddleast.com/deploy/` |
| cbss.ae | `cbss` | 5081 | `site-cbss` | `Astro-production/cbss.ae/deploy/` |
| spheavyrental.ae | `spheavyrental` | 5082 | `site-spheavyrental` | `Astro-production/spheavyrental.ae/deploy/` |
| iberiaworkforce.com | `iberiaworkforce` | 5083 | `site-iberiaworkforce` | `Astro-production/iberiaworkforce.com/deploy/` |

Confirm free ports before swapping Iberia **5075 → 5083**.

---

## A. Sync code from git (webdev, after push)

```bash
# On laptop (Connect Group GitHub):
#   git push origin work/astro-sites   # or merge to main first

# On server — preserve secrets + lead data:
cd /opt/Astro-production
# Prefer: git pull / rsync from CI — DO NOT overwrite:
#   */.env.prod  */.data/  (and any live .env until migrated)
```

Then per site (or fleet pnpm workspace when synced to this host):

```bash
cd /opt/Astro-production/<domain>
pnpm install && pnpm run build    # or npm ci && npm run build until pnpm on host
sudo site-ctl restart <unit>
curl -sS http://127.0.0.1:<PORT>/api/health/
```

---

## B. Tier 1 — systemd isolation (root) — **highest value**

For **each** of the 4 sites:

### B1. Create user

```bash
useradd --system --home /opt/Astro-production/<domain> --shell /usr/sbin/nologin site-<name>
# names: site-evolutionmiddleast | site-cbss | site-spheavyrental | site-iberiaworkforce
```

### B2. Env + data ownership

```bash
# Prefer fleet shape:
#   .env.prod  mode 600, owned by site user (or group-readable)
#   no HOST/PORT inside .env.prod
#   LF line endings only
mkdir -p /opt/Astro-production/<domain>/.data
chown -R site-<name>:site-<name> /opt/Astro-production/<domain>/.data
# Migrate secrets from old root-owned .env → .env.prod, then lock down
```

### B3. Install unit from repo template

```bash
cp /opt/Astro-production/<domain>/deploy/<unit>.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now <unit>
systemctl show <unit> -p User,MemoryMax,CPUQuotaPerSecUSec,ExecStart
# Expect: User=site-…  MemoryMax=268435456  ExecStart=… node …entry.mjs
```

### B4. Smoke

```bash
curl -sS http://127.0.0.1:<PORT>/api/health/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<PORT>/
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<PORT>/this-should-404-fleet-test/
```

### B5. Iberia-specific cutover

- [ ] Confirm not running `astro dev`
- [ ] Switch listen port **5075 → 5083** (unit + Caddy together)
- [ ] RSS ~100–120 MB peer range (not ~246 MB)
- [ ] Homepage + `/api/health` + contact smoke on public hostname after Caddy

### B6. site-ctl allowlist

```bash
# /usr/local/sbin/site-ctl
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental"
```

---

## C. Tier 1 — split Caddyfile (root)

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/evolutionmiddleast.com/deploy/evolutionmiddleast.com.caddy /etc/caddy/sites.d/
cp /opt/Astro-production/cbss.ae/deploy/cbss.ae.caddy /etc/caddy/sites.d/
cp /opt/Astro-production/spheavyrental.ae/deploy/spheavyrental.ae.caddy /etc/caddy/sites.d/
cp /opt/Astro-production/iberiaworkforce.com/deploy/iberiaworkforce.com.caddy /etc/caddy/sites.d/
```

Main `/etc/caddy/Caddyfile` should reduce to shared defaults +:

```caddy
import /etc/caddy/sites.d/*.caddy
```

**Always:**

```bash
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

- [ ] Remove/archive old monolithic site blocks (keep a dated backup outside the live path)
- [ ] Delete stale `.bak` files once validate+reload is proven
- [ ] Confirm all 4 public hostnames return 200

Optional: wrap reload in a tiny script that refuses reload if validate fails.

---

## D. Tier 1 — off-box backups (root + Aaron)

- [ ] Choose destination (S3 / B2 / remote VPS) — **ask Aaron**
- [ ] Install restic (or borg)
- [ ] First snapshot:
  - `/opt/Astro-production/` (includes `.env.prod` + `.data` — encrypt repo)
  - `/etc/caddy/`
  - `/etc/systemd/system/{evolutionmiddleast,cbss,iberiaworkforce,spheavyrental}.service`
- [ ] Nightly timer
- [ ] Monthly restore drill documented

Without this, every other Tier 1 win is still “recoverable in minutes” only if disks survive.

---

## E. P1 on host — pnpm (after Tier 1 or in parallel)

- [ ] `corepack enable && corepack prepare pnpm@9.15.9 --activate`
- [ ] Sync monorepo/`pnpm-workspace.yaml` + `pnpm-lock.yaml` to the deploy root layout you choose
- [ ] `pnpm install` once; rebuild sites; restart units
- [ ] Do **not** hoist one shared `node_modules` for all domains

---

## F. Public smoke (after each change)

```bash
BASE=https://www.<domain>   # or apex
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -sS "$BASE/api/health/"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"
```

---

## G. Later (not this week)

| Item | When |
|------|------|
| `@connect/site-cms` + canary rollout | After Tier 1 green |
| SSR vs static inventory (~40 domains) | Before site #10 SSR |
| Shard to 3–4 hosts | After ~10 SSR |
| CDN/object storage for pure static | With inventory |
| Iberia `.env` pull for local Pipedrive parity | When root grants webdev read / migrates to `.env.prod` |

---

## H. Open with Aaron before starting

1. Backup destination + who holds credentials  
2. Confirm unix user names (`site-evolutionmiddleast` vs short)  
3. Who applies units / Caddy (root session vs expanded sudo)  
4. Iberia port move 5075 → 5083 maintenance window  
5. Order: **units + Iberia process → Caddy split → backups**

---

## Checklist summary (server)

- [ ] **B** systemd Tier 1 for all 4 (users, MemoryMax, non-root)
- [ ] **B5** Iberia port/process cutover
- [ ] **B6** site-ctl includes `spheavyrental`
- [ ] **C** Caddy `sites.d` + validate-before-reload
- [ ] **D** restic off-box + restore drill
- [ ] **A/E** sync fleet build + pnpm on host
- [ ] **F** public smoke all 4 hostnames

**Local is done enough to stop.** Everything above is host/root work.
