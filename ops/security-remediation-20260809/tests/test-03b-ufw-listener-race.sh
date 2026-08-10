#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

TEST_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
PACK_DIR=$(cd "$TEST_DIR/.." && pwd -P)
SCRIPT=$PACK_DIR/03b-remove-stale-ufw-4323.sh
FIXTURE=$(mktemp -d /tmp/astro-ufw-race-test.XXXXXX)
trap 'rm -rf -- "$FIXTURE"' EXIT
install -d -m 0700 "$FIXTURE/bin"

export UFW_CALL_LOG=$FIXTURE/ufw-calls.log
export UFW_DELETE_MARKER=$FIXTURE/ufw-delete-called
export SS_TARGET_COUNT=$FIXTURE/ss-target-count
BACKUP_DIR=$FIXTURE/backup
: >"$UFW_CALL_LOG"
printf '0\n' >"$SS_TARGET_COUNT"

cat >"$FIXTURE/bin/ufw" <<'EOF_UFW'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$UFW_CALL_LOG"
if [[ "$#" -eq 2 && "$1" == status && "$2" == numbered ]]; then
  cat <<'EOF_STATUS'
Status: active
[ 1] 4323/tcp                  ALLOW IN    Anywhere
EOF_STATUS
  exit 0
fi
if [[ "$#" -eq 4 && "$1" == --force && "$2" == delete && "$3" == allow && "$4" == 4323/tcp ]]; then
  touch "$UFW_DELETE_MARKER"
  exit 0
fi
exit 64
EOF_UFW

cat >"$FIXTURE/bin/ss" <<'EOF_SS'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -eq 3 && "$1" == -H && "$2" == -ltn && "$3" == 'sport = :4323' ]]; then
  count=$(<"$SS_TARGET_COUNT")
  count=$((count + 1))
  printf '%s\n' "$count" >"$SS_TARGET_COUNT"
  if ((count == 2)); then
    printf '%s\n' 'LISTEN 0 128 127.0.0.1:4323 0.0.0.0:*'
  fi
  exit 0
fi
if [[ "$#" -eq 2 && "$1" == -H && "$2" == -lntup ]]; then
  printf '%s\n' 'LISTEN 0 128 127.0.0.1:22 0.0.0.0:* users:(("sshd",pid=100,fd=3))'
  exit 0
fi
exit 64
EOF_SS

cat >"$FIXTURE/bin/cp" <<'EOF_CP'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -eq 4 && "$1" == -a && "$2" == -- && "$3" == /etc/ufw ]]; then
  mkdir -p -- "$4"
  exit 0
fi
exit 64
EOF_CP
chmod 0755 "$FIXTURE/bin/ufw" "$FIXTURE/bin/ss" "$FIXTURE/bin/cp"

set +e
PATH="$FIXTURE/bin:$PATH" bash "$SCRIPT" \
  --apply \
  --confirm-owner-recovery-session \
  --confirm-no-service-needs-4323 \
  --backup-dir "$BACKUP_DIR" >"$FIXTURE/run.log" 2>&1
rc=$?
set -e

[[ "$rc" -eq 2 ]] || {
  printf 'expected rc=2, got rc=%s\n' "$rc" >&2
  sed -n '1,200p' "$FIXTURE/run.log" >&2
  exit 1
}
[[ "$(<"$SS_TARGET_COUNT")" == 2 ]]
grep -q '^BLOCKED: TCP 4323 gained a listener after evidence capture; refusing firewall mutation$' "$FIXTURE/run.log"
grep -q '127.0.0.1:4323' "$FIXTURE/run.log"
[[ -f "$BACKUP_DIR/ufw-status-before.txt" ]]
[[ -f "$BACKUP_DIR/listeners-before.txt" ]]
[[ -f "$BACKUP_DIR/ROLLBACK.txt" ]]
[[ ! -e "$UFW_DELETE_MARKER" ]]
! grep -q '^--force delete allow 4323/tcp$' "$UFW_CALL_LOG"

printf 'PASS: a listener appearing after backup blocks the UFW delete\n'
