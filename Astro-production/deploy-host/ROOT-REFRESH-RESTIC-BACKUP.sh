#!/usr/bin/env bash
# Root-only: refresh the Astro fleet restic backup script so ALL sites under
# /opt/Astro-production are discovered (not a hardcoded four-site list).
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_SRC="$SRC_DIR/restic-astro-fleet-backup.sh"

if [[ ! -f "$SCRIPT_SRC" ]]; then
  echo "Missing $SCRIPT_SRC" >&2
  exit 1
fi

install -m 755 "$SCRIPT_SRC" /usr/local/sbin/restic-astro-fleet-backup
install -m 644 "$SRC_DIR/restic-astro-fleet.service" /etc/systemd/system/
install -m 644 "$SRC_DIR/restic-astro-fleet.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable restic-astro-fleet.timer

echo "=== dry-run (must include every live site with leads) ==="
/usr/local/sbin/restic-astro-fleet-backup --dry-run | tee /tmp/restic-astro-fleet-dry-run.txt

echo "=== starting backup now ==="
systemctl start restic-astro-fleet.service
systemctl status restic-astro-fleet.service --no-pager || true
journalctl -u restic-astro-fleet.service -n 50 --no-pager

echo "ROOT-REFRESH-RESTIC-BACKUP done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
