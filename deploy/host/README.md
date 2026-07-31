# Host backups (restic) — decision

**Decided 2026-07-31** for Connect Group Astro fleet on `178.105.150.67`.

| Item | Value |
|------|--------|
| Restic repository | `/var/backups/astro-fleet/restic` |
| Password file | `/etc/restic/astro-fleet.password` (root `0600`) |
| Cache | `/var/cache/restic/astro-fleet` |
| Timer | Daily `03:15` local (`restic-astro-fleet.timer`) |
| Script | `/usr/local/sbin/restic-astro-fleet-backup` |

## Why this place / name

- **Name `astro-fleet`** — matches the four-site fleet; one repo, one password, one timer.
- **Path under `/var/backups/`** — standard Linux backup mount point; easy to move later if `/var` is a separate volume.
- **On-box encrypted restic first** — irreplaceable data is tiny (`.env.prod` + `.data` lead stores + Caddy/systemd). Encryption means a disk dump without the password file is useless. Rebuildable `node_modules` / `dist` / `.pnpm-store` are **excluded**.
- **Phase 2 (optional):** `restic copy` or rclone the same repo to B2/S3/another host when credentials exist. Do not block go-live on cloud storage.

## What is backed up

```
/opt/Astro-production/*/.env.prod
/opt/Astro-production/*/.env
/opt/Astro-production/*/.data
/etc/caddy
/etc/systemd/system/evolutionmiddleast.service
/etc/systemd/system/cbss.service
/etc/systemd/system/spheavyrental.service
/etc/systemd/system/iberiaworkforce.service
```

## Install (root only)

From this directory (or `/opt/Astro-production/deploy-host` after sync):

```bash
# 1) Packages
apt-get update && apt-get install -y restic

# 2) Password (generate once; store offline too)
install -d -m 700 /etc/restic /var/backups/astro-fleet /var/cache/restic/astro-fleet
openssl rand -base64 32 > /etc/restic/astro-fleet.password
chmod 600 /etc/restic/astro-fleet.password

# 3) Install script + units
install -m 755 restic-astro-fleet-backup.sh /usr/local/sbin/restic-astro-fleet-backup
install -m 644 restic-astro-fleet.service /etc/systemd/system/
install -m 644 restic-astro-fleet.timer /etc/systemd/system/

# 4) Init repo (once) + enable timer
export RESTIC_REPOSITORY=/var/backups/astro-fleet/restic
export RESTIC_PASSWORD_FILE=/etc/restic/astro-fleet.password
restic init
systemctl daemon-reload
systemctl enable --now restic-astro-fleet.timer

# 5) First run + smoke
systemctl start restic-astro-fleet.service
restic snapshots
# Restore drill (dry):
# restic restore latest --target /root/restore-drill-astro-fleet --include /opt/Astro-production
```

Keep a copy of `/etc/restic/astro-fleet.password` in the team password manager. Without it, backups are unrecoverable.

## Ops write-up

Also update `/root/ROOT-OPS-*.md` with: repo path, that password lives in `/etc/restic/` + vault, last successful `restic snapshots` date.
