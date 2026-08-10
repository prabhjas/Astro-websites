#!/usr/bin/env bash
# H-02/H-03: exact-target secret ownership and durable lead-PII permissions.
# Values are never printed, sourced, evaluated, copied, or placed in rollback data.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=dry-run
APPLY_SCOPE=both
FLEET_ROOT=/opt/Astro-production
SYSTEMD_DIR=/etc/systemd/system
BACKUP_DIR=
SYSTEMCTL=${ASTRO_SYSTEMCTL:-systemctl}
CONFIRM_H03_WRITERS_STOPPED=0
CONFIRM_DEVELOPER_WRITE_EXCLUSION=0

# Immutable finding manifests. Do not replace these with globs or discovery.
readonly -a H02_RELATIVE_PATHS=(
  'spheavyrental.ae/.env'
  'connectfreelance.ae/.env.env.bak-20260807-185316'
  'emiratiguard.com/.env.env.bak-20260807-185316'
  'emiratisationgate.org/.env.env.bak-20260807-185316'
  'emiratisationgateway.com/.env.env.bak-20260807-185316'
  'kpmpro.ae/.env.env.bak-20260807-185316'
  'ngmanpower.com/.env.env.bak-20260807-185316'
  'peomiddleast.com/.env.env.bak-20260807-185316'
  'thefreelancergate.com/.env.env.bak-20260807-185316'
)

readonly -a H03_SITE_NAMES=(
  connectfm.ae
  connectfreelance.ae
  connectfz.com
  connecthr.ae
  connectresources.ae
  connectresources.sa
  emiratisationgate.org
  emiratisationgateway.com
  freelancerdxb.com
  iberiaeor.com
  kpmpro.ae
  ngmanpower.com
  payrollmiddleast.org
  peomiddleast.com
  pittant.com
  redo.ae
  royalvisa.ae
)

