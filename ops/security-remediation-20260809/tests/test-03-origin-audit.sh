#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

TEST_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
PACK_DIR=$(cd "$TEST_DIR/.." && pwd -P)
SCRIPT=$PACK_DIR/03-origin-and-ufw-plan.sh
FIXTURE=$(mktemp -d /tmp/astro-origin-test.XXXXXX)
trap 'rm -rf -- "$FIXTURE"' EXIT
install -d -m 0700 "$FIXTURE/bin" "$FIXTURE/ufw" "$FIXTURE/system-output"

cat >"$FIXTURE/Caddyfile" <<'EOF_CADDY'
example.test {
  reverse_proxy 127.0.0.1:3000 {
    trusted_proxies static private_ranges
  }
}
EOF_CADDY
printf '%s\n' '*filter' 'COMMIT' >"$FIXTURE/ufw/user.rules"
printf '%s\n' '*filter' 'COMMIT' >"$FIXTURE/ufw/user6.rules"

cat >"$FIXTURE/bin/ufw" <<'EOF_UFW'
#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == status && "${2:-}" == verbose ]] || exit 64
if [[ "${UFW_STDERR:-0}" == 1 ]]; then
  printf 'synthetic ufw warning\n' >&2
fi
if [[ "${UFW_OPEN:-0}" == 1 ]]; then
  cat <<'EOF_STATUS'
Status: active
Default: allow (incoming), allow (outgoing), disabled (routed)
80,443/tcp                ALLOW IN    Anywhere
4323/tcp                  ALLOW IN    Anywhere
EOF_STATUS
else
  cat <<'EOF_STATUS'
Status: active
Default: deny (incoming), allow (outgoing), disabled (routed)
22/tcp                    ALLOW IN    192.0.2.10
EOF_STATUS
fi
EOF_UFW
chmod 0755 "$FIXTURE/bin/ufw"

cat >"$FIXTURE/bin/ss" <<'EOF_SS'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${SS_STDERR:-0}" == 1 ]]; then
  printf 'synthetic ss warning\n' >&2
fi
if [[ "${SS_OPEN:-0}" == 1 ]]; then
  printf '%s\n' \
    'LISTEN 0 128 0.0.0.0:4323 0.0.0.0:*' \
    'LISTEN 0 128 127.0.0.1:3000 0.0.0.0:*'
else
  printf '%s\n' \
    'LISTEN 0 128 0.0.0.0:80 0.0.0.0:*' \
    'LISTEN 0 128 [::]:443 [::]:*' \
    'LISTEN 0 128 127.0.0.1:3000 0.0.0.0:*'
fi
EOF_SS
chmod 0755 "$FIXTURE/bin/ss"

run_capture() {
  local expected=$1
  local logfile=$2
  shift 2
  local rc
  set +e
  PATH="$FIXTURE/bin:$PATH" "$@" >"$logfile" 2>&1
  rc=$?
  set -e
  [[ "$rc" -eq "$expected" ]] || {
    printf 'expected rc=%s, got rc=%s\n' "$expected" "$rc" >&2
    sed -n '1,160p' "$logfile" >&2
    exit 1
  }
}

run_capture 2 "$FIXTURE/missing-caddy.log" \
  bash "$SCRIPT" --caddyfile "$FIXTURE/no-such-caddy" --ufw-dir "$FIXTURE/ufw"
grep -q '^BLOCKED: Caddyfile' "$FIXTURE/missing-caddy.log"

run_capture 2 "$FIXTURE/stderr.log" \
  env SS_STDERR=1 bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile" --ufw-dir "$FIXTURE/ufw"
grep -q '^BLOCKED: TCP listener state' "$FIXTURE/stderr.log"

run_capture 2 "$FIXTURE/ufw-stderr.log" \
  env UFW_STDERR=1 bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile" --ufw-dir "$FIXTURE/ufw"
grep -q '^BLOCKED: ufw runtime status' "$FIXTURE/ufw-stderr.log"

run_capture 3 "$FIXTURE/open.log" \
  env UFW_OPEN=1 SS_OPEN=1 bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile" --ufw-dir "$FIXTURE/ufw"
grep -q '^OPEN: UFW default incoming policy is not deny' "$FIXTURE/open.log"
grep -q '^OPEN: UFW still has an Anywhere ALLOW' "$FIXTURE/open.log"
grep -q '^OPEN: TCP 4323 still has a local listener' "$FIXTURE/open.log"
grep -q 'no readiness claim is made' "$FIXTURE/open.log"

plan_dir=$FIXTURE/system-output/origin-plan
run_capture 3 "$FIXTURE/plan.log" \
  bash "$SCRIPT" --apply --output-dir "$plan_dir" --caddyfile "$FIXTURE/Caddyfile" --ufw-dir "$FIXTURE/ufw"
[[ "$(stat -Lc '%u:%g:%a' "$plan_dir")" == 0:0:700 ]]
[[ "$(stat -Lc '%u:%g:%a' "$plan_dir/LOCAL-EVIDENCE.txt")" == 0:0:600 ]]
[[ "$(stat -Lc '%u:%g:%a' "$plan_dir/OWNER-PLAN.md")" == 0:0:600 ]]
grep -q '^OPEN: Provider-firewall and Cloudflare' "$plan_dir/LOCAL-EVIDENCE.txt"
! grep -q 'CLOSED:' "$FIXTURE/plan.log"

printf 'PASS: origin audit blocks incomplete evidence, returns OPEN for gaps, and privately stages only a non-ready plan\n'
