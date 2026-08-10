#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
TARGET=$SCRIPT_DIR/05-patch-and-reboot-verifier.sh
TMP_ROOT=$(mktemp -d /tmp/astro-apt-fixture.XXXXXX)
cleanup() {
  case "$TMP_ROOT" in /tmp/astro-apt-fixture.*) rm -rf -- "$TMP_ROOT" ;; esac
}
trap cleanup EXIT

BIN=$TMP_ROOT/bin
PLAN=$TMP_ROOT/plan
BACKUP=$TMP_ROOT/backup
BACKUP_OPEN=$TMP_ROOT/backup-open
BACKUP_LOW=$TMP_ROOT/backup-low-space
LOCK_DIR=$TMP_ROOT/locks
APT_LOG=$TMP_ROOT/apt.log
DF_LOG=$TMP_ROOT/df.log
PACKAGE_ENV_LOG=$TMP_ROOT/package-env.log
APT_APPLIED_MARKER=$TMP_ROOT/apt-applied
mkdir -p -- "$BIN" "$LOCK_DIR"
chmod 0700 -- "$BIN" "$LOCK_DIR"
APT_LOCK_PROBE_FILES="$LOCK_DIR/dpkg-frontend.lock:$LOCK_DIR/dpkg.lock:$LOCK_DIR/apt-lists.lock:$LOCK_DIR/apt-archives.lock"
ROOT_SECRET_SENTINEL=must-not-reach-package-action
PACKAGE_AMBIENT_SENTINEL=must-not-reach-any-package-command
APT_CONFIG=$TMP_ROOT/hostile-ambient-apt.conf
export APT_LOG APT_APPLIED_MARKER APT_LOCK_PROBE_FILES DF_LOG ROOT_SECRET_SENTINEL \
  PACKAGE_AMBIENT_SENTINEL APT_CONFIG PACKAGE_ENV_LOG

cat >"$BIN/apt-get" <<'APTGET'
#!/usr/bin/env bash
set -euo pipefail
printf 'apt-get\tPATH=%s\tAPT_CONFIG=%s\tHOME=%s\tLC_ALL=%s\tDEBIAN_FRONTEND=%s\tNEEDRESTART_MODE=%s\tambient=%s\n' \
  "$PATH" "${APT_CONFIG:-unset}" "${HOME:-unset}" "${LC_ALL:-unset}" \
  "${DEBIAN_FRONTEND:-unset}" "${NEEDRESTART_MODE:-unset}" "${PACKAGE_AMBIENT_SENTINEL:-absent}" >>"$PACKAGE_ENV_LOG"
printf '%s\n' "$*" >>"$APT_LOG"
if [[ "${APT_REMOVE:-0}" == 1 && "$*" == *'-s upgrade'* ]]; then
  printf 'Remv unsafe [1.0]\n0 upgraded, 0 newly installed, 1 to remove and 0 not upgraded.\n'
  exit 0
fi
if [[ "$*" == *'-s upgrade --with-new-pkgs --no-remove'* ]]; then
  if [[ -e "$APT_APPLIED_MARKER" && "${APT_STILL_OPEN:-0}" != 1 ]]; then
    printf '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n'
    exit 0
  fi
  printf 'Inst fixture [1.0] (2.0 fixture-repo)\n1 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n'
  exit 0
fi
if [[ "$*" == *'-y upgrade --with-new-pkgs --no-remove'* ]]; then
  [[ -z "${ROOT_SECRET_SENTINEL:-}" ]] || { printf 'ambient root environment leaked to package action\n' >&2; exit 1; }
  python3 -c 'import fcntl, os, sys
for path in os.environ["APT_LOCK_PROBE_FILES"].split(":"):
    fd=os.open(path, os.O_RDWR)
    try:
        fcntl.lockf(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        continue
    print("serialization lock was not held: " + path, file=sys.stderr)
    sys.exit(1)' || exit 1
  : >"$APT_APPLIED_MARKER"
  printf 'fixture apply complete\n'
  exit 0
fi
exit 64
APTGET

cat >"$BIN/apt-mark" <<'APTMARK'
#!/usr/bin/env bash
set -euo pipefail
printf 'apt-mark\tPATH=%s\tAPT_CONFIG=%s\tHOME=%s\tLC_ALL=%s\tDEBIAN_FRONTEND=%s\tNEEDRESTART_MODE=%s\tambient=%s\n' \
  "$PATH" "${APT_CONFIG:-unset}" "${HOME:-unset}" "${LC_ALL:-unset}" \
  "${DEBIAN_FRONTEND:-unset}" "${NEEDRESTART_MODE:-unset}" "${PACKAGE_AMBIENT_SENTINEL:-absent}" >>"$PACKAGE_ENV_LOG"
case "${1:-}" in
  showhold) [[ -z "${APT_HOLD_TEXT:-}" ]] || printf '%s\n' "$APT_HOLD_TEXT" ;;
  showmanual) printf 'fixture\n' ;;
  *) exit 64 ;;
