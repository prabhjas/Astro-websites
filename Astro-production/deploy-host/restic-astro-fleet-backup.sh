#!/usr/bin/env bash
# Daily restic backup for Connect Group Astro fleet.
# Repo: /var/backups/astro-fleet/restic
#
# IMPORTANT: Do NOT hardcode a site list. Discover every site under
# /opt/Astro-production so newly cut-over domains are backed up automatically.
# Also resolve LEAD_STORE_DIR / INTERNAL_*_DIR from each .env.prod (Evolution/CBSS
# keep live leads under /var/<site>, not only <site>/.data).
set -euo pipefail

export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-/var/backups/astro-fleet/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/etc/restic/astro-fleet.password}"
export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/var/cache/restic/astro-fleet}"

SITE_ROOT=/opt/Astro-production
TAG=astro-fleet
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

if [[ ! -f "$RESTIC_PASSWORD_FILE" ]]; then
  echo "Missing password file: $RESTIC_PASSWORD_FILE" >&2
  exit 1
fi
if [[ ! -d "$RESTIC_REPOSITORY" ]]; then
  echo "Missing restic repo dir: $RESTIC_REPOSITORY (run restic init first)" >&2
  exit 1
fi

paths=()
add() { [[ -e "$1" ]] && paths+=("$1") || true; }

# --- discover sites (no hardcoded four-site list) --------------------------
# Skip non-site dirs under SITE_ROOT.
is_skipped_dir() {
  case "$1" in
    deploy-host|_incoming|_archive|node_modules|.pnpm-store|packages|caddy|scripts|docs|local) return 0 ;;
    *) return 1 ;;
  esac
}

SITES=()
shopt -s nullglob
for dir in "$SITE_ROOT"/*/; do
  name=$(basename "$dir")
  is_skipped_dir "$name" && continue
  # Real fleet site: has package.json and/or runtime config / lead store
  if [[ -f "$dir/package.json" || -e "$dir/.env.prod" || -e "$dir/.env" || -d "$dir/.data" ]]; then
    SITES+=("$name")
  fi
done
shopt -u nullglob

if [[ ${#SITES[@]} -eq 0 ]]; then
  echo "No sites discovered under $SITE_ROOT" >&2
  exit 1
fi

echo "restic-astro-fleet: discovered ${#SITES[@]} site(s)"

# --- per-site config + the .data tree -------------------------------------
for site in "${SITES[@]}"; do
  for f in .env.prod .env .data; do
    add "$SITE_ROOT/$site/$f"
  done
done

# --- lead stores (resolve absolute dirs from .env.prod) -------------------
# Values are read with grep, never sourced: .env.prod is not executed.
for site in "${SITES[@]}"; do
  envf="$SITE_ROOT/$site/.env.prod"
  [[ -r "$envf" ]] || continue
  while IFS= read -r dir; do
    [[ -n "$dir" ]] || continue
    dir="${dir%\"}"; dir="${dir#\"}"; dir="${dir%\'}"; dir="${dir#\'}"
    [[ "$dir" = /* ]] || dir="$SITE_ROOT/$site/$dir"
    add "$dir"
  done < <(grep -hE '^(LEAD_STORE_DIR|INTERNAL_ADMIN_DIR|INTERNAL_UPLOAD_DIR|INTERNAL_ENHANCED_LIVE_DIR)=' "$envf" | cut -d= -f2- || true)
done

# --- host config ----------------------------------------------------------
add /etc/caddy
add /etc/sudoers.d/webdev
add /usr/local/sbin/site-ctl
add /usr/local/sbin/restic-astro-fleet-backup
add /etc/systemd/system/restic-astro-fleet.service
add /etc/systemd/system/restic-astro-fleet.timer

# Any systemd unit whose WorkingDirectory / EnvironmentFile points at the fleet
shopt -s nullglob
for unit in /etc/systemd/system/*.service; do
  if grep -qE '/opt/Astro-production/|/usr/local/sbin/site-ctl|astro-fleet' "$unit" 2>/dev/null; then
    add "$unit"
  fi
done
shopt -u nullglob

# NOTE: /etc/restic/astro-fleet.password is deliberately NOT backed up. Storing
# the repo password inside the repo it unlocks is useless for recovery — it
# belongs in the team password manager.

mapfile -t paths < <(printf '%s\n' "${paths[@]}" | sort -u)

if [[ ${#paths[@]} -eq 0 ]]; then
  echo "Nothing to back up" >&2
  exit 1
fi

echo "restic-astro-fleet: ${#paths[@]} path(s) to include"
if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '  %s\n' "${paths[@]}"
  echo "restic-astro-fleet dry-run OK $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  exit 0
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
echo "restic-astro-fleet backup OK $(date -u +%Y-%m-%dT%H:%M:%SZ) sites=${#SITES[@]} paths=${#paths[@]}"