usage() {
  cat <<'USAGE'
Usage: 01-sensitive-modes-and-lead-pii.sh [options]

Default: read-only audit.

Options:
  --apply                 Apply exact H-02/H-03 changes after all preflights.
  --h03-only              With --apply, change/back up only H-03 lead trees.
  --root PATH             Fleet root (default: /opt/Astro-production).
  --systemd-dir PATH      Unit directory (default: /etc/systemd/system).
  --backup-dir PATH       New root-only rollback directory.
  --confirm-h03-writers-stopped
                           Attest a maintenance window; apply also verifies all
                           17 effective units are loaded but inactive.
  --confirm-developer-write-exclusion
                           Attest developer sessions/processes/write access and
                           open writable descriptors have been excluded.
  -h, --help              Show help.

H-02 is limited to the nine fixed report paths above. Apply verifies literal
systemd EnvironmentFile= lines, regular-file type, canonical parents, inode and
content hash; temporarily removes write permission from all nine site parents;
revalidates after the lock; then sets the files root:root 0600. An EXIT trap
restores every parent mode. The generated H-02 rollback uses the same lock and
inode/no-symlink checks. Run this phase only after developer write exclusion or
M-06 revocation so an already-open writable file descriptor cannot race it.

H-03 is limited to the 17 fixed report sites. Configured lead paths are parsed
without sourcing env files, canonicalized, containment-checked, and rejected if
any path component is a symlink. Existing directories/files become 0750/0640
when the site service owns them, or 0770/0660 for a verified group-write layout.
Default ACLs are installed on every existing lead directory so future Node
mkdir/writeFile/appendFile objects inherit the same effective modes immediately,
without a restart. The branch code also explicitly requests 0750/0640 once its
separate application rollout is deployed. Recursive getfacl backups provide ACL,
mode, owner, and group rollback for every pre-existing object.

Use --apply --h03-only when H-03 may proceed but H-02 is deferred until all
developer sessions/write access and potentially open writable descriptors have
been excluded. That mode creates only H-03 ACL backups/rollback material and
does not lock, chown, chmod, or write rollback metadata for any H-02 file.

Every apply requires both writer-exclusion confirmations and verifies all 17
site units are loaded but inactive. The script never stops/starts/restarts them.
This closes path-based TOCTOU for chmod/setfacl/getfacl; do not use apply if any
other writer remains. Regular-file hardlinks and nested mounts are rejected.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --h03-only) APPLY_SCOPE=h03 ;;
    --root)
      (($# >= 2)) || die "--root requires a path"
      FLEET_ROOT=$2
      shift
      ;;
    --systemd-dir)
      (($# >= 2)) || die "--systemd-dir requires a path"
      SYSTEMD_DIR=$2
      shift
      ;;
    --backup-dir)
      (($# >= 2)) || die "--backup-dir requires a path"
      BACKUP_DIR=$2
      shift
      ;;
    --confirm-h03-writers-stopped) CONFIRM_H03_WRITERS_STOPPED=1 ;;
    --confirm-developer-write-exclusion) CONFIRM_DEVELOPER_WRITE_EXCLUSION=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

[[ "$APPLY_SCOPE" == both || "$MODE" == apply ]] || die "--h03-only requires --apply"

FLEET_ROOT=${FLEET_ROOT%/}
SYSTEMD_DIR=${SYSTEMD_DIR%/}
require_absolute_path "$FLEET_ROOT" "fleet root"
require_absolute_path "$SYSTEMD_DIR" "systemd directory"
[[ -d "$FLEET_ROOT" && ! -L "$FLEET_ROOT" ]] || die "Fleet root must be a real directory: $FLEET_ROOT"
[[ -d "$SYSTEMD_DIR" && ! -L "$SYSTEMD_DIR" ]] || die "Systemd directory must be a real directory: $SYSTEMD_DIR"

path_has_symlink_component() {
  local path=$1
  local cursor= part
  local -a components=()
  [[ "$path" == /* ]] || return 0
  IFS='/' read -r -a components <<<"${path#/}"
  for part in "${components[@]}"; do
    [[ -n "$part" && "$part" != . ]] || continue
    cursor=$cursor/$part
    [[ ! -L "$cursor" ]] || return 0
  done
  return 1
}

is_strictly_within() {
  local path=$1
  local root=$2
  [[ "$path" == "$root"/* && "$path" != "$root" ]]
}

mode_has_group_or_other_write() {
  local mode=$1
  (( (8#$mode & 0022) != 0 ))
}

if path_has_symlink_component "$FLEET_ROOT"; then
  die "Fleet root contains an intermediate symlink: $FLEET_ROOT"
fi
if path_has_symlink_component "$SYSTEMD_DIR"; then
  die "Systemd directory contains an intermediate symlink: $SYSTEMD_DIR"
fi
CANON_FLEET=$(realpath -e -- "$FLEET_ROOT")
CANON_SYSTEMD=$(realpath -e -- "$SYSTEMD_DIR")
[[ "$CANON_FLEET" == "$FLEET_ROOT" ]] || die "Fleet root is not canonical: $FLEET_ROOT"
[[ "$CANON_SYSTEMD" == "$SYSTEMD_DIR" ]] || die "Systemd directory is not canonical: $SYSTEMD_DIR"

if [[ "$MODE" == apply ]]; then
  require_root
  require_command getfacl
  require_command setfacl
  require_command findmnt
  require_command "$SYSTEMCTL"
  [[ "$APPLY_SCOPE" != both ]] || require_command sha256sum
  [[ "$(file_uid "$CANON_FLEET")" == 0 ]] || die "Fleet root must be root-owned before H-02 apply"
  fleet_mode=$(file_mode "$CANON_FLEET")
  mode_has_group_or_other_write "$fleet_mode" && die "Fleet root must not be group/other-writable"
  if [[ -z "$BACKUP_DIR" ]]; then
    BACKUP_DIR=$(default_backup_dir "modes-acls")
  fi
  BACKUP_DIR=$(canonical_private_output_path "$BACKUP_DIR")
  [[ ! -e "$BACKUP_DIR" && ! -L "$BACKUP_DIR" ]] || die "Rollback directory must be new"
  case "$BACKUP_DIR/" in
    "$CANON_FLEET/"*) die "Rollback directory must be outside the production fleet and every lead tree" ;;
  esac
  ((CONFIRM_H03_WRITERS_STOPPED == 1)) || die "Missing --confirm-h03-writers-stopped"
  ((CONFIRM_DEVELOPER_WRITE_EXCLUSION == 1)) || die "Missing --confirm-developer-write-exclusion"
  if [[ "$APPLY_SCOPE" == h03 ]]; then
    print_apply_banner "H-03 ONLY: exact 17-site lead mode/default-ACL changes will be applied. The secret-file phase is neither read nor changed. No service is restarted."
  else
    print_apply_banner "Exact nine-file H-02 metadata and 17-site H-03 mode/default-ACL changes will be applied. No service is restarted."
  fi
else
  command -v getfacl >/dev/null 2>&1 || warn "getfacl is required for apply/rollback"
  command -v setfacl >/dev/null 2>&1 || warn "setfacl is required for durable future-object permissions"
fi

declare -A SITE_UNIT=()
declare -A SITE_USER=()
declare -A SITE_GROUP=()
declare -A SITE_ENV=()
declare -A LEAD_SITE=()
declare -A LEAD_IDENTITY=()
declare -A LEAD_DIR_MODE=()
declare -A LEAD_FILE_MODE=()
declare -A LEAD_DIR_ACL=()
declare -A LEAD_FILE_ACL=()
declare -A LEAD_DEFAULT_ACL=()

declare -a H02_PATHS=()
declare -A H02_IDENTITY=()
declare -A H02_HASH=()
declare -A H02_OLD_UID=()
declare -A H02_OLD_GID=()
declare -A H02_OLD_MODE=()
declare -A H02_PARENT=()
declare -A H02_PARENT_IDENTITY=()
declare -A H02_PARENT_MODE=()
declare -A H02_PARENT_UID=()
declare -A H02_PARENT_GID=()
declare -a H02_PARENTS=()

ISSUES=0
SKIPPED=0
CHANGED=0

issue() {
  blocked "$*"
  ISSUES=$((ISSUES + 1))
}

find_service_identity() {
  local site_dir=$1
  local unit_file= user= group= raw_env= exact_env=
  local -a candidates=()

  while IFS= read -r -d '' unit_file; do
    candidates+=("$unit_file")
  done < <(grep -lFZ -- "WorkingDirectory=$site_dir" "$CANON_SYSTEMD"/*.service 2>/dev/null || true)

  if ((${#candidates[@]} != 1)); then
    issue "Expected one exact WorkingDirectory unit for $site_dir; found ${#candidates[@]}"
    return 1
  fi
  unit_file=${candidates[0]}
  [[ -f "$unit_file" && ! -L "$unit_file" ]] || {
    issue "Unit must be a regular non-symlink file: $unit_file"
    return 1
  }
  user=$(sed -n 's/^User=//p' "$unit_file" | head -n1)
  group=$(sed -n 's/^Group=//p' "$unit_file" | head -n1)
  if [[ -z "$user" ]] || ! getent passwd "$user" >/dev/null 2>&1; then
    issue "Unit has no resolvable User= for $site_dir"
    return 1
  fi
  [[ -n "$group" ]] || group=$(id -gn "$user")
  getent group "$group" >/dev/null 2>&1 || {
    issue "Unit has no resolvable Group= for $site_dir"
    return 1
  }

  while IFS= read -r raw_env; do
    raw_env=${raw_env#-}
    case "$raw_env" in
      "$site_dir/.env.prod"|"$site_dir/.env.production"|"$site_dir/.env")
        if [[ -n "$exact_env" && "$exact_env" != "$raw_env" ]]; then
          issue "Unit has multiple site EnvironmentFile= paths: $unit_file"
          return 1
        fi
        exact_env=$raw_env
        ;;
    esac
  done < <(sed -n 's/^EnvironmentFile=//p' "$unit_file")
  if [[ -z "$exact_env" || ! -f "$exact_env" || -L "$exact_env" ]]; then
    issue "Unit lacks one exact regular site EnvironmentFile=: $unit_file"
    return 1
  fi

  SITE_UNIT["$site_dir"]=$unit_file
  SITE_USER["$site_dir"]=$user
  SITE_GROUP["$site_dir"]=$group
  SITE_ENV["$site_dir"]=$exact_env
}

service_relation() {
  local site_dir=$1
  local path=$2
  local user=${SITE_USER[$site_dir]:-}
  local path_uid path_gid user_uid gid
  local -a gids=()

  [[ -n "$user" && -e "$path" && ! -L "$path" ]] || { printf 'unknown\n'; return; }
  [[ "$user" == root ]] && { printf 'root\n'; return; }
  path_uid=$(file_uid "$path")
  path_gid=$(file_gid "$path")
  user_uid=$(id -u "$user")
  if [[ "$path_uid" == "$user_uid" ]]; then
    printf 'owner\n'
    return
  fi
  IFS=' ' read -r -a gids <<<"$(id -G "$user")"
  for gid in "${gids[@]}"; do
    if [[ "$path_gid" == "$gid" ]]; then
      printf 'group\n'
      return
    fi
  done
  printf 'unknown\n'
}

is_any_unit_environment_file() {
  local path=$1
  local unit
  shopt -s nullglob
  for unit in "$CANON_SYSTEMD"/*.service; do
    if grep -Fqx -- "EnvironmentFile=$path" "$unit" || grep -Fqx -- "EnvironmentFile=-$path" "$unit"; then
      shopt -u nullglob
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

validate_h02_path() {
  local path=$1
  local expected_identity=${2:-}
  local canonical parent canonical_parent identity

  if path_has_symlink_component "$path"; then
    issue "H-02 path contains a symlink component: $path"
    return 1
  fi
  if [[ ! -f "$path" || -L "$path" ]]; then
    issue "H-02 target is not a regular non-symlink file: $path"
    return 1
  fi
  canonical=$(realpath -e -- "$path")
  [[ "$canonical" == "$path" ]] || {
    issue "H-02 target is not canonical: $path"
    return 1
  }
  parent=$(dirname "$path")
  canonical_parent=$(realpath -e -- "$parent")
  if [[ "$canonical_parent" != "$parent" || ! -d "$parent" || -L "$parent" || "$(dirname "$parent")" != "$CANON_FLEET" ]]; then
    issue "H-02 parent is not a canonical direct fleet child: $parent"
    return 1
  fi
  if is_any_unit_environment_file "$path"; then
    issue "Confirmed H-02 backup/ad-hoc path is unexpectedly an active EnvironmentFile=: $path"
    return 1
  fi
  if ! grep -qE '^[[:space:]]*(INTERNAL_JOB_SECRET|PIPEDRIVE_API_TOKEN)=' -- "$path"; then
    issue "Confirmed H-02 path no longer has an expected sensitive key name: $path"
    return 1
  fi
  identity=$(stat -c '%d:%i' -- "$path")
  if [[ -n "$expected_identity" && "$identity" != "$expected_identity" ]]; then
    issue "H-02 inode changed during protected operation: $path"
    return 1
  fi
}

add_lead_dir() {
  local site_dir=$1
  local raw=$2
  local source_kind=$3
  local lexical canonical canonical_site canonical_var

  [[ -n "$raw" ]] || return 0
  if [[ "$raw" == /* ]]; then
    lexical=${raw%/}
  else
    lexical=${site_dir}/${raw%/}
  fi
  if path_has_symlink_component "$lexical"; then
    issue "Rejected H-03 path with an intermediate symlink for $site_dir"
    return 1
  fi
  canonical=$(realpath -m -- "$lexical")
  canonical_site=$(realpath -e -- "$site_dir")
  canonical_var=$(realpath -e -- /var)
  if [[ "$source_kind" == site ]]; then
    is_strictly_within "$canonical" "$canonical_site" || {
      issue "Rejected H-03 path escaping its site root for $site_dir"
      return 1
    }
  else
    if ! is_strictly_within "$canonical" "$canonical_site" && ! is_strictly_within "$canonical" "$canonical_var"; then
      issue "Rejected absolute H-03 path outside approved containment for $site_dir"
      return 1
    fi
  fi
  case "$canonical" in
    "$canonical_site"|/var|/var/www|/var/lib|/var/log|/var/backups)
      issue "Rejected dangerously broad H-03 path for $site_dir"
      return 1
      ;;
  esac
  if [[ ! -d "$canonical" || -L "$canonical" ]]; then
    issue "Expected H-03 lead directory is absent or not a real directory for $site_dir"
    return 1
  fi
  [[ "$(realpath -e -- "$canonical")" == "$canonical" ]] || {
    issue "H-03 lead directory is not canonical for $site_dir"
    return 1
  }
  LEAD_SITE["$canonical"]=$site_dir
  LEAD_IDENTITY["$canonical"]=$(stat -c '%d:%i' -- "$canonical")
}

if [[ "$MODE" == dry-run || "$APPLY_SCOPE" == both ]]; then
  info "Preflighting immutable nine-path H-02 manifest"
  declare -A parent_seen=()
  for relative in "${H02_RELATIVE_PATHS[@]}"; do
    path=$CANON_FLEET/$relative
    if validate_h02_path "$path"; then
      parent=$(dirname "$path")
      H02_PATHS+=("$path")
      H02_IDENTITY["$path"]=$(stat -c '%d:%i' -- "$path")
      H02_HASH["$path"]=$(sha256sum "$path" | awk '{print $1}')
      H02_OLD_UID["$path"]=$(file_uid "$path")
      H02_OLD_GID["$path"]=$(file_gid "$path")
      H02_OLD_MODE["$path"]=$(file_mode "$path")
      H02_PARENT["$path"]=$parent
      H02_PARENT_IDENTITY["$parent"]=$(stat -c '%d:%i' -- "$parent")
      H02_PARENT_MODE["$parent"]=$(file_mode "$parent")
      H02_PARENT_UID["$parent"]=$(file_uid "$parent")
      H02_PARENT_GID["$parent"]=$(file_gid "$parent")
      if [[ -z "${parent_seen[$parent]:-}" ]]; then
        H02_PARENTS+=("$parent")
        parent_seen["$parent"]=1
      fi
      printf 'H-02 %s uid=%s gid=%s mode=%s -> root:root 600\n' \
        "$path" "${H02_OLD_UID[$path]}" "${H02_OLD_GID[$path]}" "${H02_OLD_MODE[$path]}"
    fi
  done
  if ((${#H02_PATHS[@]} != 9 || ${#H02_PARENTS[@]} != 9)); then
    issue "Immutable H-02 manifest did not resolve to exactly nine files and nine parents"
  fi
fi

info "Discovering exact 17-site H-03 service identities and canonical lead roots"
for site_name in "${H03_SITE_NAMES[@]}"; do
  site_dir=$CANON_FLEET/$site_name
  if path_has_symlink_component "$site_dir" || [[ ! -d "$site_dir" || -L "$site_dir" ]] || [[ "$(realpath -e -- "$site_dir" 2>/dev/null || true)" != "$site_dir" ]]; then
    issue "H-03 site directory is absent, non-canonical, or symlinked: $site_dir"
    continue
  fi
  find_service_identity "$site_dir" || continue
  active_env=${SITE_ENV[$site_dir]}
  env_relation=$(service_relation "$site_dir" "$active_env")
  if [[ ! "$env_relation" =~ ^(owner|group|root)$ ]]; then
    issue "Site service cannot read its exact EnvironmentFile=: $active_env"
    continue
  fi

  add_lead_dir "$site_dir" "$site_dir/.data/leads" site || true
  lead_value=$(safe_env_value "$active_env" LEAD_STORE_DIR || true)
  if [[ -n "$lead_value" ]]; then
    if [[ "$lead_value" == /* ]]; then
      add_lead_dir "$site_dir" "$lead_value" absolute || true
    else
      add_lead_dir "$site_dir" "$lead_value" site || true
    fi
  fi
done

mapfile -t LEAD_PATHS < <(printf '%s\n' "${!LEAD_SITE[@]}" | sed '/^$/d' | sort)
if ((${#LEAD_PATHS[@]} != 17)); then
  issue "H-03 manifest resolved to ${#LEAD_PATHS[@]} unique lead roots, expected exactly 17"
fi

declare -a MOUNT_TARGETS=()
if command -v findmnt >/dev/null 2>&1; then
  mapfile -t MOUNT_TARGETS < <(findmnt -rn -o TARGET 2>/dev/null || true)
elif [[ "$MODE" == apply ]]; then
  issue "findmnt is required to reject nested mounts during apply"
else
  warn "findmnt unavailable; nested-mount audit is incomplete"
fi

for lead_dir in "${LEAD_PATHS[@]}"; do
  ownership_bad=0
  site_dir=${LEAD_SITE[$lead_dir]}
  if [[ "$(stat -c '%d:%i' -- "$lead_dir")" != "${LEAD_IDENTITY[$lead_dir]}" ]]; then
    issue "H-03 lead-root inode changed during discovery: $lead_dir"
    continue
  fi
  if find -P "$lead_dir" -xdev -type l -print -quit | grep -q .; then
    issue "H-03 tree contains a symlink and requires manual review: $lead_dir"
    continue
  fi
  for mount_target in "${MOUNT_TARGETS[@]}"; do
    case "$mount_target" in
      "$lead_dir"/*)
        issue "H-03 tree contains a nested mount and requires manual review: $lead_dir"
        ownership_bad=1
        break
        ;;
    esac
  done
  [[ "${ownership_bad:-0}" == 0 ]] || continue
  relation=$(service_relation "$site_dir" "$lead_dir")
  case "$relation" in
    owner|root)
      LEAD_DIR_MODE["$lead_dir"]=750
      LEAD_FILE_MODE["$lead_dir"]=640
      LEAD_DIR_ACL["$lead_dir"]='u::rwx,g::r-x,o::---'
      LEAD_FILE_ACL["$lead_dir"]='u::rw-,g::r--,o::---'
      LEAD_DEFAULT_ACL["$lead_dir"]='u::rwx,g::r-x,o::---'
      accepted_relations='owner root'
      ;;
    group)
      LEAD_DIR_MODE["$lead_dir"]=770
      LEAD_FILE_MODE["$lead_dir"]=660
      LEAD_DIR_ACL["$lead_dir"]='u::rwx,g::rwx,o::---'
      LEAD_FILE_ACL["$lead_dir"]='u::rw-,g::rw-,o::---'
      LEAD_DEFAULT_ACL["$lead_dir"]='u::rwx,g::rwx,o::---'
      accepted_relations='owner group'
      ;;
    *)
      issue "Cannot prove write-safe service ownership for H-03 tree: $lead_dir"
      continue
      ;;
  esac

  object_count=0
  lead_device=$(stat -Lc '%d' -- "$lead_dir")
  while IFS= read -r -d '' object; do
    object_count=$((object_count + 1))
    if [[ "$object" == *$'\t'* || "$object" == *$'\n'* ]]; then
      issue "H-03 object path contains a tab/newline and is not manifest-safe"
      ownership_bad=1
      break
    fi
    if [[ "$(stat -Lc '%d' -- "$object")" != "$lead_device" ]]; then
      issue "H-03 object crosses a filesystem/mount boundary: $object"
      ownership_bad=1
      break
    fi
    if [[ -f "$object" && "$(stat -Lc '%h' -- "$object")" != 1 ]]; then
      issue "H-03 regular file has hardlinks and could affect out-of-tree metadata: $object"
      ownership_bad=1
      break
    fi
    object_relation=$(service_relation "$site_dir" "$object")
    case " $accepted_relations " in
      *" $object_relation "*) ;;
      *)
        issue "H-03 object ownership does not match its service layout: $object"
        ownership_bad=1
        break
        ;;
    esac
  done < <(find -P "$lead_dir" -xdev \( -type d -o -type f \) -print0)
  ((ownership_bad == 0)) || continue
  printf 'H-03 %s objects=%s -> dirs %s files %s + inherited default ACL\n' \
    "$lead_dir" "$object_count" "${LEAD_DIR_MODE[$lead_dir]}" "${LEAD_FILE_MODE[$lead_dir]}"
done

if [[ "$MODE" == apply ]]; then
  info "Verifying all 17 H-03 units are loaded but inactive; this script does not stop them"
  for site_name in "${H03_SITE_NAMES[@]}"; do
    site_dir=$CANON_FLEET/$site_name
    unit_file=${SITE_UNIT[$site_dir]:-}
    [[ -n "$unit_file" ]] || { issue "No validated unit is available for inactive-state verification: $site_name"; continue; }
    unit_name=$(basename -- "$unit_file")
    if ! load_state=$("$SYSTEMCTL" show "$unit_name" --property=LoadState --value 2>/dev/null); then
      issue "Cannot inspect effective LoadState for $unit_name"
      continue
    fi
    [[ "$load_state" == loaded ]] || { issue "$unit_name is not loaded (LoadState=$load_state)"; continue; }
    active_rc=0
    "$SYSTEMCTL" is-active --quiet "$unit_name" || active_rc=$?
    if ((active_rc == 0)); then
      issue "$unit_name is still active; stop it in the separately approved maintenance phase"
    elif ((active_rc != 3)); then
      issue "Cannot prove $unit_name is inactive (systemctl rc=$active_rc)"
    fi
  done
fi

if ((ISSUES > 0 || SKIPPED > 0)); then
  blocked "Preflight failed: issues=$ISSUES skipped=$SKIPPED. No state was changed."
  exit 2
fi

if [[ "$MODE" == dry-run ]]; then
  info "Dry-run PASS: exact H-02 files=${#H02_PATHS[@]} H-03 roots=${#LEAD_PATHS[@]}."
  info "Apply will back up recursive ACL/owner/mode state, lock H-02 parents, and install restart-free default ACLs."
  exit 0
fi

# From here onward apply has passed every read-only preflight.
BACKUP_DIR=$(prepare_marked_private_dir "$BACKUP_DIR" .astro-modes-acls-backup)
install -d -o 0 -g 0 -m 0700 -- "$BACKUP_DIR/acls"
H02_MANIFEST=$BACKUP_DIR/h02-metadata.tsv
ROLLBACK_H02=$BACKUP_DIR/rollback-h02.sh
ROLLBACK_ALL=$BACKUP_DIR/rollback-modes-and-acls.sh
H03_IDENTITY_MANIFEST=$BACKUP_DIR/h03-identities.tsv
H03_ACL_MANIFEST=$BACKUP_DIR/h03-acl-files.tsv

if [[ "$APPLY_SCOPE" == both ]]; then
  for path in "${H02_PATHS[@]}"; do
    parent=${H02_PARENT[$path]}
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$path" "${H02_IDENTITY[$path]}" "${H02_OLD_UID[$path]}" \
      "${H02_OLD_GID[$path]}" "${H02_OLD_MODE[$path]}" "$parent" \
      "${H02_PARENT_IDENTITY[$parent]}" >>"$H02_MANIFEST"
  done
  chmod 0600 "$H02_MANIFEST"

  cat >"$ROLLBACK_H02" <<'ROLLBACK_HEAD'
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
confirm_developer=0
while (($#)); do
  case "$1" in
    --confirm-developer-write-exclusion) confirm_developer=1 ;;
    *) echo "Unknown H-02 rollback argument: $1" >&2; exit 64 ;;
  esac
  shift
done
[[ "$(id -u)" -eq 0 ]] || { echo "Run as root" >&2; exit 1; }
((confirm_developer == 1)) || { echo "Missing --confirm-developer-write-exclusion" >&2; exit 1; }

path_has_symlink_component() {
  local path=$1 cursor= part
  local -a components=()
  [[ "$path" == /* ]] || return 0
  IFS='/' read -r -a components <<<"${path#/}"
  for part in "${components[@]}"; do
    [[ -n "$part" && "$part" != . ]] || continue
    cursor=$cursor/$part
    [[ ! -L "$cursor" ]] || return 0
  done
  return 1
}

declare -a paths=() parents=()
declare -A identity=() old_uid=() old_gid=() old_mode=() parent_for=()
declare -A parent_identity=() parent_current_mode=() parent_seen=()
PARENTS_LOCKED=0

restore_parents() {
  local parent
  ((PARENTS_LOCKED == 1)) || return 0
  for parent in "${parents[@]}"; do
    if [[ -d "$parent" && ! -L "$parent" && "$(stat -c '%d:%i' -- "$parent" 2>/dev/null || true)" == "${parent_identity[$parent]}" ]]; then
      chmod "${parent_current_mode[$parent]}" -- "$parent" || true
    else
      printf 'ROLLBACK WARNING: parent identity changed; mode not restored: %s\n' "$parent" >&2
    fi
  done
  PARENTS_LOCKED=0
}
trap restore_parents EXIT
trap 'exit 130' HUP INT TERM
ROLLBACK_HEAD
  printf 'MANIFEST=%q\n' "$H02_MANIFEST" >>"$ROLLBACK_H02"
  cat >>"$ROLLBACK_H02" <<'ROLLBACK_BODY'
[[ -f "$MANIFEST" && ! -L "$MANIFEST" ]] || { echo "Unsafe H-02 manifest" >&2; exit 1; }
[[ "$(stat -c '%u' -- "$MANIFEST")" == 0 ]] || { echo "Manifest is not root-owned" >&2; exit 1; }

while IFS=$'\t' read -r path expected_identity uid gid mode parent expected_parent_identity; do
  [[ -n "$path" ]] || continue
  paths+=("$path")
  identity["$path"]=$expected_identity
  old_uid["$path"]=$uid
  old_gid["$path"]=$gid
  old_mode["$path"]=$mode
  parent_for["$path"]=$parent
  parent_identity["$parent"]=$expected_parent_identity
  if [[ -z "${parent_seen[$parent]:-}" ]]; then
    parents+=("$parent")
    parent_seen["$parent"]=1
  fi
done <"$MANIFEST"
[[ "${#paths[@]}" -eq 9 && "${#parents[@]}" -eq 9 ]] || { echo "H-02 manifest count mismatch" >&2; exit 1; }

for path in "${paths[@]}"; do
  parent=${parent_for[$path]}
  path_has_symlink_component "$path" && { echo "Symlink component in H-02 rollback path" >&2; exit 1; }
  [[ -f "$path" && ! -L "$path" ]] || { echo "H-02 rollback target is not regular" >&2; exit 1; }
  [[ "$(stat -c '%d:%i' -- "$path")" == "${identity[$path]}" ]] || { echo "H-02 rollback inode mismatch" >&2; exit 1; }
  [[ "$(stat -c '%u:%g:%a' -- "$path")" == '0:0:600' ]] || { echo "H-02 target changed after remediation; refusing rollback" >&2; exit 1; }
  [[ -d "$parent" && ! -L "$parent" ]] || { echo "H-02 rollback parent is unsafe" >&2; exit 1; }
  [[ "$(stat -c '%d:%i' -- "$parent")" == "${parent_identity[$parent]}" ]] || { echo "H-02 rollback parent inode mismatch" >&2; exit 1; }
done

for parent in "${parents[@]}"; do
  parent_current_mode["$parent"]=$(stat -c '%a' -- "$parent")
  mode_num=$((8#${parent_current_mode[$parent]} & 07555))
  printf -v locked_mode '%o' "$mode_num"
  chmod "$locked_mode" -- "$parent"
done
PARENTS_LOCKED=1

for path in "${paths[@]}"; do
  [[ -f "$path" && ! -L "$path" && "$(stat -c '%d:%i' -- "$path")" == "${identity[$path]}" ]] || {
    echo "H-02 rollback target changed after parent lock" >&2
    exit 1
  }
done

for path in "${paths[@]}"; do
  chown --no-dereference "${old_uid[$path]}:${old_gid[$path]}" -- "$path"
  chmod "${old_mode[$path]}" -- "$path"
done

restore_parents
trap - EXIT HUP INT TERM
printf 'H-02 ownership/mode rollback complete for 9 exact files\n'
ROLLBACK_BODY
  chmod 0700 "$ROLLBACK_H02"
fi

: >"$H03_IDENTITY_MANIFEST"
: >"$H03_ACL_MANIFEST"
H03_ROOTS=$BACKUP_DIR/h03-roots.txt
H03_UNITS=$BACKUP_DIR/h03-units.txt
: >"$H03_ROOTS"
: >"$H03_UNITS"
for lead_dir in "${LEAD_PATHS[@]}"; do
  site_name=$(basename "${LEAD_SITE[$lead_dir]}")
  acl_backup=$BACKUP_DIR/acls/$site_name.acl
  getfacl -R -p -- "$lead_dir" >"$acl_backup"
  chown 0:0 -- "$acl_backup"
  chmod 0600 "$acl_backup"
  printf '%s\t%s\n' "$acl_backup" "$(sha256sum "$acl_backup" | awk '{print $1}')" >>"$H03_ACL_MANIFEST"
  printf '%s\n' "$lead_dir" >>"$H03_ROOTS"
  while IFS= read -r -d '' object; do
    [[ "$object" != *$'\t'* && "$object" != *$'\n'* ]] || die "H-03 path became manifest-unsafe after preflight"
    if [[ -d "$object" && ! -L "$object" ]]; then
      object_type=d
    elif [[ -f "$object" && ! -L "$object" ]]; then
      object_type=f
      [[ "$(stat -Lc '%h' -- "$object")" == 1 ]] || die "H-03 hardlink appeared after preflight: $object"
    else
      die "H-03 object type changed before backup: $object"
    fi
    printf '%s\t%s\t%s\n' "$object" "$(stat -Lc '%d:%i' -- "$object")" "$object_type" >>"$H03_IDENTITY_MANIFEST"
  done < <(find -P "$lead_dir" -xdev \( -type d -o -type f \) -print0)
done
for site_name in "${H03_SITE_NAMES[@]}"; do
  printf '%s\n' "$(basename -- "${SITE_UNIT[$CANON_FLEET/$site_name]}")" >>"$H03_UNITS"
done
LC_ALL=C sort -u -o "$H03_IDENTITY_MANIFEST" "$H03_IDENTITY_MANIFEST"
LC_ALL=C sort -u -o "$H03_ROOTS" "$H03_ROOTS"
LC_ALL=C sort -u -o "$H03_UNITS" "$H03_UNITS"
chown 0:0 -- "$H03_IDENTITY_MANIFEST" "$H03_ACL_MANIFEST" "$H03_ROOTS" "$H03_UNITS"
chmod 0600 -- "$H03_IDENTITY_MANIFEST" "$H03_ACL_MANIFEST" "$H03_ROOTS" "$H03_UNITS"
H03_IDENTITY_SHA=$(sha256sum "$H03_IDENTITY_MANIFEST" | awk '{print $1}')
H03_ACL_MANIFEST_SHA=$(sha256sum "$H03_ACL_MANIFEST" | awk '{print $1}')
H03_ROOTS_SHA=$(sha256sum "$H03_ROOTS" | awk '{print $1}')
H03_UNITS_SHA=$(sha256sum "$H03_UNITS" | awk '{print $1}')

cat >"$ROLLBACK_ALL" <<'ROLLBACK_ALL_HEAD'
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
confirm_writers=0
confirm_developer=0
while (($#)); do
  case "$1" in
    --confirm-h03-writers-stopped) confirm_writers=1 ;;
    --confirm-developer-write-exclusion) confirm_developer=1 ;;
    *) echo "Unknown rollback argument: $1" >&2; exit 64 ;;
  esac
  shift
done
[[ "$(id -u)" -eq 0 ]] || { echo "Run as root" >&2; exit 1; }
((confirm_writers == 1)) || { echo "Missing --confirm-h03-writers-stopped" >&2; exit 1; }
((confirm_developer == 1)) || { echo "Missing --confirm-developer-write-exclusion" >&2; exit 1; }
command -v setfacl >/dev/null 2>&1 || { echo "setfacl required" >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum required" >&2; exit 1; }

path_has_symlink_component() {
  local path=$1 cursor= part
  local -a components=()
  [[ "$path" == /* ]] || return 0
  IFS='/' read -r -a components <<<"${path#/}"
  for part in "${components[@]}"; do
    [[ -n "$part" && "$part" != . ]] || continue
    cursor=$cursor/$part
    [[ ! -L "$cursor" ]] || return 0
  done
  return 1
}
ROLLBACK_ALL_HEAD
printf 'SYSTEMCTL=%q\n' "$SYSTEMCTL" >>"$ROLLBACK_ALL"
printf 'IDENTITY_MANIFEST=%q\n' "$H03_IDENTITY_MANIFEST" >>"$ROLLBACK_ALL"
printf 'IDENTITY_SHA=%q\n' "$H03_IDENTITY_SHA" >>"$ROLLBACK_ALL"
printf 'ACL_MANIFEST=%q\n' "$H03_ACL_MANIFEST" >>"$ROLLBACK_ALL"
printf 'ACL_MANIFEST_SHA=%q\n' "$H03_ACL_MANIFEST_SHA" >>"$ROLLBACK_ALL"
printf 'ROOTS_FILE=%q\n' "$H03_ROOTS" >>"$ROLLBACK_ALL"
printf 'ROOTS_SHA=%q\n' "$H03_ROOTS_SHA" >>"$ROLLBACK_ALL"
printf 'UNITS_FILE=%q\n' "$H03_UNITS" >>"$ROLLBACK_ALL"
printf 'UNITS_SHA=%q\n' "$H03_UNITS_SHA" >>"$ROLLBACK_ALL"
cat >>"$ROLLBACK_ALL" <<'ROLLBACK_ALL_BODY'
for artifact in "$IDENTITY_MANIFEST" "$ACL_MANIFEST" "$ROOTS_FILE" "$UNITS_FILE"; do
  [[ -f "$artifact" && ! -L "$artifact" ]] || { echo "Unsafe rollback artifact" >&2; exit 1; }
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$artifact")" == 0:0:600:1 ]] || { echo "Rollback artifact metadata changed" >&2; exit 1; }
done
[[ "$(sha256sum "$IDENTITY_MANIFEST" | awk '{print $1}')" == "$IDENTITY_SHA" ]] || { echo "Identity manifest digest changed" >&2; exit 1; }
[[ "$(sha256sum "$ACL_MANIFEST" | awk '{print $1}')" == "$ACL_MANIFEST_SHA" ]] || { echo "ACL manifest digest changed" >&2; exit 1; }
[[ "$(sha256sum "$ROOTS_FILE" | awk '{print $1}')" == "$ROOTS_SHA" ]] || { echo "Root manifest digest changed" >&2; exit 1; }
[[ "$(sha256sum "$UNITS_FILE" | awk '{print $1}')" == "$UNITS_SHA" ]] || { echo "Unit manifest digest changed" >&2; exit 1; }

while IFS= read -r unit; do
  [[ -n "$unit" ]] || continue
  [[ "$("$SYSTEMCTL" show "$unit" --property=LoadState --value 2>/dev/null)" == loaded ]] || { echo "Unit is not loaded: $unit" >&2; exit 1; }
  active_rc=0
  "$SYSTEMCTL" is-active --quiet "$unit" || active_rc=$?
  [[ "$active_rc" == 3 ]] || { echo "Unit is active or its state is not visible: $unit" >&2; exit 1; }
done <"$UNITS_FILE"

declare -A expected_identity=() expected_type=() seen_current=()
while IFS=$'\t' read -r path identity object_type extra || [[ -n "$path" ]]; do
  [[ -n "$path" && -z "${extra:-}" ]] || { echo "Malformed identity manifest" >&2; exit 1; }
  [[ -z "${expected_identity[$path]:-}" ]] || { echo "Duplicate identity path" >&2; exit 1; }
  expected_identity["$path"]=$identity
  expected_type["$path"]=$object_type
  path_has_symlink_component "$path" && { echo "Symlink component in rollback path" >&2; exit 1; }
  case "$object_type" in
    d) [[ -d "$path" && ! -L "$path" ]] || { echo "Rollback directory type changed" >&2; exit 1; } ;;
    f)
      [[ -f "$path" && ! -L "$path" ]] || { echo "Rollback file type changed" >&2; exit 1; }
      [[ "$(stat -Lc '%h' -- "$path")" == 1 ]] || { echo "Rollback file became hardlinked" >&2; exit 1; }
      ;;
    *) echo "Unknown rollback object type" >&2; exit 1 ;;
  esac
  [[ "$(stat -Lc '%d:%i' -- "$path")" == "$identity" ]] || { echo "Rollback object identity changed" >&2; exit 1; }
done <"$IDENTITY_MANIFEST"

# Refuse partial restore if any tree gained, lost, or replaced an object.
while IFS= read -r root; do
  [[ -n "$root" ]] || continue
  while IFS= read -r -d '' path; do
    [[ -n "${expected_identity[$path]:-}" ]] || { echo "Rollback tree gained an unreviewed object" >&2; exit 1; }
    [[ "$(stat -Lc '%d:%i' -- "$path")" == "${expected_identity[$path]}" ]] || { echo "Rollback tree identity mismatch" >&2; exit 1; }
    seen_current["$path"]=1
  done < <(find -P "$root" -xdev \( -type d -o -type f \) -print0)
done <"$ROOTS_FILE"
[[ "${#seen_current[@]}" == "${#expected_identity[@]}" ]] || { echo "Rollback tree lost an object" >&2; exit 1; }

declare -a acl_files=()
declare -A acl_hash=()
while IFS=$'\t' read -r acl_file digest extra || [[ -n "$acl_file" ]]; do
  [[ -n "$acl_file" && -z "${extra:-}" && "$digest" =~ ^[0-9a-f]{64}$ ]] || { echo "Malformed ACL manifest" >&2; exit 1; }
  [[ -f "$acl_file" && ! -L "$acl_file" ]] || { echo "ACL backup is unsafe" >&2; exit 1; }
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$acl_file")" == 0:0:600:1 ]] || { echo "ACL backup metadata changed" >&2; exit 1; }
  [[ "$(sha256sum "$acl_file" | awk '{print $1}')" == "$digest" ]] || { echo "ACL backup digest changed" >&2; exit 1; }
  acl_files+=("$acl_file")
  acl_hash["$acl_file"]=$digest
done <"$ACL_MANIFEST"

# Every object and every backup was validated before this first mutation.
for acl_file in "${acl_files[@]}"; do
  setfacl --restore="$acl_file"
done
ROLLBACK_ALL_BODY
if [[ "$APPLY_SCOPE" == both ]]; then
  printf 'bash %q --confirm-developer-write-exclusion\n' "$ROLLBACK_H02" >>"$ROLLBACK_ALL"
fi
cat >>"$ROLLBACK_ALL" <<'ROLLBACK_ALL_DONE'
printf '%s\n' 'Identity-bound H-03 ACL/owner/mode rollback complete'
ROLLBACK_ALL_DONE
chmod 0700 "$ROLLBACK_ALL"
chmod -R go-rwx "$BACKUP_DIR"

if [[ "$APPLY_SCOPE" == both ]]; then
  declare -A LOCKED_PARENT_MODE=()
  PARENTS_LOCKED=0
  restore_h02_parent_modes() {
  local parent
  ((PARENTS_LOCKED == 1)) || return 0
  for parent in "${H02_PARENTS[@]}"; do
    if [[ -d "$parent" && ! -L "$parent" && "$(stat -c '%d:%i' -- "$parent" 2>/dev/null || true)" == "${H02_PARENT_IDENTITY[$parent]}" ]]; then
      chmod "${LOCKED_PARENT_MODE[$parent]}" -- "$parent" || true
    else
      warn "Parent identity changed; could not restore its mode: $parent"
    fi
  done
  PARENTS_LOCKED=0
  }
  trap restore_h02_parent_modes EXIT
  trap 'exit 130' HUP INT TERM

# Lock all developer-owned direct parents before changing the first secret file.
  for parent in "${H02_PARENTS[@]}"; do
  [[ -d "$parent" && ! -L "$parent" ]] || die "H-02 parent became unsafe before lock: $parent"
  [[ "$(stat -c '%d:%i' -- "$parent")" == "${H02_PARENT_IDENTITY[$parent]}" ]] || die "H-02 parent inode changed before lock: $parent"
  current_mode=$(file_mode "$parent")
  [[ "$current_mode" == "${H02_PARENT_MODE[$parent]}" ]] || die "H-02 parent mode changed before lock: $parent"
  LOCKED_PARENT_MODE["$parent"]=$current_mode
  locked_num=$((8#$current_mode & 07555))
  printf -v locked_mode '%o' "$locked_num"
  chmod "$locked_mode" -- "$parent"
  done
  PARENTS_LOCKED=1

# Revalidate inode, type, sensitive-key presence, and a non-secret content hash
# after every parent is non-writable.
  for path in "${H02_PATHS[@]}"; do
  validate_h02_path "$path" "${H02_IDENTITY[$path]}" || die "H-02 post-lock validation failed"
  [[ "$(sha256sum "$path" | awk '{print $1}')" == "${H02_HASH[$path]}" ]] || die "H-02 content changed during parent-lock transition: $path"
  done

  for path in "${H02_PATHS[@]}"; do
  chown --no-dereference 0:0 -- "$path"
  chmod 0600 -- "$path"
  [[ -f "$path" && ! -L "$path" && "$(stat -c '%d:%i' -- "$path")" == "${H02_IDENTITY[$path]}" ]] || die "H-02 target changed during apply: $path"
  [[ "$(sha256sum "$path" | awk '{print $1}')" == "${H02_HASH[$path]}" ]] || die "H-02 content changed during apply: $path"
  [[ "$(stat -c '%u:%g:%a' -- "$path")" == '0:0:600' ]] || die "H-02 metadata verification failed: $path"
  printf 'CHANGED H-02 root:root 600: %s\n' "$path"
  CHANGED=$((CHANGED + 1))
  done

  restore_h02_parent_modes
  trap - EXIT HUP INT TERM

  for parent in "${H02_PARENTS[@]}"; do
  [[ "$(stat -c '%d:%i:%u:%g:%a' -- "$parent")" == \
    "${H02_PARENT_IDENTITY[$parent]}:${H02_PARENT_UID[$parent]}:${H02_PARENT_GID[$parent]}:${H02_PARENT_MODE[$parent]}" ]] || \
    die "H-02 parent restoration verification failed: $parent"
  done
else
  info "H-03-only apply: the secret-file phase was not read, backed up, locked, or changed"
fi

# H-03: backups and a complete device/inode manifest already succeeded while
# every unit was inactive and developer writers were excluded. Revalidate the
# complete tree before the first mutation; no partial validation is accepted.
for site_name in "${H03_SITE_NAMES[@]}"; do
  unit_name=$(basename -- "${SITE_UNIT[$CANON_FLEET/$site_name]}")
  [[ "$("$SYSTEMCTL" show "$unit_name" --property=LoadState --value 2>/dev/null)" == loaded ]] || \
    die "H-03 unit load state changed before apply: $unit_name"
  active_rc=0
  "$SYSTEMCTL" is-active --quiet "$unit_name" || active_rc=$?
  [[ "$active_rc" == 3 ]] || die "H-03 unit is active/state changed before apply: $unit_name"
done
declare -A H03_EXPECTED_IDENTITY=() H03_SEEN_CURRENT=()
while IFS=$'\t' read -r object expected_identity object_type extra || [[ -n "$object" ]]; do
  [[ -n "$object" && -z "${extra:-}" ]] || die "Malformed H-03 identity manifest"
  [[ -z "${H03_EXPECTED_IDENTITY[$object]:-}" ]] || die "Duplicate H-03 identity path"
  H03_EXPECTED_IDENTITY["$object"]=$expected_identity
  path_has_symlink_component "$object" && die "H-03 symlink component appeared before apply: $object"
  case "$object_type" in
    d) [[ -d "$object" && ! -L "$object" ]] || die "H-03 directory type changed before apply" ;;
    f)
      [[ -f "$object" && ! -L "$object" ]] || die "H-03 file type changed before apply"
      [[ "$(stat -Lc '%h' -- "$object")" == 1 ]] || die "H-03 file became hardlinked before apply"
      ;;
    *) die "Unknown H-03 identity object type" ;;
  esac
  [[ "$(stat -Lc '%d:%i' -- "$object")" == "$expected_identity" ]] || die "H-03 object identity changed before apply: $object"
done <"$H03_IDENTITY_MANIFEST"
for lead_dir in "${LEAD_PATHS[@]}"; do
  while IFS= read -r -d '' object; do
    [[ -n "${H03_EXPECTED_IDENTITY[$object]:-}" ]] || die "H-03 tree gained an object before apply: $object"
    [[ "$(stat -Lc '%d:%i' -- "$object")" == "${H03_EXPECTED_IDENTITY[$object]}" ]] || die "H-03 object identity changed before apply: $object"
    H03_SEEN_CURRENT["$object"]=1
  done < <(find -P "$lead_dir" -xdev \( -type d -o -type f \) -print0)
done
[[ "${#H03_SEEN_CURRENT[@]}" == "${#H03_EXPECTED_IDENTITY[@]}" ]] || die "H-03 tree lost an object before apply"

# Replace, rather than modify, access/default ACLs so no prior named developer
# ACL entry survives or inherits. Existing writer exclusion makes these
# path-based operations race-free within the declared threat model.
for lead_dir in "${LEAD_PATHS[@]}"; do
  [[ -d "$lead_dir" && ! -L "$lead_dir" && "$(stat -c '%d:%i' -- "$lead_dir")" == "${LEAD_IDENTITY[$lead_dir]}" ]] || \
    die "H-03 lead root changed after backup: $lead_dir"
  if find -P "$lead_dir" -xdev -type l -print -quit | grep -q .; then
    die "H-03 symlink appeared after backup: $lead_dir"
  fi
  dir_mode=${LEAD_DIR_MODE[$lead_dir]}
  file_mode_target=${LEAD_FILE_MODE[$lead_dir]}
  dir_acl=${LEAD_DIR_ACL[$lead_dir]}
  file_acl=${LEAD_FILE_ACL[$lead_dir]}
  default_acl=${LEAD_DEFAULT_ACL[$lead_dir]}

  while IFS= read -r -d '' object; do
    if [[ -d "$object" ]]; then
      setfacl -b -k -- "$object"
      chmod "$dir_mode" -- "$object"
      setfacl --set="$dir_acl" -- "$object"
      setfacl -d --set="$default_acl" -- "$object"
    elif [[ -f "$object" ]]; then
      setfacl -b -- "$object"
      chmod "$file_mode_target" -- "$object"
      setfacl --set="$file_acl" -- "$object"
    fi
  done < <(find -P "$lead_dir" -xdev \( -type d -o -type f \) -print0)

  while IFS= read -r -d '' object; do
    if [[ -d "$object" ]]; then
      [[ "$(file_mode "$object")" == "$dir_mode" ]] || die "H-03 directory mode verification failed: $object"
      if [[ "$dir_mode" == 750 ]]; then
        expected_acl=$'user::rwx\ngroup::r-x\nother::---\ndefault:user::rwx\ndefault:group::r-x\ndefault:other::---'
      else
        expected_acl=$'user::rwx\ngroup::rwx\nother::---\ndefault:user::rwx\ndefault:group::rwx\ndefault:other::---'
      fi
      actual_acl=$(getfacl -cp -- "$object" | sed '/^$/d')
      [[ "$actual_acl" == "$expected_acl" ]] || die "H-03 exact directory ACL verification failed: $object"
    elif [[ -f "$object" ]]; then
      [[ "$(file_mode "$object")" == "$file_mode_target" ]] || die "H-03 file mode verification failed: $object"
      if [[ "$file_mode_target" == 640 ]]; then
        expected_acl=$'user::rw-\ngroup::r--\nother::---'
      else
        expected_acl=$'user::rw-\ngroup::rw-\nother::---'
      fi
      actual_acl=$(getfacl -cp -- "$object" | sed '/^$/d')
      [[ "$actual_acl" == "$expected_acl" ]] || die "H-03 exact file ACL verification failed: $object"
    fi
  done < <(find -P "$lead_dir" -xdev \( -type d -o -type f \) -print0)
  printf 'CHANGED H-03 modes/default ACLs: %s\n' "$lead_dir"
  CHANGED=$((CHANGED + 1))
done

if [[ "$APPLY_SCOPE" == h03 ]]; then
  info "Apply complete: H-03-only roots=17 changed_groups=$CHANGED; secret-file changes=0"
else
  info "Apply complete: exact H-02 files=9 H-03 roots=17 changed_groups=$CHANGED"
fi
info "Rollback: $ROLLBACK_ALL"
info "No env content, service, process, firewall, package, or runtime unit state was changed."
