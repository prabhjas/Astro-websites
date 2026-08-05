# Server-side work (Astro host)

**Where:** SSH to `webdev@178.105.150.67` (host `Astro`) · trees under `/opt/Astro-production/`  
**When:** Later — **not** in the Evolution git repo alone. Needs **root** for users, units, Caddy, backups.  
**Contract:** [CONNECT-ASTRO-FLEET-STANDARD.md](CONNECT-ASTRO-FLEET-STANDARD.md)  
**Full sequence:** [15-platform-work-plan.md](15-platform-work-plan.md)

This file is the **on-server checklist** only. App/code changes live in each site repo (`deploy/` templates, exact pins, APIs).

---

## Sites on this box

| Domain | Path | Unit (typical) | PORT |
|--------|------|----------------|------|
| connectstaff.ae | `/opt/Astro-production/connectstaff.ae` | `connectstaff` | 5080 |
| cbss.ae | `/opt/Astro-production/cbss.ae` | `cbss` | 5081 |
| spheavyrental.ae | `/opt/Astro-production/spheavyrental.ae` | `spheavyrental` | 5082 |
| iberiaworkforce.com | `/opt/Astro-production/iberiaworkforce.com` | `iberiaworkforce` | confirm |

Restart (webdev today): `sudo site-ctl restart <name>`

---

## P0 — Tier 1 (do first)

### P0.1 Iberia production process

- [ ] `systemctl show iberiaworkforce -p ExecStart,MemoryCurrent`
- [ ] If running `astro dev` → switch to `astro build` + `node dist/server/entry.mjs`
- [ ] Restart; compare RSS to peers (~100–120 MB, not ~246 MB)
- [ ] Smoke homepage + any API

### P0.2 Per-site systemd isolation

For **each** of the 4 sites (use repo `deploy/*.service` as source; Evolution: `deploy/connectstaff.service`):

- [ ] Create `site-<name>` system user/group
- [ ] Fix ownership on `.data` (and env readability for that user)
- [ ] Install unit with:
  - `User=` / `Group=`
  - `MemoryMax=256M` · `MemoryHigh=200M` · `CPUQuota=50%`
  - `NoNewPrivileges` · `PrivateTmp` · `ProtectSystem=strict` · `ProtectHome`
  - `ReadWritePaths=…/.data` (+ other writable paths)
  - `HOST`/`PORT` in unit — **not** in `.env.prod`
- [ ] `daemon-reload` → restart → `systemctl show … -p User,MemoryMax`
- [ ] Smoke `/api/health` (or homepage)

### P0.3 Split Caddyfile

- [ ] Create `/etc/caddy/sites.d/`
- [ ] One `.caddy` file per site (see each repo’s `deploy/Caddyfile.snippet`)
- [ ] Main Caddyfile: `import /etc/caddy/sites.d/*.caddy`
- [ ] Access logs per site (JSON) under `/var/log/caddy/`
- [ ] Pre-reload: `caddy validate --config /etc/caddy/Caddyfile`
- [ ] `systemctl reload caddy`
- [ ] Confirm all 4 hostnames still 200

### P0.4 Off-box backups

- [ ] Choose destination (S3 / B2 / remote VPS) — **ask Aaron**
- [ ] Install restic (or borg); first snapshot of:
  - `/opt/Astro-production/`
  - `/etc/caddy/`
  - `/etc/systemd/system/{connectstaff,cbss,iberiaworkforce,spheavyrental}.service`
- [ ] Nightly cron/timer
- [ ] Schedule monthly restore test; document restore steps

---

## P1 — Versions & installs on server

- [ ] Install **pnpm** on host; pilot workspace under `/opt/Astro-production` (or monorepo deploy path)
- [ ] Evolution + SP Heavy: exact pins already in git — `pnpm install` / build / restart after sync
- [ ] Iberia → Astro `7.1.6` (+ Tailwind 4 or exception), build, restart
- [ ] CBSS → Astro `7.1.6` (**major** — own window; do **after** P0)

---

## P2 — Shared CMS package (on server / monorepo)

- [ ] Land `packages/site-cms` (`@connect/site-cms`)
- [ ] Evolution canary import → build → restart → smoke bearer APIs
- [ ] SP Heavy drop duplicate `/api/internal` → same **exact** package version
- [ ] CBSS / Iberia after version catch-up
- [ ] Never roll all sites on a loose `^` of the shared package

---

## P3 — Capacity & layout (later)

- [ ] Inventory: SSR vs static for upcoming ~40 domains
- [ ] Static sites → Caddy `file_server` (no Node unit)
- [ ] Optional: `releases/<id>` + `current` symlink per site; practice one rollback
- [ ] Shard to 3–4 hosts only after ~10 SSR (decision, not day-one)

---

## Smoke (every site after each change)

```bash
BASE=https://www.<domain>
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -sS "$BASE/api/health"            # if SSR
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"
```

---

## Do not do on server yet

- One shared/hoisted `node_modules` for all domains
- Hand-editing 40 unit files without a template
- Adding site #5 before P0 green + CMS package (or written exception)
- Buying extra hosts before Tier 1 + backups

---

## Open with Aaron before starting

1. Backup destination + who holds credentials  
2. Unix user naming (`site-connectstaff` vs short names)  
3. Who applies units / Caddy (root vs expanded `site-ctl`)  
4. Confirm Iberia ExecStart  
5. CBSS Astro 5 stay another week while P0 runs?
