#!/usr/bin/env bash
# H-06: verify patch/reboot state and enforce a reviewed, removal-free APT plan.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=verify
PLAN_DIR=
REVIEWED_PLAN_SHA256=
CONFIRM_FINAL_PLAN=0
CONFIRM_SNAPSHOT=0
CONFIRM_WINDOW=0
SNAPSHOT_REFERENCE=
BACKUP_DIR=
FIXTURE_LOCK_DIR=
FIXTURE_BIN_DIR=
REBOOT_REQUIRED_FILE=/var/run/reboot-required
REBOOT_REQUIRED_PACKAGES_FILE=/var/run/reboot-required.pkgs

usage() {
  cat <<'USAGE'
Usage:
  05-patch-and-reboot-verifier.sh
  05-patch-and-reboot-verifier.sh --prepare-plan --plan-dir /root/<new-dir>
  05-patch-and-reboot-verifier.sh --apply --plan-dir /root/<reviewed-dir> \
    --reviewed-plan-sha256 HEX --confirm-final-reviewed-plan \
    --confirm-provider-snapshot --snapshot-reference TEXT \
    --confirm-maintenance-window [--backup-dir PATH]

Default is a read-only kernel/reboot/package simulation verifier.

--prepare-plan writes a new root-only, immutable-for-review plan directory from:

    apt-get -o Debug::NoLocking=true -s upgrade --with-new-pkgs --no-remove

It does not refresh APT indexes or install anything. If current indexes should
be refreshed, the owner must do that before preparing the plan, then review the
new digest. Apply refuses any dpkg audit output, any apt-mark hold, any planned
removal, package-state drift, plan/digest mismatch, or changed final simulation.
It requires the reviewed SHA256 to be supplied and a separate final confirmation
flag after the operator has reviewed that exact digest. Apply holds the real APT
and DPKG serialization locks continuously across the final state/simulation
revalidation and the exec'd action, and gates free space on /, /var and /boot.

WARNING: package maintainer scripts may restart services. Apply sets needrestart
to list-only, never calls reboot/autoremove/purge, and uses APT --no-remove.
General package downgrade is not a safe rollback; the provider snapshot is the
recovery control. Apply returns nonzero if the post-package reboot/update check
remains open.
USAGE
}

