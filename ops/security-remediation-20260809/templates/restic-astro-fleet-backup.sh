#!/usr/bin/env bash
# Reviewed H-07 candidate. Coverage comes from an owner-generated manifest of
# effective active systemd WorkingDirectories; a directory glob cannot silently
# omit an active service. Normal invocation backs up; --dry-run lists coverage.

set -euo pipefail
IFS=$'\n\t'
umask 0077

SITE_ROOT=${SITE_ROOT:-/opt/Astro-production}
ACTIVE_SITE_MANIFEST=${ACTIVE_SITE_MANIFEST:-}
EXPECTED_ACTIVE_SITES=${EXPECTED_ACTIVE_SITES:-29}
SYSTEMCTL=${ASTRO_SYSTEMCTL:-systemctl}
EXPECTED_SITE_MAP=${EXPECTED_SITE_MAP:-}
ALLOW_NONSTANDARD_SITE_MAP=${ALLOW_NONSTANDARD_SITE_MAP:-0}
RESTIC_PASSWORD_FILE=${RESTIC_PASSWORD_FILE:-/etc/restic/astro-fleet.password}
RESTIC_CACHE_DIR=${RESTIC_CACHE_DIR:-/var/cache/restic/astro-fleet}
TAG=astro-fleet
DRY_RUN=0
PRINT_EXPECTED=0

case "${1:-}" in
  --dry-run) DRY_RUN=1 ;;
  --print-expected-sites) PRINT_EXPECTED=1 ;;
  '') ;;
  *) printf 'Usage: %s [--dry-run|--print-expected-sites]\n' "$0" >&2; exit 64 ;;
esac

expected_site_rows() {
  if [[ "$ALLOW_NONSTANDARD_SITE_MAP" == 1 ]]; then
    [[ "$EXPECTED_ACTIVE_SITES" != 29 ]] || {
      printf 'Nonstandard site-map override is forbidden at the production count\n' >&2; return 1;
    }
    [[ -n "$EXPECTED_SITE_MAP" && -f "$EXPECTED_SITE_MAP" && ! -L "$EXPECTED_SITE_MAP" ]] || {
      printf 'Unsafe nonstandard expected-site map\n' >&2; return 1;
    }
    [[ "$(stat -Lc '%u:%g:%a:%h' -- "$EXPECTED_SITE_MAP")" == 0:0:600:1 ]] || {
      printf 'Nonstandard expected-site map must be root:root 0600 with one link\n' >&2; return 1;
    }
    cut -f1-3 -- "$EXPECTED_SITE_MAP" | LC_ALL=C sort
    return
  fi
  cat <<'SITES'
SITE	cbss.service	cbss.ae
SITE	connectfm.service	connectfm.ae
SITE	connectfreelance.service	connectfreelance.ae
SITE	connectfz.service	connectfz.com
SITE	connectgroup.service	connectgroup.co
SITE	connecthr.service	connecthr.ae
SITE	connectresources-sa.service	connectresources.sa
SITE	connectresources.service	connectresources.ae
SITE	connectresourcesint.service	connectresourcesint.com
SITE	connectstaff.service	connectstaff.ae
SITE	cuae.service	c-uae.com
SITE	emiratiguard.service	emiratiguard.com
SITE	emiratisationgate.service	emiratisationgate.org
SITE	emiratisationgateway.service	emiratisationgateway.com
SITE	eormiddleast.service	eormiddleast.com
SITE	evolutionmiddleast.service	evolutionmiddleast.com
SITE	freelancerdxb.service	freelancerdxb.com
SITE	iberiaeor.service	iberiaeor.com
SITE	iberiaworkforce.service	iberiaworkforce.com
SITE	kinzahr.service	kinzahr.com
SITE	kpmpro.service	kpmpro.ae
SITE	ngmanpower.service	ngmanpower.com
SITE	payrollmiddleast.service	payrollmiddleast.org
SITE	peomiddleeast.service	peomiddleeast.com
SITE	pittant.service	pittant.com
SITE	redo.service	redo.ae
SITE	royalvisa.service	royalvisa.ae
SITE	spheavyrental.service	spheavyrental.ae
SITE	thefreelancergate.service	thefreelancergate.com
SITES
}

