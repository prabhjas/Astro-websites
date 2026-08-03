# Server-only ops (Astro host)

**Do this on the box:** `ssh astro-connectgroup` → `webdev@178.105.150.67`  
**Needs root** for users, units, Caddy, backups (webdev has `sudo site-ctl` for restarts).  
**App/code** lives in this monorepo; deploy templates under each site’s `deploy/`.

Related: [server-side-work.md](server-side-work.md) · [local-fleet-test.md](local-fleet-test.md) · each site `deploy/ROOT_SETUP.md`

---

## Live facts (as of 2026-08-03)

| Check | Live state |
|-------|------------|
| Unit `User=` | `site-*` (non-root) on all 4 |
| `MemoryMax` | `256M` + `ProtectSystem=strict` |
| Caddy | `/etc/caddy/sites.d/*.caddy` (`http://`+`https://`+`tls internal`) — live config; keep **repo** templates matching this |
| Iberia | Port **5083**, full reverse proxy |
| All 4 sites | Active on host (`:5080`–`:5083` `/api/health` 200) |
| Backups | **Live:** `restic-astro-fleet.timer` daily; templates in `Astro-production/deploy-host/` |
| Env | `.env.prod` `root:site-*` **0640**; build `.env` `root:webdev` **0644** (`PUBLIC_SITE_URL` only) |

Ops write-up on host: `/root/ROOT-OPS-20260731.md` · backup: `/root/ops-backup-20260731_rootops/`.

---

## Port / user / unit map

| Domain | Unit | PORT | Unix user | Deploy templates |
|--------|------|------|-----------|------------------|
| evolutionmiddleast.com | `evolutionmiddleast` | 5080 | `site-evolutionmiddleast` | `Astro-production/evolutionmiddleast.com/deploy/` |
| cbss.ae | `cbss` | 5081 | `site-cbss` | `Astro-production/cbss.ae/deploy/` |
| spheavyrental.ae | `spheavyrental` | 5082 | `site-spheavyrental` | `Astro-production/spheavyrental.ae/deploy/` |
| iberiaworkforce.com | `iberiaworkforce` | 5083 | `site-iberiaworkforce` | `Astro-production/iberiaworkforce.com/deploy/` |

---

## Deploy templates — do not “simplify”

Copying templates **verbatim** caused (or would cause) outages. Repo templates now match live:

1. **Caddy** — never use bare `example.com { … }` behind Cloudflare Flexible (auto-HTTPS 301 `:80→:443` loop). Use:
   `http://…, https://… { tls internal … }`
2. **systemd** — `EnvironmentFile=/path/.env.prod` **without** a leading `-`. Optional file boots the site with empty Pipedrive/SMTP and **silently drops leads**. Create `.env.prod` first, then enable the unit.
3. Cloudflare origin SSL: **Full**, not Full strict, while origin uses `tls internal`.
4. Keep `/etc/caddy/Caddyfile` readable by the `caddy` group — `root:root` 0600 made `reload` fail while old config stayed live.

---

## Env model (builds vs runtime)

| File | Who reads it | Contents |
|------|----------------|----------|
| `.env` | webdev / `pnpm build` | Non-secret `PUBLIC_SITE_URL` (and `SITE_URL` if needed). Wrong/missing value silently wrongs canonicals. |
| `.env.prod` | systemd site user only | Secrets. Not world-/webdev-readable. |

Local laptop: use gitignored `.env` with secrets for form/Pipedrive smoke. Do **not** expect to `cat` production `.env.prod` over SSH as webdev.

---

## A. Sync code (webdev)

```bash
# Preserve on sync:
#   */.env.prod  */.data/  */.env (build PUBLIC_SITE_URL)

cd /opt/Astro-production
pnpm install   # workspace + packages/site-cms
pnpm --filter <pkg> run build
sudo site-ctl restart <unit>
curl -sS http://127.0.0.1:<PORT>/api/health/
```

---

## B. Still useful for ops (not blocking live traffic)

| Item | Notes |
|------|-------|
| Repo deploy templates | Prefer this branch’s `*.caddy` (`tls internal`) + required `EnvironmentFile=` (no `-`) so a future copy from git does not recreate CF redirect loops or silent empty secrets |
| Restic | Already installed from `Astro-production/deploy-host/`; keep password in vault; optional restore drill / off-box `restic copy` later |
| Stale `astro dev`/`preview` | Kill if still listed in `/root/ROOT-OPS-20260731.md` |

---

## C. Smoke (every site after change)

```bash
BASE=https://www.<domain>   # or apex — match PUBLIC_SITE_URL
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -sS "$BASE/api/health/"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"
# Forms: POST /api/contact/ (Iberia also /api/lead/)
```

