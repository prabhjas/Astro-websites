# Host backups (restic) — decision

**Decided 2026-07-31** for Connect Group Astro fleet on `178.105.150.67`.  
**Updated 2026-08-06** — stop hardcoding four sites; **auto-discover** every site under `/opt/Astro-production`.

| Item | Value |
|------|--------|
| Restic repository | `/var/backups/astro-fleet/restic` |
| Password file | `/etc/restic/astro-fleet.password` (root `0600`) |
| Cache | `/var/cache/restic/astro-fleet` |
| Timer | Daily `03:15` local (`restic-astro-fleet.timer`) |
| Script | `/usr/local/sbin/restic-astro-fleet-backup` (from `restic-astro-fleet-backup.sh`) |

## Why this place / name

- **Name `astro-fleet`** — one repo, one password, one timer for the whole Astro host.
- **Path under `/var/backups/`** — standard Linux backup mount point; easy to move later if `/var` is a separate volume.
- **On-box encrypted restic first** — irreplaceable data is tiny (`.env.prod` + lead stores + Caddy/systemd). Encryption means a disk dump without the password file is useless. Rebuildable `node_modules` / `dist` / `.pnpm-store` are **excluded**.
- **Phase 2 (optional):** `restic copy` or rclone the same repo to B2/S3/another host when credentials exist. Do not block go-live on cloud storage.

## What is backed up (auto-discovered)

Every first-level site dir under `/opt/Astro-production/` that has `package.json`, `.env.prod`, `.env`, or `.data` (skips `deploy-host`, `_incoming`, etc.):

```
/opt/Astro-production/<site>/.env.prod
/opt/Astro-production/<site>/.env
/opt/Astro-production/<site>/.data
# plus any LEAD_STORE_DIR / INTERNAL_*_DIR from that site's .env.prod
# (absolute paths like /var/evolutionmiddleast are included)

/etc/caddy
/etc/systemd/system/*.service   # only units that reference Astro-production / site-ctl / astro-fleet
/usr/local/sbin/site-ctl
/usr/local/sbin/restic-astro-fleet-backup
restic timer + service units
```

**Never hardcode a site list.** New cutovers are invisible to a hardcoded list, and the job still reports success — that is how customer leads were left unprotected (Aug 2026).

Dry-run (root):

```bash
/usr/local/sbin/restic-astro-fleet-backup --dry-run
# Must list EVERY live domain that has .data or LEAD_STORE_DIR — not only the original four.
```

## Install / refresh (root only)

From this directory (or `/opt/Astro-production/deploy-host` after sync):

```bash
# 1) Packages (first time)
apt-get update && apt-get install -y restic

# 2) Password (first time only; store offline too)
install -d -m 700 /etc/restic /var/backups/astro-fleet /var/cache/restic/astro-fleet
openssl rand -base64 32 > /etc/restic/astro-fleet.password
chmod 600 /etc/restic/astro-fleet.password

# 3) Install / refresh script + units
install -m 755 restic-astro-fleet-backup.sh /usr/local/sbin/restic-astro-fleet-backup
install -m 644 restic-astro-fleet.service /etc/systemd/system/
install -m 644 restic-astro-fleet.timer /etc/systemd/system/

# 4) Init repo (once) + enable timer
export RESTIC_REPOSITORY=/var/backups/astro-fleet/restic
export RESTIC_PASSWORD_FILE=/etc/restic/astro-fleet.password
# restic init   # first time only
systemctl daemon-reload
systemctl enable --now restic-astro-fleet.timer

# 5) Dry-run then first run + smoke
/usr/local/sbin/restic-astro-fleet-backup --dry-run | tee /tmp/restic-astro-fleet-dry-run.txt
systemctl start restic-astro-fleet.service
journalctl -u restic-astro-fleet.service -n 40 --no-pager
restic snapshots
```

One-liner after a git sync of `deploy-host/`:

```bash
sudo bash /opt/Astro-production/deploy-host/ROOT-REFRESH-RESTIC-BACKUP.sh
```

Keep a copy of `/etc/restic/astro-fleet.password` in the team password manager. Without it, backups are unrecoverable.

## Ops write-up

Also update `/root/ROOT-OPS-*.md` with: repo path, that password lives in `/etc/restic/` + vault, last successful `restic snapshots` date, and that site discovery is automatic (no per-site edit of the backup script).
