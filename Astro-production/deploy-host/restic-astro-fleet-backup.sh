#!/usr/bin/env bash
# Daily restic backup for Connect Group Astro fleet.
# Repo: /var/backups/astro-fleet/restic
set -euo pipefail

export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-/var/backups/astro-fleet/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/etc/restic/astro-fleet.password}"
export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/var/cache/restic/astro-fleet}"

SITE_ROOT=/opt/Astro-production
TAG=astro-fleet

if [[ ! -f "$RESTIC_PASSWORD_FILE" ]]; then
  echo "Missing password file: $RESTIC_PASSWORD_FILE" >&2
  exit 1
fi
if [[ ! -d "$RESTIC_REPOSITORY" ]]; then
  echo "Missing restic repo dir: $RESTIC_REPOSITORY (run restic init first)" >&2
  exit 1
fi

# Build include list — only paths that exist
paths=()
for site in evolutionmiddleast.com cbss.ae spheavyrental.ae iberiaworkforce.com; do
  for f in .env.prod .env .data; do
    p="$SITE_ROOT/$site/$f"
    [[ -e "$p" ]] && paths+=("$p")
  done
done

paths+=(/etc/caddy)
for unit in evolutionmiddleast cbss spheavyrental iberiaworkforce; do
  u="/etc/systemd/system/${unit}.service"
  [[ -e "$u" ]] && paths+=("$u")
done

if [[ ${#paths[@]} -eq 0 ]]; then
  echo "Nothing to back up" >&2
  exit 1
fi

restic backup \
  --tag "$TAG" \
  --one-file-system \
  "${paths[@]}"

# Keep last 14 dailies, 8 weeklies, 6 monthlies
restic forget \
  --tag "$TAG" \
  --keep-daily 14 \
  --keep-weekly 8 \
  --keep-monthly 6 \
  --prune

restic check --read-data-subset=5%
echo "restic-astro-fleet backup OK $(date -u +%Y-%m-%dT%H:%M:%SZ)"
