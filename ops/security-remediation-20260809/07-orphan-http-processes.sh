#!/usr/bin/env bash
# M-07: audit root-owned unmanaged HTTP listeners; optionally pidfd-SIGTERM one
# exact, fully revalidated process. Never SIGKILLs or restarts anything.

set -euo pipefail
IFS=$'\n\t'
export LC_ALL=C

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=audit
WRITE_PLAN=
READ_PLAN=
SELECT_PID=
CONFIRM=0
SS_SNAPSHOT=
CLASSIFY_CGROUP=

usage() {
  cat <<'USAGE'
Usage:
  07-orphan-http-processes.sh
  07-orphan-http-processes.sh --apply --write-plan /root/orphan.tsv --pid PID
  07-orphan-http-processes.sh --apply --plan /root/orphan.tsv --confirm-reviewed-every-pid
  07-orphan-http-processes.sh --classify-cgroup 'CONTROLLER::/path'

Default is a root/read-only candidate audit. Arguments and environments are not
printed because they may contain secrets. Plan creation writes evidence only.

Termination accepts exactly one data row per invocation. Before any signal it
validates the complete plan, duplicate count, PID/start time, root UID, exact
comm, executable path and SHA256, exact canonical cwd, exact unmanaged cgroup,
and exact sorted listener set where every port is >=1024. It then revalidates the
row and uses a Linux pidfd SIGTERM. No SIGKILL or automatic restart is attempted.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --write-plan) (($# >= 2)) || die "--write-plan requires a path"; WRITE_PLAN=$2; shift ;;
    --plan) (($# >= 2)) || die "--plan requires a path"; READ_PLAN=$2; shift ;;
    --pid) (($# >= 2)) || die "--pid requires a number"; SELECT_PID=$2; shift ;;
    --confirm-reviewed-every-pid) CONFIRM=1 ;;
    --classify-cgroup) (($# >= 2)) || die "--classify-cgroup requires a flattened cgroup value"; CLASSIFY_CGROUP=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

require_root
require_command ss
require_command sha256sum

proc_start_ticks() {
  local line rest
  line=$(<"/proc/$1/stat")
  rest=${line##*) }
  awk '{print $20}' <<<"$rest"
}

proc_cgroup_flat() {
  sed '/^$/d' "/proc/$1/cgroup" | paste -sd';' -
}

cgroup_is_managed() {
  local cgroup=$1
  [[ "$cgroup" =~ \.service([/;]|$)|\.scope([/;]|$)|/(system|user|machine)\.slice([/;]|$) ]]
}

is_reviewable_root_login_scope() {
  # Permit only root login/session scopes known to outlive an abandoned shell.
  # Service units, containers, non-root sessions, and arbitrary scopes remain
  # managed/excluded. Every v1/v2 controller entry must name the same class.
  local cgroup=$1 entry path matched=0
  local -a entries=()
  IFS=';' read -r -a entries <<<"$cgroup"
  ((${#entries[@]} > 0)) || return 1
  for entry in "${entries[@]}"; do
    [[ "$entry" == *:*:* ]] || return 1
    path=${entry#*:*:}
    if [[ "$path" =~ ^/user\.slice/user-0\.slice/session-[0-9]+\.scope$ ]] || \
       [[ "$path" =~ ^/system\.slice/sshd-session-[A-Za-z0-9_.@:-]+\.scope$ ]]; then
      matched=1
    else
      return 1
    fi
  done
  ((matched == 1))
}

if [[ -n "$CLASSIFY_CGROUP" ]]; then
  if is_reviewable_root_login_scope "$CLASSIFY_CGROUP"; then
    printf 'reviewable-root-login-scope\n'
  elif cgroup_is_managed "$CLASSIFY_CGROUP"; then
    printf 'managed-service-container-or-user-scope\n'
  else
    printf 'unmanaged-root-cgroup\n'
  fi
  exit 0
fi

refresh_ss_snapshot() {
  local ss_error
  ss_error=$(mktemp /tmp/astro-ss-error.XXXXXX)
  if ! SS_SNAPSHOT=$(ss -H -ltnp 2>"$ss_error") || [[ -s "$ss_error" ]]; then
    blocked "TCP listener/process visibility is unavailable; refusing audit/apply"
    sed -n '1,20p' "$ss_error" >&2
    rm -f -- "$ss_error"
    return 1
  fi
  rm -f -- "$ss_error"
}

listeners_for_pid() {
  local pid=$1 endpoint port
  local -a endpoints=()
  while IFS= read -r endpoint; do
    [[ -n "$endpoint" ]] && endpoints+=("$endpoint")
  done < <(
    printf '%s\n' "$SS_SNAPSHOT" \
      | awk -v re="pid=${pid}([,)]|$)" '$0 ~ re {print $4}' \
      | LC_ALL=C sort -u
  )
  ((${#endpoints[@]} > 0)) || return 1
  for endpoint in "${endpoints[@]}"; do
    port=${endpoint##*:}
    [[ "$port" =~ ^[0-9]+$ ]] || return 1
    ((port >= 1024 && port <= 65535)) || return 1
  done
  (IFS=,; printf '%s\n' "${endpoints[*]}")
}

candidate_rows() {
  local pid uid comm cgroup exe cwd cwd_identity hash start ports
  local -a pids=()
  mapfile -t pids < <(
    printf '%s\n' "$SS_SNAPSHOT" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -nu || true
  )
  for pid in "${pids[@]}"; do
    [[ -d "/proc/$pid" ]] || continue
    uid=$(stat -Lc '%u' "/proc/$pid" 2>/dev/null || true)
    [[ "$uid" == 0 ]] || continue
    comm=$(<"/proc/$pid/comm")
    case "$comm" in python|python3|node|npm|pnpm|bun|deno|php|php8.*) ;; *) continue ;; esac
    cgroup=$(proc_cgroup_flat "$pid" 2>/dev/null || true)
    [[ -n "$cgroup" ]] || continue
    if cgroup_is_managed "$cgroup" && ! is_reviewable_root_login_scope "$cgroup"; then
      continue
    fi
    exe=$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)
    # readlink -f drops a deleted cwd; bind the kernel link text plus the still
    # open directory's device:inode through /proc instead.
    cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
    cwd_identity=$(stat -Lc '%d:%i' "/proc/$pid/cwd" 2>/dev/null || true)
    [[ "$exe" == /* && -f "$exe" ]] || continue
    [[ "$cwd" == /* && "$cwd_identity" =~ ^[0-9]+:[0-9]+$ && -d "/proc/$pid/cwd" ]] || continue
    if [[ "$cwd" != *' (deleted)' ]]; then
      [[ -d "$cwd" && "$(realpath -e -- "$cwd" 2>/dev/null || true)" == "$cwd" ]] || continue
    fi
    [[ "$cwd" != *$'\t'* && "$cwd" != *$'\n'* && "$cgroup" != *$'\t'* ]] || continue
    start=$(proc_start_ticks "$pid" 2>/dev/null || true)
    [[ "$start" =~ ^[0-9]+$ ]] || continue
    hash=$(sha256sum "$exe" | awk '{print $1}')
    ports=$(listeners_for_pid "$pid" || true)
    [[ -n "$ports" ]] || continue
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$pid" "$start" "$exe" "$hash" "$comm" "$ports" "$cwd" "$cwd_identity" "$cgroup"
  done
}

refresh_ss_snapshot || exit 2

if [[ -z "$READ_PLAN" ]]; then
  rows=$(candidate_rows)
  if [[ -z "$rows" ]]; then
    info "No root-owned unmanaged all-high-port HTTP-server candidates found."
  else
    printf 'pid\tstart_ticks\texe_path\texe_sha256\tcomm\tlisteners\tcwd_link\tcwd_device_inode\tcgroup\n'
    printf '%s\n' "$rows"
  fi

  if [[ "$MODE" == audit ]]; then
    info "Audit only. Review service ownership, then freeze one PID with --apply --write-plan ... --pid PID."
    exit 0
  fi
  [[ -n "$WRITE_PLAN" && -z "$READ_PLAN" ]] || die "Plan creation requires --write-plan; termination requires --plan"
  [[ "$SELECT_PID" =~ ^[0-9]+$ && "$SELECT_PID" -gt 1 ]] || die "One exact --pid is required for plan creation"
  selected=$(printf '%s\n' "$rows" | awk -F '\t' -v pid="$SELECT_PID" '$1 == pid')
  [[ "$(printf '%s\n' "$selected" | sed '/^$/d' | wc -l)" == 1 ]] || die "Selected PID is absent or duplicated in the candidate inventory"
  require_absolute_path "$WRITE_PLAN" "plan path"
  [[ ! -e "$WRITE_PLAN" && ! -L "$WRITE_PLAN" ]] || die "Refusing to overwrite existing plan"
  plan_parent=$(dirname -- "$WRITE_PLAN")
  [[ -d "$plan_parent" && ! -L "$plan_parent" ]] || die "Plan parent must be a real directory"
  [[ "$(realpath -e -- "$plan_parent")" == "$plan_parent" ]] || die "Plan parent must be canonical"
  [[ "$(stat -Lc '%u:%g' -- "$plan_parent")" == 0:0 ]] || die "Plan parent must be root:root"
  mode_has_group_or_other_write_common "$(file_mode "$plan_parent")" && die "Plan parent must not be group/other-writable"
  umask 077
  {
    printf '# pid\tstart_ticks\texe_path\texe_sha256\tcomm\tlisteners\tcwd_link\tcwd_device_inode\tcgroup\n'
    printf '%s\n' "$selected"
  } >"$WRITE_PLAN"
  chown 0:0 -- "$WRITE_PLAN"
  chmod 0600 "$WRITE_PLAN"
  info "One-PID review plan written: $WRITE_PLAN. No process was signaled."
  exit 0
fi

[[ "$MODE" == apply ]] || die "Termination requires --apply"
[[ -z "$WRITE_PLAN" && -z "$SELECT_PID" ]] || die "--write-plan/--pid cannot be combined with --plan termination"
((CONFIRM == 1)) || die "Missing --confirm-reviewed-every-pid"
require_command python3
python3 -c 'import os, signal; assert hasattr(os, "pidfd_open"); assert hasattr(signal, "pidfd_send_signal")' \
  >/dev/null 2>&1 || die "Python/kernel pidfd support is required for race-resistant signaling"
require_absolute_path "$READ_PLAN" "plan path"
[[ -f "$READ_PLAN" && ! -L "$READ_PLAN" ]] || die "Plan must be a regular non-symlink file"
[[ "$(realpath -e -- "$READ_PLAN")" == "$READ_PLAN" ]] || die "Plan path must be canonical"
[[ "$(stat -Lc '%u:%g:%a:%h' -- "$READ_PLAN")" == 0:0:600:1 ]] || die "Plan must be root:root mode 0600 with one link"

declare -a PLAN_PIDS=() PLAN_STARTS=() PLAN_EXES=() PLAN_HASHES=() PLAN_COMMS=() PLAN_PORTS=() PLAN_CWDS=() PLAN_CWD_IDENTITIES=() PLAN_CGROUPS=()
declare -A SEEN_PID=()
while IFS=$'\t' read -r pid expected_start expected_exe expected_hash expected_comm expected_ports expected_cwd expected_cwd_identity expected_cgroup extra || [[ -n "$pid" ]]; do
  [[ -n "$pid" && "$pid" != \#* ]] || continue
  [[ -z "${extra:-}" ]] || die "Plan row has extra fields"
  [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 1 ]] || die "Unsafe PID in plan"
  [[ -z "${SEEN_PID[$pid]:-}" ]] || die "Duplicate PID in plan: $pid"
  SEEN_PID["$pid"]=1
  [[ "$expected_start" =~ ^[0-9]+$ && "$expected_hash" =~ ^[0-9a-f]{64}$ ]] || die "Malformed identity fields in plan"
  [[ "$expected_exe" == /* && "$expected_cwd" == /* && "$expected_cwd_identity" =~ ^[0-9]+:[0-9]+$ ]] || die "Plan exe/cwd identity must be absolute/well formed"
  case "$expected_comm" in python|python3|node|npm|pnpm|bun|deno|php|php8.*) ;; *) die "Unexpected comm in plan" ;; esac
  [[ -n "$expected_ports" && -n "$expected_cgroup" ]] || die "Plan listener/cgroup fields must be nonempty"
  IFS=',' read -r -a endpoints <<<"$expected_ports"
  prior=
  for endpoint in "${endpoints[@]}"; do
    port=${endpoint##*:}
    [[ "$port" =~ ^[0-9]+$ ]] || die "Malformed listener endpoint in plan"
    ((port >= 1024 && port <= 65535)) || die "Plan contains a non-high listener port"
    [[ -z "$prior" || "$endpoint" > "$prior" ]] || die "Plan listener set is not sorted/unique"
    prior=$endpoint
  done
  if cgroup_is_managed "$expected_cgroup" && ! is_reviewable_root_login_scope "$expected_cgroup"; then
    die "Plan contains a service/container/non-root managed cgroup"
  fi
  PLAN_PIDS+=("$pid"); PLAN_STARTS+=("$expected_start"); PLAN_EXES+=("$expected_exe"); PLAN_HASHES+=("$expected_hash")
  PLAN_COMMS+=("$expected_comm"); PLAN_PORTS+=("$expected_ports"); PLAN_CWDS+=("$expected_cwd"); PLAN_CWD_IDENTITIES+=("$expected_cwd_identity"); PLAN_CGROUPS+=("$expected_cgroup")
done <"$READ_PLAN"

((${#PLAN_PIDS[@]} == 1)) || die "Exactly one PID data row is required per termination invocation"

validate_row() {
  local i=$1 pid=${PLAN_PIDS[$1]} current_exe current_cwd current_cgroup current_ports current_comm
  [[ -d "/proc/$pid" ]] || return 3
  [[ "$(stat -Lc '%u' "/proc/$pid")" == 0 ]] || die "PID $pid is no longer root-owned"
  [[ "$(proc_start_ticks "$pid")" == "${PLAN_STARTS[$i]}" ]] || die "PID $pid was reused/start time changed"
  current_exe=$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)
  [[ "$current_exe" == "${PLAN_EXES[$i]}" && -f "$current_exe" ]] || die "PID $pid executable path changed"
  [[ "$(sha256sum "$current_exe" | awk '{print $1}')" == "${PLAN_HASHES[$i]}" ]] || die "PID $pid executable hash changed"
  current_comm=$(<"/proc/$pid/comm")
  [[ "$current_comm" == "${PLAN_COMMS[$i]}" ]] || die "PID $pid comm changed"
  current_cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
  [[ "$current_cwd" == "${PLAN_CWDS[$i]}" ]] || die "PID $pid cwd link text changed"
  [[ "$(stat -Lc '%d:%i' "/proc/$pid/cwd" 2>/dev/null || true)" == "${PLAN_CWD_IDENTITIES[$i]}" ]] || die "PID $pid cwd device/inode changed"
  if [[ "$current_cwd" != *' (deleted)' ]]; then
    [[ -d "$current_cwd" && "$(realpath -e -- "$current_cwd")" == "$current_cwd" ]] || die "PID $pid cwd is noncanonical"
  fi
  current_cgroup=$(proc_cgroup_flat "$pid")
  [[ "$current_cgroup" == "${PLAN_CGROUPS[$i]}" ]] || die "PID $pid cgroup changed"
  if cgroup_is_managed "$current_cgroup" && ! is_reviewable_root_login_scope "$current_cgroup"; then
    die "PID $pid is now service/container/non-root managed"
  fi
  current_ports=$(listeners_for_pid "$pid" || true)
  [[ "$current_ports" == "${PLAN_PORTS[$i]}" ]] || die "PID $pid listener set changed or includes a non-high port"
}

# Complete validation pass before the banner or any signal.
validation_rc=0
validate_row 0 || validation_rc=$?
if ((validation_rc != 0)); then
  rc=$validation_rc
  if [[ "$rc" == 3 ]]; then
    info "Planned PID is already absent; idempotent no-op"
    exit 0
  fi
  exit "$rc"
fi

# Refresh listener evidence and perform the same full validation immediately
# before acquiring the pidfd. With one row, no earlier process can be signaled.
refresh_ss_snapshot || exit 2
validate_row 0
pid=${PLAN_PIDS[0]}
expected_start=${PLAN_STARTS[0]}
print_apply_banner "PIDFD SIGTERM WILL BE SENT to the one exact, twice-validated unmanaged PID $pid. There is no SIGKILL or automatic restart."
python3 - "$pid" "$expected_start" <<'PY'
import os
import signal
import sys

pid = int(sys.argv[1])
expected = sys.argv[2]
fd = os.pidfd_open(pid, 0)
try:
    with open(f"/proc/{pid}/stat", "r", encoding="ascii") as handle:
        rest = handle.read().rsplit(") ", 1)[1].split()
    if rest[19] != expected:
        raise SystemExit("PID start time changed after pidfd acquisition")
    signal.pidfd_send_signal(fd, signal.SIGTERM, None, 0)
finally:
    os.close(fd)
PY
info "pidfd SIGTERM sent to PID $pid (${PLAN_COMMS[0]}, ${PLAN_PORTS[0]})"

remaining=1
for _ in {1..10}; do
  if [[ ! -d "/proc/$pid" ]] || [[ "$(proc_start_ticks "$pid" 2>/dev/null || true)" != "$expected_start" ]]; then
    remaining=0
    break
  fi
  sleep 1
done
if ((remaining > 0)); then
  blocked "The planned process remains. No SIGKILL attempted; investigate manually."
  exit 2
fi
info "The one signaled process exited. Re-run the default audit and verify expected services."