esac
APTMARK

cat >"$BIN/dpkg" <<'DPKG'
#!/usr/bin/env bash
set -euo pipefail
printf 'dpkg\tPATH=%s\tAPT_CONFIG=%s\tHOME=%s\tLC_ALL=%s\tDEBIAN_FRONTEND=%s\tNEEDRESTART_MODE=%s\tambient=%s\n' \
  "$PATH" "${APT_CONFIG:-unset}" "${HOME:-unset}" "${LC_ALL:-unset}" \
  "${DEBIAN_FRONTEND:-unset}" "${NEEDRESTART_MODE:-unset}" "${PACKAGE_AMBIENT_SENTINEL:-absent}" >>"$PACKAGE_ENV_LOG"
[[ "${1:-}" == --audit ]] || exit 64
[[ -z "${DPKG_AUDIT_TEXT:-}" ]] || printf '%s\n' "$DPKG_AUDIT_TEXT"
DPKG

cat >"$BIN/dpkg-query" <<'DPKGQUERY'
#!/usr/bin/env bash
set -euo pipefail
printf 'dpkg-query\tPATH=%s\tAPT_CONFIG=%s\tHOME=%s\tLC_ALL=%s\tDEBIAN_FRONTEND=%s\tNEEDRESTART_MODE=%s\tambient=%s\n' \
  "$PATH" "${APT_CONFIG:-unset}" "${HOME:-unset}" "${LC_ALL:-unset}" \
  "${DEBIAN_FRONTEND:-unset}" "${NEEDRESTART_MODE:-unset}" "${PACKAGE_AMBIENT_SENTINEL:-absent}" >>"$PACKAGE_ENV_LOG"
if [[ "$*" == *'linux-image-'* ]]; then
  printf 'ii\tlinux-image-1.0\n'
else
  printf 'fixture\t1.0\tii\n'
fi
DPKGQUERY

cat >"$BIN/uname" <<'UNAME'
#!/usr/bin/env bash
case "${1:-}" in
  -r) printf '1.0\n' ;;
  *) printf 'Linux fixture 1.0 #1\n' ;;
esac
UNAME
cat >"$BIN/df" <<'DF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$DF_LOG"
if [[ -n "${DF_LOW_PATH:-}" && "$*" == *"$DF_LOW_PATH"* ]]; then
  printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\n'
  printf 'fixture 1000000 999900 100 100%% %s\n' "$DF_LOW_PATH"
else
  exec /usr/bin/df "$@"