if ((PRINT_EXPECTED == 1)); then
  expected_site_rows
  exit 0
fi

if [[ -z "${RESTIC_REPOSITORY:-}" ]]; then
  repositories=()
  [[ -f /var/backups/astro-fleet/config ]] && repositories+=(/var/backups/astro-fleet)
  [[ -f /var/backups/astro-fleet/restic/config ]] && repositories+=(/var/backups/astro-fleet/restic)
  if ((${#repositories[@]} == 1)); then
    RESTIC_REPOSITORY=${repositories[0]}
  elif ((DRY_RUN == 1)); then
    RESTIC_REPOSITORY=/var/backups/astro-fleet
  else
    printf 'Expected exactly one Restic repository config; found %s\n' "${#repositories[@]}" >&2
    exit 1
  fi
fi
export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE RESTIC_CACHE_DIR
[[ "$RESTIC_REPOSITORY" == /* && "$RESTIC_CACHE_DIR" == /* ]] || {
  printf 'Restic repository/cache paths must be absolute\n' >&2; exit 1;
}
CANON_RESTIC_REPOSITORY=$(realpath -m -- "$RESTIC_REPOSITORY")
CANON_RESTIC_CACHE=$(realpath -m -- "$RESTIC_CACHE_DIR")

[[ -d "$SITE_ROOT" && ! -L "$SITE_ROOT" ]] || { printf 'Missing/unsafe site root\n' >&2; exit 1; }
SITE_ROOT=$(realpath -e -- "$SITE_ROOT")
[[ "$EXPECTED_ACTIVE_SITES" =~ ^[1-9][0-9]*$ ]] || { printf 'Invalid expected active-site count\n' >&2; exit 1; }
GENERATED_MANIFEST=
cleanup() {
  [[ -z "$GENERATED_MANIFEST" ]] || rm -f -- "$GENERATED_MANIFEST"
}
trap cleanup EXIT HUP INT TERM

generate_active_manifest() {
  local destination=$1 units errors unit rest wd canonical name rc count
  units=$(mktemp /tmp/astro-restic-units.XXXXXX)
  errors=$(mktemp /tmp/astro-restic-systemctl.XXXXXX)
  chmod 0600 -- "$units" "$errors"
  if ! "$SYSTEMCTL" list-units --type=service --state=active --no-legend --no-pager --plain >"$units" 2>"$errors" || [[ -s "$errors" ]]; then
    rm -f -- "$units" "$errors"
    printf 'Cannot obtain complete active systemd inventory\n' >&2
    exit 1
  fi
  while IFS=' ' read -r unit rest; do
    [[ "$unit" == *.service ]] || continue
    : >"$errors"
    if ! wd=$("$SYSTEMCTL" show "$unit" --property=WorkingDirectory --value 2>"$errors") || [[ -s "$errors" ]]; then
      rm -f -- "$units" "$errors"
      printf 'Cannot inspect effective systemd WorkingDirectory\n' >&2
      exit 1
    fi
    [[ "$wd" == "$SITE_ROOT/"* ]] || continue
    canonical=$(realpath -m -- "$wd")
    [[ "$canonical" == "$wd" && -d "$wd" && ! -L "$wd" && "$(realpath -e -- "$wd")" == "$wd" ]] || {
      rm -f -- "$units" "$errors"; printf 'Unsafe active fleet WorkingDirectory\n' >&2; exit 1;
    }
    name=${wd#"$SITE_ROOT"/}
    [[ -n "$name" && "$name" != */* && "$name" =~ ^[A-Za-z0-9._-]+$ ]] || {
      rm -f -- "$units" "$errors"; printf 'Active WorkingDirectory is not an immediate fleet child\n' >&2; exit 1;
    }
    if "$SYSTEMCTL" is-active --quiet "$unit"; then :; else
      rc=$?; rm -f -- "$units" "$errors"; printf 'Active inventory changed (rc=%s)\n' "$rc" >&2; exit 1
    fi
    printf 'SITE\t%s\t%s\t%s\n' "$unit" "$name" "$wd" >>"$destination"
  done <"$units"
  rm -f -- "$units" "$errors"
  LC_ALL=C sort -o "$destination" "$destination"
  count=$(wc -l <"$destination")
  [[ "$count" == "$EXPECTED_ACTIVE_SITES" ]] || {
    printf 'Expected exactly %s active fleet sites; found %s\n' "$EXPECTED_ACTIVE_SITES" "$count" >&2
    exit 1
  }
  [[ -z "$(cut -f2 "$destination" | sort | uniq -d)" && \
     -z "$(cut -f3 "$destination" | sort | uniq -d)" && \
     -z "$(cut -f4 "$destination" | sort | uniq -d)" ]] || {
    printf 'Duplicate unit/site/path in active systemd inventory\n' >&2; exit 1;
  }
}

if [[ -z "$ACTIVE_SITE_MANIFEST" ]]; then
  [[ "$(id -u)" -eq 0 ]] || { printf 'Manifest auto-generation requires root\n' >&2; exit 1; }
  command -v "$SYSTEMCTL" >/dev/null 2>&1 || { printf 'systemctl is unavailable\n' >&2; exit 1; }
  GENERATED_MANIFEST=$(mktemp /tmp/astro-restic-active-sites.XXXXXX)
  chown 0:0 -- "$GENERATED_MANIFEST"
  chmod 0600 -- "$GENERATED_MANIFEST"
  generate_active_manifest "$GENERATED_MANIFEST"
  ACTIVE_SITE_MANIFEST=$GENERATED_MANIFEST
fi
[[ "$ACTIVE_SITE_MANIFEST" == /* ]] || { printf 'ACTIVE_SITE_MANIFEST must be absolute\n' >&2; exit 1; }
[[ -f "$ACTIVE_SITE_MANIFEST" && ! -L "$ACTIVE_SITE_MANIFEST" ]] || {
  printf 'Active-site manifest is missing or unsafe\n' >&2
  exit 1
}
[[ "$(stat -Lc '%u:%g:%a:%h' -- "$ACTIVE_SITE_MANIFEST")" == 0:0:600:1 ]] || {
  printf 'Active-site manifest must be root:root mode 0600 with one link\n' >&2
  exit 1
}
[[ "$(expected_site_rows | wc -l)" == "$EXPECTED_ACTIVE_SITES" ]] || {
  printf 'Reviewed expected-site map/count mismatch\n' >&2
  exit 1
}
cmp -s <(expected_site_rows) <(cut -f1-3 -- "$ACTIVE_SITE_MANIFEST" | LC_ALL=C sort) || {
  printf 'Effective active unit/site mapping differs from reviewed fleet map\n' >&2
  exit 1
}

paths=()
sites=()
seen_units=$'\n'
seen_sites=$'\n'
seen_paths=$'\n'

add_existing() {
  local candidate=$1
  [[ -e "$candidate" || -L "$candidate" ]] || return 0
  [[ ! -L "$candidate" && "$(realpath -e -- "$candidate")" == "$candidate" ]] || {
    printf 'Backup path is symlinked or noncanonical: %s\n' "$candidate" >&2
    exit 1
  }
  paths+=("$candidate")
}

safe_runtime_path() {
  local site_dir=$1 raw=$2 resolved site_name overlap_root path_scope
  [[ -n "$raw" ]] || return 1
  raw=${raw%$'\r'}
  if [[ "$raw" == \"*\" && "$raw" == *\" ]]; then
    raw=${raw:1:${#raw}-2}
  elif [[ "$raw" == \'*\' && "$raw" == *\' ]]; then
    raw=${raw:1:${#raw}-2}
  fi
  [[ -n "$raw" && "$raw" != *'$('* && "$raw" != *'`'* && "$raw" != *'${'* ]] || return 1
  if [[ "$raw" == /* ]]; then
    resolved=$(realpath -m -- "$raw")
  else
    resolved=$(realpath -m -- "$site_dir/$raw")
  fi
  # A runtime assignment is site-contained by default. The sole reviewed
  # external exception is CBSS data under /var/cbss; no other site may use it.
  site_name=$(basename -- "$site_dir")
  case "$resolved" in
    "$site_dir"/*) path_scope=site ;;
    /var/cbss|/var/cbss/*) [[ "$site_name" == cbss.ae ]] || return 1; path_scope=cbss ;;
    *) return 1 ;;
  esac

  # Never let a runtime assignment cause Restic to recursively ingest its own
  # repository/cache (or an ancestor containing either one).
  for overlap_root in "$CANON_RESTIC_REPOSITORY" "$CANON_RESTIC_CACHE"; do
    case "$resolved:$overlap_root" in
      "$overlap_root:$overlap_root"|"$overlap_root"/*:"$overlap_root"|"$resolved":"$resolved"/*) return 1 ;;
    esac
  done

  # These broad OS roots are never legitimate lead/admin/upload stores. The
  # production site subtree and exact CBSS exception are allowed. The explicit
  # root-private fixture gate permits its synthetic fleet below /tmp only.
  case "$resolved" in
    /|/boot|/boot/*|/dev|/dev/*|/etc|/etc/*|/home|/home/*|/proc|/proc/*|/root|/root/*|/run|/run/*|/sys|/sys/*|/tmp|/tmp/*|/usr|/usr/*|/var|/var/backups|/var/backups/*|/var/cache|/var/cache/*|/var/lib|/var/lib/*|/var/log|/var/log/*|/var/spool|/var/spool/*)
      if [[ "$path_scope" == site && "$SITE_ROOT" == /tmp/astro-restic-fixture.* && "$ALLOW_NONSTANDARD_SITE_MAP" == 1 ]]; then
        :
      else
        return 1
      fi
      ;;
  esac
  printf '%s\n' "$resolved"
}

while IFS=$'\t' read -r label unit name site_dir extra; do
  [[ -z "${extra:-}" ]] || { printf 'Malformed active-site manifest row\n' >&2; exit 1; }
  [[ "$label" == SITE && "$unit" =~ ^[A-Za-z0-9_.@-]+\.service$ ]] || {
    printf 'Malformed active-site manifest row\n' >&2; exit 1;
  }
  [[ "$name" =~ ^[A-Za-z0-9._-]+$ && "$name" != . && "$name" != .. ]] || {
    printf 'Unsafe site name in active-site manifest\n' >&2; exit 1;
  }
  [[ "$site_dir" == "$SITE_ROOT/$name" ]] || { printf 'Manifest site/path mismatch\n' >&2; exit 1; }
  [[ -d "$site_dir" && ! -L "$site_dir" && "$(realpath -e -- "$site_dir")" == "$site_dir" ]] || {
    printf 'Active site path is missing or unsafe: %s\n' "$name" >&2; exit 1;
  }
  [[ "$seen_units" != *$'\n'"$unit"$'\n'* ]] || { printf 'Duplicate active unit in manifest\n' >&2; exit 1; }
  [[ "$seen_sites" != *$'\n'"$name"$'\n'* ]] || { printf 'Duplicate active site in manifest\n' >&2; exit 1; }
  [[ "$seen_paths" != *$'\n'"$site_dir"$'\n'* ]] || { printf 'Duplicate active path in manifest\n' >&2; exit 1; }
  seen_units+="$unit"$'\n'
  seen_sites+="$name"$'\n'
  seen_paths+="$site_dir"$'\n'

  # An active WorkingDirectory is never omitted because a marker disappeared:
  # disappearance instead blocks the backup plan for owner investigation.
  for marker in "$site_dir/package.json" "$site_dir/.env.prod" "$site_dir/.env.production" "$site_dir/.env" "$site_dir/.data"; do
    if [[ -e "$marker" || -L "$marker" ]]; then
      [[ ! -L "$marker" && "$(realpath -e -- "$marker")" == "$marker" ]] || {
        printf 'Active site has an unsafe marker: %s\n' "$name" >&2; exit 1;
      }
    fi
  done
  if [[ ! -f "$site_dir/package.json" && ! -f "$site_dir/.env.prod" && \
        ! -f "$site_dir/.env.production" && ! -f "$site_dir/.env" && ! -d "$site_dir/.data" ]]; then
    printf 'Active site has no reviewed runtime marker: %s\n' "$name" >&2
    exit 1
  fi
  sites+=("$name"$'\t'"$site_dir")
  add_existing "$site_dir/.env.prod"
  add_existing "$site_dir/.env.production"
  add_existing "$site_dir/.env"
  add_existing "$site_dir/.data"

  for env_file in "$site_dir/.env.prod" "$site_dir/.env.production" "$site_dir/.env"; do
    [[ -r "$env_file" ]] || continue
    while IFS= read -r assignment; do
      raw=${assignment#*=}
      if resolved=$(safe_runtime_path "$site_dir" "$raw"); then
        add_existing "$resolved"
      else
        printf 'Rejected unsafe runtime path assignment in %s (value suppressed)\n' "$env_file" >&2
        exit 1
      fi
    done < <(grep -hE '^(LEAD_STORE_DIR|INTERNAL_ADMIN_DIR|INTERNAL_UPLOAD_DIR|INTERNAL_ENHANCED_LIVE_DIR)=' "$env_file" || true)
  done
done <"$ACTIVE_SITE_MANIFEST"

((${#sites[@]} == EXPECTED_ACTIVE_SITES)) || {
  printf 'Manifest site count differs from expected active count\n' >&2; exit 1;
}

add_existing /etc/caddy
add_existing /etc/sudoers.d/webdev
add_existing /usr/local/sbin/site-ctl
add_existing /usr/local/sbin/restic-astro-fleet-backup
add_existing /etc/systemd/system/restic-astro-fleet.service
add_existing /etc/systemd/system/restic-astro-fleet.timer

shopt -s nullglob
for unit_file in /etc/systemd/system/*.service; do
  if grep -qE '/opt/Astro-production/|/usr/local/sbin/site-ctl|astro-fleet' "$unit_file" 2>/dev/null; then
    add_existing "$unit_file"
  fi
done
shopt -u nullglob

mapfile -t paths < <(printf '%s\n' "${paths[@]}" | LC_ALL=C sort -u)
mapfile -t sites < <(printf '%s\n' "${sites[@]}" | LC_ALL=C sort -u)
((${#paths[@]} > 0)) || { printf 'No backup paths discovered\n' >&2; exit 1; }

printf 'SITES\t%s\n' "${#sites[@]}"
printf 'SITE\t%s\n' "${sites[@]}"
printf 'PATH\t%s\n' "${paths[@]}"

if ((DRY_RUN == 1)); then
  printf 'RESULT\tdry-run-ok\n'
  exit 0
fi

[[ "$(id -u)" -eq 0 ]] || { printf 'Scheduled backup must run as root\n' >&2; exit 1; }
command -v restic >/dev/null 2>&1 || { printf 'restic is not installed\n' >&2; exit 1; }
[[ -f "$RESTIC_PASSWORD_FILE" ]] || { printf 'Missing password file\n' >&2; exit 1; }
[[ -f "$RESTIC_REPOSITORY/config" ]] || { printf 'Invalid repository\n' >&2; exit 1; }

restic backup --tag "$TAG" --one-file-system "${paths[@]}"
restic forget --tag "$TAG" --keep-daily 14 --keep-weekly 8 --keep-monthly 6 --prune
restic check --read-data-subset=5%
printf 'RESULT\tbackup-ok\n'