while (($#)); do
  case "$1" in
    --prepare-plan) MODE=prepare ;;
    --apply) MODE=apply ;;
    --plan-dir) (($# >= 2)) || die "--plan-dir requires a path"; PLAN_DIR=$2; shift ;;
    --reviewed-plan-sha256) (($# >= 2)) || die "--reviewed-plan-sha256 requires a digest"; REVIEWED_PLAN_SHA256=$2; shift ;;
    --confirm-final-reviewed-plan) CONFIRM_FINAL_PLAN=1 ;;
    --confirm-provider-snapshot) CONFIRM_SNAPSHOT=1 ;;
    --confirm-maintenance-window) CONFIRM_WINDOW=1 ;;
    --snapshot-reference) (($# >= 2)) || die "--snapshot-reference requires text"; SNAPSHOT_REFERENCE=$2; shift ;;
    --backup-dir) (($# >= 2)) || die "--backup-dir requires a path"; BACKUP_DIR=$2; shift ;;
    --fixture-lock-dir)
      (($# >= 2)) || die "--fixture-lock-dir requires a path"
      FIXTURE_LOCK_DIR=$2
      shift
      ;;
    --fixture-bin-dir)
      (($# >= 2)) || die "--fixture-bin-dir requires a path"
      FIXTURE_BIN_DIR=$2
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

require_command sha256sum
require_command uname
PACKAGE_PATH=/usr/sbin:/usr/bin:/sbin:/bin
if [[ -n "$FIXTURE_BIN_DIR" ]]; then
  require_absolute_path "$FIXTURE_BIN_DIR" "fixture package binary directory"
  [[ "$FIXTURE_BIN_DIR" == /tmp/astro-apt-fixture.*/* ]] || die "--fixture-bin-dir is restricted to the packaged /tmp fixture"
  [[ -d "$FIXTURE_BIN_DIR" && ! -L "$FIXTURE_BIN_DIR" && "$(realpath -e -- "$FIXTURE_BIN_DIR")" == "$FIXTURE_BIN_DIR" ]] || die "Unsafe fixture package binary directory"
  [[ "$(stat -Lc '%u:%g:%a' -- "$FIXTURE_BIN_DIR")" == 0:0:700 ]] || die "Fixture package binary directory must be root:root mode 0700"
  PACKAGE_PATH=$FIXTURE_BIN_DIR:$PACKAGE_PATH
fi

resolve_package_command() {
  local name=$1 destination=$2 resolved parent
  resolved=$(PATH="$PACKAGE_PATH" command -v "$name") || die "Required package command not found in fixed PATH: $name"
  [[ "$resolved" == /* && -f "$resolved" && ! -L "$resolved" && -x "$resolved" ]] || die "$name must resolve to an absolute regular non-symlink executable"
  [[ "$(stat -Lc '%u' -- "$resolved")" == 0 ]] || die "$name executable must be root-owned"
  mode_has_group_or_other_write_common "$(file_mode "$resolved")" && die "$name executable is group/other-writable"
  parent=$(dirname -- "$resolved")
  [[ "$(realpath -e -- "$parent")" == "$parent" && "$(stat -Lc '%u' -- "$parent")" == 0 ]] || die "$name parent must be canonical and root-owned"
  mode_has_group_or_other_write_common "$(file_mode "$parent")" && die "$name parent is group/other-writable"
  printf -v "$destination" '%s' "$resolved"
}

resolve_package_command apt-get APT_GET_BIN
resolve_package_command apt-mark APT_MARK_BIN
resolve_package_command dpkg DPKG_BIN
resolve_package_command dpkg-query DPKG_QUERY_BIN
[[ "$APT_GET_BIN" == /* && -f "$APT_GET_BIN" && ! -L "$APT_GET_BIN" && -x "$APT_GET_BIN" ]] || die "apt-get must resolve to an absolute regular non-symlink executable"
[[ "$(stat -Lc '%u:%h' -- "$APT_GET_BIN")" == 0:1 ]] || die "apt-get must be root-owned with one hard link"

build_package_environment() {
  PACKAGE_ENV_ARGS=(
    "PATH=$PACKAGE_PATH"
    HOME=/root
    LC_ALL=C
    APT_CONFIG=/dev/null
    DEBIAN_FRONTEND=noninteractive
    NEEDRESTART_MODE=l
  )
  if [[ -n "$FIXTURE_BIN_DIR" ]]; then
    PACKAGE_ENV_ARGS+=(
      "APT_LOG=${APT_LOG:-}"
      "APT_APPLIED_MARKER=${APT_APPLIED_MARKER:-}"
      "APT_LOCK_PROBE_FILES=${APT_LOCK_PROBE_FILES:-}"
      "APT_STILL_OPEN=${APT_STILL_OPEN:-0}"
      "APT_REMOVE=${APT_REMOVE:-0}"
      "APT_HOLD_TEXT=${APT_HOLD_TEXT:-}"
      "DPKG_AUDIT_TEXT=${DPKG_AUDIT_TEXT:-}"
      "PACKAGE_ENV_LOG=${PACKAGE_ENV_LOG:-}"
    )
  fi
}

package_env() {
  build_package_environment
  /usr/bin/env -i "${PACKAGE_ENV_ARGS[@]}" "$@"
}

package_exec() {
  build_package_environment
  exec /usr/bin/env -i "${PACKAGE_ENV_ARGS[@]}" "$@"
}

assert_clean_package_database() {
  local audit holds
  if ! audit=$(package_env "$DPKG_BIN" --audit 2>&1); then
    blocked "dpkg --audit failed"
    printf '%s\n' "$audit" | sed -n '1,40p' >&2
    return 1
  fi
  if [[ -n "$audit" ]]; then
    blocked "dpkg audit is nonempty; repair package state before planning/apply"
    printf '%s\n' "$audit" | sed -n '1,40p' >&2
    return 1
  fi
  if ! holds=$(package_env "$APT_MARK_BIN" showhold 2>&1); then
    blocked "Cannot inspect held packages"
    printf '%s\n' "$holds" | sed -n '1,20p' >&2
    return 1
  fi
  if [[ -n "$holds" ]]; then
    blocked "Held packages exist; this helper refuses held-state changes or ambiguous coverage"
    printf '%s\n' "$holds" | sed 's/^/  /' >&2
    return 1
  fi
}

write_simulation() {
  local destination=$1
  # Simulation is read-only. During apply the outer process already holds the
  # real APT/DPKG fcntl locks, so the child simulation must not self-deadlock.
  package_env "$APT_GET_BIN" -o Debug::NoLocking=true -s upgrade --with-new-pkgs --no-remove >"$destination" 2>&1 || {
    blocked "APT removal-free simulation failed"
    sed -n '1,60p' "$destination" >&2
    return 1
  }
  if grep -qE '^Remv ' "$destination" || grep -qE '[1-9][0-9]* to remove' "$destination"; then
    blocked "APT simulation contains a removal despite --no-remove"
    return 1
  fi
}

package_state_sha256() {
  package_env "$DPKG_QUERY_BIN" -W -f='${binary:Package}\t${Version}\t${db:Status-Abbrev}\n' \
    | LC_ALL=C sort | sha256sum | awk '{print $1}'
}

verify_state() {
  local running newest installed_count reboot_required simulation upgrade_count
  local -a installed_kernels=()
  running=$(uname -r)
  mapfile -t installed_kernels < <(
    package_env "$DPKG_QUERY_BIN" -W -f='${db:Status-Abbrev}\t${Package}\n' 'linux-image-[0-9]*' 2>/dev/null \
      | awk '$1 ~ /^ii/ {sub(/^linux-image-/, "", $2); print $2}' \
      | sort -V
  )
  installed_count=${#installed_kernels[@]}
  newest=${installed_kernels[$((installed_count - 1))]:-unknown}

  printf 'OS: '
  if [[ -r /etc/os-release ]]; then
    sed -n 's/^PRETTY_NAME=//p' /etc/os-release | head -n1 | tr -d '"'
  else
    printf 'unknown\n'
  fi
  printf 'Running kernel: %s\nNewest installed kernel: %s\n' "$running" "$newest"

  reboot_required=0
  if [[ -e "$REBOOT_REQUIRED_FILE" ]]; then
    reboot_required=1
    printf 'Reboot required: YES\n'
    [[ ! -r "$REBOOT_REQUIRED_PACKAGES_FILE" ]] || sed 's/^/  /' "$REBOOT_REQUIRED_PACKAGES_FILE"
  else
    printf 'Reboot required: no\n'
  fi
  if [[ "$newest" != unknown && "$running" != "$newest" ]]; then
    warn "Running kernel is not the newest installed kernel"
    reboot_required=1
  fi
  df -hP / | sed -n '1,2p'
  assert_clean_package_database || return 2

  simulation=$(mktemp /tmp/astro-apt-verify.XXXXXX)
  chmod 0600 "$simulation"
  if ! write_simulation "$simulation"; then
    rm -f -- "$simulation"
    return 2
  fi
  upgrade_count=$(grep -c '^Inst ' "$simulation" || true)
  printf 'Simulated removal-free package upgrades/new dependencies: %s\n' "$upgrade_count"
  grep -E '^[0-9]+ upgraded,|^Inst ' "$simulation" | sed -n '1,80p' || true
  rm -f -- "$simulation"

  if ((reboot_required == 0 && upgrade_count == 0)); then
    info "Patch/reboot verification PASS"
    return 0
  fi
  warn "Patch/reboot verification remains open"
  return 2
}

if [[ "$MODE" == verify ]]; then
  verify_state
  exit $?
fi

require_root
[[ -n "$PLAN_DIR" ]] || die "--plan-dir is required"

if [[ "$MODE" == prepare ]]; then
  assert_clean_package_database || exit 2
  canonical_plan=$(canonical_private_output_path "$PLAN_DIR")
  [[ ! -e "$canonical_plan" && ! -L "$canonical_plan" ]] || die "Plan directory must be new"
  canonical_plan=$(prepare_marked_private_dir "$canonical_plan" .astro-apt-plan)
  simulation=$canonical_plan/APT-SIMULATION.txt
  write_simulation "$simulation" || exit 2
  chown 0:0 -- "$simulation"
  chmod 0600 -- "$simulation"
  plan_sha=$(sha256sum "$simulation" | awk '{print $1}')
  state_sha=$(package_state_sha256)
  {
    printf 'plan_sha256=%s\n' "$plan_sha"
    printf 'package_state_sha256=%s\n' "$state_sha"
    printf 'command=apt-get -o Debug::NoLocking=true -s upgrade --with-new-pkgs --no-remove\n'
    printf 'created_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } >"$canonical_plan/PLAN-METADATA.txt"
  printf '%s  APT-SIMULATION.txt\n' "$plan_sha" >"$canonical_plan/PLAN.sha256"
  chown 0:0 -- "$canonical_plan/PLAN-METADATA.txt" "$canonical_plan/PLAN.sha256"
  chmod 0600 -- "$canonical_plan/PLAN-METADATA.txt" "$canonical_plan/PLAN.sha256"
  info "Removal-free APT review plan prepared: $canonical_plan"
  printf 'REVIEWED PLAN SHA256: %s\n' "$plan_sha"
  info "No APT indexes or packages were changed. Review every Inst line before apply."
  exit 0
fi

((CONFIRM_SNAPSHOT == 1)) || die "Missing --confirm-provider-snapshot"
require_command python3
((CONFIRM_WINDOW == 1)) || die "Missing --confirm-maintenance-window"
((CONFIRM_FINAL_PLAN == 1)) || die "Missing --confirm-final-reviewed-plan"
[[ -n "$SNAPSHOT_REFERENCE" ]] || die "Missing --snapshot-reference"
[[ "$SNAPSHOT_REFERENCE" != *$'\n'* && "$SNAPSHOT_REFERENCE" != *$'\r'* ]] || die "Invalid snapshot reference"
[[ "$REVIEWED_PLAN_SHA256" =~ ^[0-9a-f]{64}$ ]] || die "A lowercase 64-character --reviewed-plan-sha256 is required"

canonical_plan=$(canonical_private_output_path "$PLAN_DIR")
[[ -d "$canonical_plan" ]] || die "Reviewed plan directory is absent"
canonical_plan=$(prepare_marked_private_dir "$canonical_plan" .astro-apt-plan)
for artifact in APT-SIMULATION.txt PLAN-METADATA.txt PLAN.sha256; do
  path=$canonical_plan/$artifact
  [[ -f "$path" && ! -L "$path" ]] || die "Unsafe/missing reviewed plan artifact: $artifact"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$path")" == 0:0:600:1 ]] || die "Reviewed plan artifact must be root:root mode 0600 with one link: $artifact"
done
stored_sha=$(sed -n 's/^plan_sha256=//p' "$canonical_plan/PLAN-METADATA.txt")
stored_state_sha=$(sed -n 's/^package_state_sha256=//p' "$canonical_plan/PLAN-METADATA.txt")
[[ "$stored_sha" =~ ^[0-9a-f]{64}$ && "$stored_state_sha" =~ ^[0-9a-f]{64}$ ]] || die "Reviewed plan metadata is malformed"
[[ "$stored_sha" == "$REVIEWED_PLAN_SHA256" ]] || die "Supplied reviewed SHA256 does not match plan metadata"
[[ "$(sha256sum "$canonical_plan/APT-SIMULATION.txt" | awk '{print $1}')" == "$REVIEWED_PLAN_SHA256" ]] || die "Reviewed plan content digest mismatch"
[[ "$(<"$canonical_plan/PLAN.sha256")" == "$REVIEWED_PLAN_SHA256  APT-SIMULATION.txt" ]] || die "PLAN.sha256 content mismatch"

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR=$(default_backup_dir "packages")
fi
assert_new_directory_target "$BACKUP_DIR"

# Production holds the real APT/DPKG fcntl locks. The override exists only for
# this pack's root-owned /tmp fixture and cannot be aimed at an arbitrary path.
if [[ -n "$FIXTURE_LOCK_DIR" ]]; then
  require_absolute_path "$FIXTURE_LOCK_DIR" "fixture lock directory"
  [[ "$FIXTURE_LOCK_DIR" == /tmp/astro-apt-fixture.*/* ]] || die "--fixture-lock-dir is restricted to the packaged /tmp fixture"
  [[ -d "$FIXTURE_LOCK_DIR" && ! -L "$FIXTURE_LOCK_DIR" && "$(realpath -e -- "$FIXTURE_LOCK_DIR")" == "$FIXTURE_LOCK_DIR" ]] || die "Unsafe fixture lock directory"
  [[ "$(stat -Lc '%u:%g:%a' -- "$FIXTURE_LOCK_DIR")" == 0:0:700 ]] || die "Fixture lock directory must be root:root mode 0700"
  APT_LOCK_FILES="$FIXTURE_LOCK_DIR/dpkg-frontend.lock:$FIXTURE_LOCK_DIR/dpkg.lock:$FIXTURE_LOCK_DIR/apt-lists.lock:$FIXTURE_LOCK_DIR/apt-archives.lock"
  REBOOT_REQUIRED_FILE=$FIXTURE_LOCK_DIR/reboot-required
  REBOOT_REQUIRED_PACKAGES_FILE=$FIXTURE_LOCK_DIR/reboot-required.pkgs
else
  APT_LOCK_FILES=/var/lib/dpkg/lock-frontend:/var/lib/dpkg/lock:/var/lib/apt/lists/lock:/var/cache/apt/archives/lock
fi

IFS=: read -r -a apt_lock_paths <<<"$APT_LOCK_FILES"
for lock_path in "${apt_lock_paths[@]}"; do
  lock_parent=$(dirname -- "$lock_path")
  [[ -d "$lock_parent" && ! -L "$lock_parent" && "$(realpath -e -- "$lock_parent")" == "$lock_parent" ]] || die "Unsafe APT lock parent: $lock_parent"
  [[ "$(stat -Lc '%u' -- "$lock_parent")" == 0 ]] || die "APT lock parent is not root-owned: $lock_parent"
  mode_has_group_or_other_write_common "$(file_mode "$lock_parent")" && die "APT lock parent is writable by group/other: $lock_parent"
  if [[ -e "$lock_path" || -L "$lock_path" ]]; then
    [[ -f "$lock_path" && ! -L "$lock_path" && "$(stat -Lc '%u:%h' -- "$lock_path")" == 0:1 ]] || die "Unsafe APT lock file: $lock_path"
  fi
done

check_filesystem_space() {
  local path=$1 minimum_kb=$2 label=$3 output available
  [[ -e "$path" ]] || die "Required filesystem path is absent: $path"
  output=$(df -Pk -- "$path") || die "Cannot inspect free space for $path"
  available=$(awk 'NR == 2 {print $4}' <<<"$output")
  [[ "$available" =~ ^[0-9]+$ ]] || die "Invalid free-space result for $path"
  ((available >= minimum_kb)) || die "$label has less than $((minimum_kb / 1024)) MiB free; refusing package apply"
  info "$label free-space gate: ${available} KiB available (minimum ${minimum_kb} KiB)"
}

locked_apply_phase() {
  set -euo pipefail
  IFS=$'\n\t'
  umask 0077
  local artifact path locked_stored_sha locked_state_sha final_simulation final_sha

  # Revalidate every reviewed artifact and package state only after all four
  # real APT/DPKG locks are held. They remain held across the final solver run
  # and are inherited by the exec'd apt-get action (same process identity).
  for artifact in APT-SIMULATION.txt PLAN-METADATA.txt PLAN.sha256; do
    path=$canonical_plan/$artifact
    [[ -f "$path" && ! -L "$path" && "$(stat -Lc '%u:%g:%a:%h' -- "$path")" == 0:0:600:1 ]] || die "Reviewed plan artifact became unsafe: $artifact"
  done
  locked_stored_sha=$(sed -n 's/^plan_sha256=//p' "$canonical_plan/PLAN-METADATA.txt")
  locked_state_sha=$(sed -n 's/^package_state_sha256=//p' "$canonical_plan/PLAN-METADATA.txt")
  [[ "$locked_stored_sha" == "$REVIEWED_PLAN_SHA256" && "$locked_state_sha" == "$stored_state_sha" ]] || die "Reviewed plan metadata changed before locked apply"
  [[ "$(sha256sum "$canonical_plan/APT-SIMULATION.txt" | awk '{print $1}')" == "$REVIEWED_PLAN_SHA256" ]] || die "Reviewed plan digest changed before locked apply"
  [[ "$(<"$canonical_plan/PLAN.sha256")" == "$REVIEWED_PLAN_SHA256  APT-SIMULATION.txt" ]] || die "PLAN.sha256 changed before locked apply"
  assert_clean_package_database || exit 2
  [[ "$(package_state_sha256)" == "$stored_state_sha" ]] || die "Installed package state changed after plan creation; prepare and review a new plan"

  final_simulation=$(mktemp /tmp/astro-apt-final.XXXXXX)
  chmod 0600 -- "$final_simulation"
  trap 'rm -f -- "$final_simulation"' EXIT HUP INT TERM
  write_simulation "$final_simulation" || exit 2
  final_sha=$(sha256sum "$final_simulation" | awk '{print $1}')
  [[ "$final_sha" == "$REVIEWED_PLAN_SHA256" ]] || die "Final locked APT simulation differs from the reviewed plan; prepare a new plan"
  printf 'FINAL LOCKED REVIEWED PLAN SHA256: %s\n' "$final_sha"
  printf 'Planned package actions (locks held):\n'
  grep -E '^Inst |^[0-9]+ upgraded,' "$final_simulation" | sed -n '1,160p' || true

  check_filesystem_space / 2097152 "root filesystem"
  check_filesystem_space /var 2097152 "/var filesystem"
  check_filesystem_space /boot 524288 "/boot filesystem"

  print_apply_banner "FINAL LOCKED CONFIRMATION ACCEPTED FOR SHA256 $final_sha. APT WILL CHANGE PACKAGES with --no-remove. Maintainer scripts may affect services. This script WILL NOT reboot."
  make_private_dir "$BACKUP_DIR"
  printf '%s\n' "$SNAPSHOT_REFERENCE" >"$BACKUP_DIR/provider-snapshot-reference.txt"
  cp -a -- "$canonical_plan" "$BACKUP_DIR/reviewed-plan"
  package_env "$DPKG_QUERY_BIN" -W -f='${binary:Package}\t${Version}\t${db:Status-Abbrev}\n' >"$BACKUP_DIR/packages-before.tsv"
  package_env "$APT_MARK_BIN" showmanual >"$BACKUP_DIR/manual-packages-before.txt"
  uname -a >"$BACKUP_DIR/uname-before.txt"
  [[ ! -d /etc/apt ]] || cp -a -- /etc/apt "$BACKUP_DIR/etc-apt"
  cat >"$BACKUP_DIR/ROLLBACK.txt" <<'ROLLBACK'
General APT downgrades are not a safe rollback. If the host fails acceptance:
1. Preserve package, boot, service, and journal evidence.
2. Use the provider snapshot recorded in provider-snapshot-reference.txt.
3. If only a new kernel fails, select the prior known-good kernel from the boot
   loader/provider console; do not purge kernels during the incident.
4. Re-run package and application verification after recovery.
ROLLBACK
  chmod -R go-rwx "$BACKUP_DIR"
  rm -f -- "$final_simulation"
  trap - EXIT HUP INT TERM

  # package_exec uses the exact same fixed PATH, APT_CONFIG=/dev/null, locale,
  # HOME, frontend and needrestart environment as every simulation/audit/query.
  # GNU env execs in the same process, preserving the inherited locks.
  package_exec "$APT_GET_BIN" -y upgrade --with-new-pkgs --no-remove
}

export canonical_plan REVIEWED_PLAN_SHA256 stored_state_sha BACKUP_DIR SNAPSHOT_REFERENCE \
  FIXTURE_LOCK_DIR FIXTURE_BIN_DIR PACKAGE_PATH APT_GET_BIN APT_MARK_BIN DPKG_BIN DPKG_QUERY_BIN
export -f locked_apply_phase check_filesystem_space assert_clean_package_database \
  package_state_sha256 write_simulation make_private_dir assert_new_directory_target \
  canonical_private_output_path require_absolute_path mode_has_group_or_other_write_common \
  file_mode print_apply_banner info warn blocked die build_package_environment package_env package_exec

LOCK_RUNNER='import fcntl, os, stat, sys
fds=[]
for path in os.environ["APT_LOCK_FILES"].split(":"):
    flags=os.O_RDWR | os.O_CREAT
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd=os.open(path, flags, 0o640)
        st=os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_uid != 0 or st.st_nlink != 1:
            raise OSError("unsafe lock metadata")
        fcntl.lockf(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        os.set_inheritable(fd, True)
        fds.append(fd)
    except OSError as exc:
        print("BLOCKED: cannot exclusively acquire APT/DPKG serialization lock %s: %s" % (path, exc), file=sys.stderr)
        sys.exit(75)
os.execvpe(sys.argv[1], sys.argv[1:], os.environ)'
export APT_LOCK_FILES
if python3 -c "$LOCK_RUNNER" /bin/bash -c locked_apply_phase; then
  :
else
  locked_status=$?
  blocked "Locked reviewed APT phase failed (status=$locked_status); no post-success claim is made"
  exit "$locked_status"
fi

assert_clean_package_database || { blocked "Post-upgrade package database/hold verification failed"; exit 2; }
package_env "$DPKG_QUERY_BIN" -W -f='${binary:Package}\t${Version}\t${db:Status-Abbrev}\n' >"$BACKUP_DIR/packages-after.tsv"
uname -a >"$BACKUP_DIR/uname-after-package-install.txt"
chmod 0600 "$BACKUP_DIR/packages-after.tsv" "$BACKUP_DIR/uname-after-package-install.txt"

info "Removal-free package phase complete. State/recovery evidence: $BACKUP_DIR"
warn "The host has NOT been rebooted. Reboot manually in the approved window, then run this verifier with no arguments."
if verify_state; then
  info "Post-package acceptance is closed."
  exit 0
else
  post_status=$?
  blocked "Post-package acceptance remains OPEN; returning nonzero until reboot/update verification passes"
  exit "$post_status"
fi