fi
DF
chmod 0755 "$BIN"/*
export PATH=$BIN:/usr/bin:/bin
FIXTURE_ARGS=(--fixture-bin-dir "$BIN")

# Dpkg audit, holds, and any simulated removal must fail before a plan appears.
if DPKG_AUDIT_TEXT=broken bash "$TARGET" "${FIXTURE_ARGS[@]}" --prepare-plan --plan-dir "$TMP_ROOT/audit-bad" >/dev/null 2>&1; then exit 1; fi
if APT_HOLD_TEXT=held bash "$TARGET" "${FIXTURE_ARGS[@]}" --prepare-plan --plan-dir "$TMP_ROOT/hold-bad" >/dev/null 2>&1; then exit 1; fi
if APT_REMOVE=1 bash "$TARGET" "${FIXTURE_ARGS[@]}" --prepare-plan --plan-dir "$TMP_ROOT/removal-bad" >/dev/null 2>&1; then exit 1; fi

bash "$TARGET" "${FIXTURE_ARGS[@]}" --prepare-plan --plan-dir "$PLAN" >/dev/null
digest=$(sed -n 's/^plan_sha256=//p' "$PLAN/PLAN-METADATA.txt")
[[ "$digest" =~ ^[0-9a-f]{64}$ ]] || exit 1

# A wrong reviewed digest must fail before the live APT-shaped command.
if bash "$TARGET" "${FIXTURE_ARGS[@]}" --apply --plan-dir "$PLAN" \
  --reviewed-plan-sha256 0000000000000000000000000000000000000000000000000000000000000000 \
  --confirm-final-reviewed-plan --confirm-provider-snapshot \
  --snapshot-reference fixture-snapshot --confirm-maintenance-window \
  --backup-dir "$BACKUP" --fixture-lock-dir "$LOCK_DIR" >/dev/null 2>&1; then
  exit 1
fi
[[ ! -e "$BACKUP" ]] || exit 1

# Space on /, /var and /boot is checked after locks/final-plan revalidation but
# before backup creation or APT action.
if DF_LOW_PATH=/boot bash "$TARGET" "${FIXTURE_ARGS[@]}" --apply --plan-dir "$PLAN" \
  --reviewed-plan-sha256 "$digest" --confirm-final-reviewed-plan \
  --confirm-provider-snapshot --snapshot-reference fixture-snapshot \
  --confirm-maintenance-window --backup-dir "$BACKUP_LOW" \
  --fixture-lock-dir "$LOCK_DIR" >/dev/null 2>&1; then
  printf 'Low /boot space did not block package action\n' >&2
  exit 1
fi
[[ ! -e "$BACKUP_LOW" && ! -e "$APT_APPLIED_MARKER" ]] || exit 1

# Even after apt-get succeeds, a still-open solver/reboot state must make the
# helper return nonzero rather than swallowing post-verification.
if APT_STILL_OPEN=1 bash "$TARGET" "${FIXTURE_ARGS[@]}" --apply --plan-dir "$PLAN" \
  --reviewed-plan-sha256 "$digest" --confirm-final-reviewed-plan \
  --confirm-provider-snapshot --snapshot-reference fixture-snapshot \
  --confirm-maintenance-window --backup-dir "$BACKUP_OPEN" \
  --fixture-lock-dir "$LOCK_DIR" >/dev/null 2>&1; then
  printf 'Open post-package verification was reported as success\n' >&2
  exit 1
fi
[[ -e "$APT_APPLIED_MARKER" && -d "$BACKUP_OPEN" ]] || exit 1
rm -f -- "$APT_APPLIED_MARKER"

bash "$TARGET" "${FIXTURE_ARGS[@]}" --apply --plan-dir "$PLAN" --reviewed-plan-sha256 "$digest" \
  --confirm-final-reviewed-plan --confirm-provider-snapshot \
  --snapshot-reference fixture-snapshot --confirm-maintenance-window \
  --backup-dir "$BACKUP" --fixture-lock-dir "$LOCK_DIR" >/dev/null

grep -Fqx -- '-y upgrade --with-new-pkgs --no-remove' "$APT_LOG" || exit 1
if grep -q 'full-upgrade\|autoremove\|purge' "$APT_LOG"; then
  printf 'Unsafe APT command appeared in fixture log\n' >&2
  exit 1
fi
[[ -f "$BACKUP/reviewed-plan/APT-SIMULATION.txt" ]] || exit 1
grep -Fqx -- '-Pk -- /' "$DF_LOG" || exit 1
grep -Fqx -- '-Pk -- /var' "$DF_LOG" || exit 1
grep -Fqx -- '-Pk -- /boot' "$DF_LOG" || exit 1
expected_env_suffix=$'PATH='"$BIN"$':/usr/sbin:/usr/bin:/sbin:/bin\tAPT_CONFIG=/dev/null\tHOME=/root\tLC_ALL=C\tDEBIAN_FRONTEND=noninteractive\tNEEDRESTART_MODE=l\tambient=absent'
[[ -s "$PACKAGE_ENV_LOG" ]] || exit 1
while IFS= read -r package_env_row; do
  case "$package_env_row" in
    apt-get$'\t'"$expected_env_suffix"|apt-mark$'\t'"$expected_env_suffix"|dpkg$'\t'"$expected_env_suffix"|dpkg-query$'\t'"$expected_env_suffix") ;;
    *) printf 'Package phase used a divergent/ambient environment: %s\n' "$package_env_row" >&2; exit 1 ;;
  esac
done <"$PACKAGE_ENV_LOG"
! grep -Fq -- "$APT_CONFIG" "$PACKAGE_ENV_LOG" || { printf 'Ambient APT_CONFIG influenced a package phase\n' >&2; exit 1; }
printf 'PASS: identical sanitized package environment, locked digest/action, space gates, open-state nonzero, and --no-remove\n'
