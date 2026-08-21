#!/usr/bin/env bash
# H-02: generate a per-site INTERNAL_JOB_SECRET staging plan without touching envs.

# An owner may invoke the pack from an xtrace-enabled recovery shell. Disable it
# before parsing inventory or reading/generating any secret-bearing material.
if [[ $- == *x* ]]; then
  set +x
fi
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=dry-run
FLEET_ROOT=/opt/Astro-production
OUTPUT_DIR=
SYSTEMCTL=${ASTRO_SYSTEMCTL:-systemctl}

usage() {
  cat <<'USAGE'
Usage: 02-stage-unique-internal-secrets.sh [options]

Default: report active systemd services/sites and secret key names that require
rotation. Values are never printed. Dormant directories and example envs are
never used as the rotation inventory.

Options:
  --apply                 Generate root-only per-site staging fragments.
  --root PATH             Fleet root (default: /opt/Astro-production).
  --output-dir PATH       Absolute staging directory, outside the fleet/repo.
  -h, --help              Show help.

Apply never creates, edits, appends to, or overwrites .env files. Re-running with
the same marked output directory keeps existing staged values and only fills
missing fragments. MANIFEST.tsv is atomically reconstructed from validated
fragments, repairing a crash between fragment creation and manifest publication.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --root)
      (($# >= 2)) || die "--root requires a path"
      FLEET_ROOT=$2
      shift
      ;;
    --output-dir)
      (($# >= 2)) || die "--output-dir requires a path"
      OUTPUT_DIR=$2
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

require_absolute_path "$FLEET_ROOT" "fleet root"
[[ -d "$FLEET_ROOT" && ! -L "$FLEET_ROOT" ]] || die "Fleet root not found or symlinked: $FLEET_ROOT"
FLEET_ROOT=$(realpath -e -- "$FLEET_ROOT")
require_command "$SYSTEMCTL"

declare -a SITES=()
declare -A ENV_FOR_SITE=()
declare -A UNIT_FOR_SITE=()
declare -A SITE_SELECTED=()
declare -A SECRET_PRESENT=()
declare -A IS_SITE_CMS_CONSUMER=()

if ! active_output=$(
  "$SYSTEMCTL" list-units --type=service --state=active --no-legend --no-pager 2>&1
); then
  blocked "Cannot obtain the active systemd service inventory; refusing directory/example discovery"
  printf '%s\n' "$active_output" | sed -n '1,8p' >&2
  exit 2
fi
mapfile -t ACTIVE_UNITS < <(printf '%s\n' "$active_output" | awk '$1 ~ /^[A-Za-z0-9_.@:-]+\.service$/ {print $1}' | sort -u)
((${#ACTIVE_UNITS[@]} > 0)) || die "No active systemd services were visible"

for unit in "${ACTIVE_UNITS[@]}"; do
  if ! site_dir=$("$SYSTEMCTL" show "$unit" --property=WorkingDirectory --value 2>/dev/null); then
    die "Cannot read effective WorkingDirectory for active unit: $unit"
  fi
  [[ "$site_dir" == "$FLEET_ROOT"/* ]] || continue
  [[ -d "$site_dir" && ! -L "$site_dir" ]] || die "Active unit has unsafe WorkingDirectory: $unit"
  [[ "$(realpath -e -- "$site_dir")" == "$site_dir" ]] || die "Active unit WorkingDirectory is noncanonical: $unit"
  [[ "$(dirname -- "$site_dir")" == "$FLEET_ROOT" ]] || die "Active site is not a direct fleet child: $unit"
  site=$(basename -- "$site_dir")
  [[ "$site" =~ ^[A-Za-z0-9._-]+$ ]] || die "Unsafe active site directory name: $site"

  is_consumer=0
  package_json=$site_dir/package.json
  if [[ -e "$package_json" || -L "$package_json" ]]; then
    [[ -f "$package_json" && ! -L "$package_json" ]] || die "Active package.json is unsafe: $site"
    [[ "$(realpath -e -- "$package_json")" == "$package_json" ]] || die "Active package.json is noncanonical: $site"
    if grep -qE '"@connect/site-cms"[[:space:]]*:' -- "$package_json"; then
      is_consumer=1
    fi
  fi

  if ! env_output=$("$SYSTEMCTL" show "$unit" --property=EnvironmentFiles --value 2>/dev/null); then
    die "Cannot read effective EnvironmentFiles for active unit: $unit"
  fi
  env_file=
  declare -a recognized_envs=() secret_envs=()
  while IFS= read -r candidate; do
    candidate=${candidate#-}
    [[ -n "$candidate" ]] || continue
    case "$candidate" in
      "$site_dir/.env.prod"|"$site_dir/.env.production"|"$site_dir/.env") ;;
      *) continue ;;
    esac
    [[ -f "$candidate" && ! -L "$candidate" ]] || die "Active env is not a regular non-symlink file: $candidate"
    [[ "$(realpath -e -- "$candidate")" == "$candidate" ]] || die "Active env is noncanonical: $candidate"
    recognized_envs+=("$candidate")
    if grep -qE '^[[:space:]]*INTERNAL_JOB_SECRET=' -- "$candidate"; then
      secret_envs+=("$candidate")
    fi
  done < <(
    printf '%s\n' "$env_output" \
      | sed -E 's/[[:space:]]+\(ignore_errors=(yes|no)\)/\n/g' \
      | sed -E 's/^[[:space:]]+|[[:space:]]+$//g; /^$/d'
  )
  if ((is_consumer == 1)); then
    ((${#recognized_envs[@]} == 1)) || die "Active @connect/site-cms consumer must have exactly one recognized active env: $unit"
    env_file=${recognized_envs[0]}
    IS_SITE_CMS_CONSUMER["$site"]=1
  else
    # Preserve rotation coverage for legacy non-package consumers only when one
    # exact active env already declares the key.
    ((${#secret_envs[@]} <= 1)) || die "Active unit has multiple secret-bearing env files: $unit"
    ((${#secret_envs[@]} == 1)) || continue
    env_file=${secret_envs[0]}
  fi
  assignment_count=$(grep -cE '^[[:space:]]*INTERNAL_JOB_SECRET=' -- "$env_file" || true)
  ((assignment_count <= 1)) || die "Active env has duplicate INTERNAL_JOB_SECRET assignments: $env_file"
  SECRET_PRESENT["$site"]=$assignment_count
  [[ -z "${SITE_SELECTED[$site]:-}" ]] || die "More than one active service maps to secret site $site"
  SITE_SELECTED["$site"]=1
  ENV_FOR_SITE["$site"]=$env_file
  UNIT_FOR_SITE["$site"]=$unit
done

mapfile -t SITES < <(printf '%s\n' "${!SITE_SELECTED[@]}" | sed '/^$/d' | sort)

((${#SITES[@]} > 0)) || die "No active site-cms/legacy INTERNAL_JOB_SECRET consumer was discovered"

info "Unique INTERNAL_JOB_SECRET rotation required for ${#SITES[@]} active site service(s):"
for site in "${SITES[@]}"; do
  if [[ "${SECRET_PRESENT[$site]}" == 1 ]]; then
    assignment_state=rotate-existing
  else
    assignment_state=add-missing
  fi
  printf '  %s (%s; %s)\n' "$site" "${UNIT_FOR_SITE[$site]}" "$assignment_state"
done

info "Third-party/provider-managed key names detected (values suppressed):"
provider_count=0
for site in "${SITES[@]}"; do
  env_file=${ENV_FOR_SITE[$site]}
  keys=$(sed -nE 's/^[[:space:]]*(PIPEDRIVE_API_TOKEN|GOOGLE_ADS_[A-Z0-9_]*|DASHBOARD_[A-Z0-9_]*SECRET|SESSION_[A-Z0-9_]*SECRET)=.*/\1/p' "$env_file" | sort -u || true)
  if [[ -n "$keys" ]]; then
    while IFS= read -r key; do
      printf '  %s: %s\n' "$site" "$key"
      provider_count=$((provider_count + 1))
    done <<<"$keys"
  fi
done
((provider_count > 0)) || printf '  none in the selected active env files\n'

if [[ "$MODE" == dry-run ]]; then
  info "Dry-run only. Use --apply --output-dir /root/<new-private-dir> to stage unique values."
  exit 0
fi

require_root
require_command openssl
require_command cmp
[[ -n "$OUTPUT_DIR" ]] || die "--output-dir is required with --apply"
require_absolute_path "$OUTPUT_DIR" "output directory"

canonical_root=$FLEET_ROOT
canonical_output=$(canonical_private_output_path "$OUTPUT_DIR")
repo_root=$(repo_root_from_script "$SCRIPT_DIR")
canonical_repo=$(realpath -m -- "$repo_root")
case "$canonical_output/" in
  "$canonical_root/"*|"$canonical_repo/"*)
    die "Secret staging must be outside the production tree and git worktree"
    ;;
esac

print_apply_banner "This generates new secret values in $canonical_output. It does not install or print them."
umask 077
marker=$canonical_output/.astro-secret-staging
canonical_output=$(prepare_marked_private_dir "$canonical_output" .astro-secret-staging)

manifest=$canonical_output/MANIFEST.tsv
declare -A prior_installed=()
if [[ -e "$manifest" || -L "$manifest" ]]; then
  [[ -f "$manifest" && ! -L "$manifest" ]] || die "Existing manifest is not a regular non-symlink file"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$manifest")" == 0:0:600:1 ]] || \
    die "Existing manifest must be root:root mode 0600 with one link"
  if [[ -s "$manifest" ]]; then
    IFS= read -r header <"$manifest" || true
    [[ "$header" == $'site\tfragment\tkey_name\tinstalled' ]] || die "Existing manifest header is invalid"
    while IFS=$'\t' read -r manifest_site manifest_fragment manifest_key manifest_state extra || [[ -n "$manifest_site" ]]; do
      [[ -n "$manifest_site" ]] || continue
      [[ -z "${extra:-}" && -n "${SITE_SELECTED[$manifest_site]:-}" ]] || die "Existing manifest has an invalid or inactive site row"
      [[ "$manifest_fragment" == "$canonical_output/$manifest_site.env.fragment" ]] || die "Existing manifest fragment path mismatch"
      [[ "$manifest_key" == INTERNAL_JOB_SECRET && "$manifest_state" =~ ^(YES|NO)$ ]] || die "Existing manifest row format is invalid"
      [[ -z "${prior_installed[$manifest_site]:-}" ]] || die "Existing manifest has a duplicate site row"
      prior_installed["$manifest_site"]=$manifest_state
    done < <(tail -n +2 -- "$manifest")
  fi
fi

# Refuse stale/foreign fragments rather than silently dropping them from the
# active-service manifest.
shopt -s nullglob dotglob
for fragment in "$canonical_output"/*.env.fragment; do
  fragment_site=$(basename -- "$fragment" .env.fragment)
  [[ -n "${SITE_SELECTED[$fragment_site]:-}" ]] || die "Staging directory contains a fragment for an inactive/unknown site"
done
shopt -u nullglob dotglob

validate_fragment_exact() {
  local fragment_path=$1 destination=$2 parsed
  [[ -f "$fragment_path" && ! -L "$fragment_path" ]] || die "Unsafe existing fragment: $fragment_path"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$fragment_path")" == 0:0:600:1 ]] || \
    die "Existing fragment must be root:root mode 0600 with one link: $fragment_path"
  parsed=$(sed -nE 's/^INTERNAL_JOB_SECRET=([0-9a-f]{64})$/\1/p' -- "$fragment_path")
  [[ "$parsed" =~ ^[0-9a-f]{64}$ ]] || \
    die "Existing fragment must contain exactly one valid INTERNAL_JOB_SECRET assignment"
  cmp -s -- "$fragment_path" <(printf 'INTERNAL_JOB_SECRET=%s\n' "$parsed") || \
    die "Existing fragment has extra/missing bytes or lines; refusing to use it"
  printf -v "$destination" '%s' "$parsed"
}

created=0
existing=0
declare -A SEEN_FRAGMENT_VALUES=()

# Validate every preserved fragment and cross-fragment uniqueness before
# creating the first missing value. Secret values remain only in memory.
for site in "${SITES[@]}"; do
  fragment=$canonical_output/$site.env.fragment
  [[ -e "$fragment" || -L "$fragment" ]] || continue
  validate_fragment_exact "$fragment" fragment_value
  [[ -z "${SEEN_FRAGMENT_VALUES[$fragment_value]+x}" ]] || \
    die "Two staged fragments contain the same secret; values suppressed"
  SEEN_FRAGMENT_VALUES["$fragment_value"]=$site
  unset fragment_value
  existing=$((existing + 1))
done

for site in "${SITES[@]}"; do
  fragment=$canonical_output/$site.env.fragment
  [[ ! -e "$fragment" && ! -L "$fragment" ]] || continue
  unique_secret=
  for _attempt in 1 2 3 4 5; do
    candidate_secret=$(openssl rand -hex 32)
    [[ "$candidate_secret" =~ ^[0-9a-f]{64}$ ]] || die "openssl returned an unexpected value"
    if [[ -z "${SEEN_FRAGMENT_VALUES[$candidate_secret]+x}" ]]; then
      unique_secret=$candidate_secret
      break
    fi
    unset candidate_secret
  done
  [[ "$unique_secret" =~ ^[0-9a-f]{64}$ ]] || die "Could not generate a unique staged secret"
  (set -o noclobber; printf 'INTERNAL_JOB_SECRET=%s\n' "$unique_secret" >"$fragment")
  chown 0:0 -- "$fragment"
  chmod 0600 -- "$fragment"
  # A newly generated value cannot already be live.  Never carry an old YES
  # status forward when its reviewed fragment disappeared and was replaced.
  prior_installed["$site"]=NO
  SEEN_FRAGMENT_VALUES["$unique_secret"]=$site
  unset candidate_secret unique_secret
  created=$((created + 1))
done

# Publish a complete deterministic manifest only after every fragment validates.
# Missing rows from an interrupted earlier run are repaired with installed=NO.
manifest_tmp=$(mktemp "$canonical_output/.MANIFEST.tsv.XXXXXX")
cleanup_manifest_tmp() { rm -f -- "$manifest_tmp"; }
trap cleanup_manifest_tmp EXIT HUP INT TERM
{
  printf 'site\tfragment\tkey_name\tinstalled\n'
  declare -A PUBLISHED_FRAGMENT_VALUES=()
  for site in "${SITES[@]}"; do
    fragment=$canonical_output/$site.env.fragment
    validate_fragment_exact "$fragment" publish_value
    [[ -z "${PUBLISHED_FRAGMENT_VALUES[$publish_value]+x}" ]] || \
      die "Staged fragment uniqueness changed before manifest publication; values suppressed"
    PUBLISHED_FRAGMENT_VALUES["$publish_value"]=$site
    unset publish_value
    printf '%s\t%s\tINTERNAL_JOB_SECRET\t%s\n' "$site" "$fragment" "${prior_installed[$site]:-NO}"
  done
} >"$manifest_tmp"
chown 0:0 -- "$manifest_tmp"
chmod 0600 "$manifest_tmp"
mv -T -- "$manifest_tmp" "$manifest"
trap - EXIT HUP INT TERM

owner_steps=$canonical_output/OWNER-NEXT-STEPS.txt
if [[ -e "$owner_steps" || -L "$owner_steps" ]]; then
  [[ -f "$owner_steps" && ! -L "$owner_steps" ]] || \
    die "Existing owner-next-steps artifact is not a regular non-symlink file"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$owner_steps")" == 0:0:600:1 ]] || \
    die "Existing owner-next-steps artifact must be root:root mode 0600 with one link"
else
  (set -o noclobber; cat >"$owner_steps" <<'STEPS'
These files contain real secrets. Do not copy this directory into git or tickets.

For one site at a time:
1. Back up the live env file into a root-only backup directory.
2. Put the generated INTERNAL_JOB_SECRET in the team password manager.
3. Replace the one existing key, or add exactly one assignment where MANIFEST
   inventory reported it missing, using an editor that does not create a
   world-readable swap/backup file.
4. Confirm owner/group and mode 0640 (or 0600 where the service runs as owner).
5. Restart only that site's service in a separately approved maintenance action.
6. Verify internal jobs/forms, then mark MANIFEST.tsv installed=YES.
7. Rotate provider-managed tokens in their provider consoles and revoke old values.

Rollback: restore that site's backed-up env and restart only that service.
After all sites and vault copies are verified, securely delete this staging tree.
STEPS
  )
  chown 0:0 -- "$owner_steps"
  chmod 0600 -- "$owner_steps"
fi

info "Secret staging ready: $canonical_output"
info "Created=$created preserved_existing=$existing; no live env file was changed."
