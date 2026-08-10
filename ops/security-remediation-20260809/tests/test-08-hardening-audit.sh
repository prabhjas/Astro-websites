#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

TEST_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
PACK_DIR=$(cd "$TEST_DIR/.." && pwd -P)
SCRIPT=$PACK_DIR/08-tls-csp-systemd-plan.sh
FIXTURE=$(mktemp -d /tmp/astro-hardening-test.XXXXXX)
trap 'rm -rf -- "$FIXTURE"' EXIT
install -d -m 0700 "$FIXTURE/bin" "$FIXTURE/systemd" "$FIXTURE/system-output"

cat >"$FIXTURE/Caddyfile" <<'EOF_CADDY'
example.test {
  tls {
    protocols tls1.2 tls1.3
  }
  header {
    Content-Security-Policy "default-src 'self'"
    Content-Security-Policy-Report-Only "default-src 'self'"
    Permissions-Policy "camera=()"
  }
}
EOF_CADDY

cat >"$FIXTURE/bin/systemctl" <<'EOF_SYSTEMCTL'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == list-units ]]; then
  if [[ "${LIST_STDERR:-0}" == 1 ]]; then
    printf 'synthetic list-units warning\n' >&2
  fi
  printf '%s\n' 'astro-example.service loaded active running fixture'
  exit 0
fi
[[ "${1:-}" == show ]] || exit 64
property=
for argument in "$@"; do
  case "$argument" in
    --property=*) property=${argument#--property=} ;;
  esac
done
[[ -n "$property" ]] || exit 64
if [[ "${SHOW_STDERR_PROPERTY:-}" == "$property" ]]; then
  printf 'synthetic systemctl warning\n' >&2
fi
case "$property" in
  WorkingDirectory) printf '%s\n' /opt/Astro-production/example ;;
  FragmentPath) printf '%s\n' /etc/systemd/system/astro-example.service ;;
  DropInPaths) printf '%s\n' /etc/systemd/system/astro-example.service.d/security.conf ;;
  ProtectSystem) [[ "${HARDENED:-0}" == 1 ]] && printf '%s\n' strict || printf '%s\n' full ;;
  SystemCallArchitectures) [[ "${HARDENED:-0}" == 1 ]] && printf '%s\n' native || printf '\n' ;;
  CapabilityBoundingSet|AmbientCapabilities) [[ "${HARDENED:-0}" == 1 ]] && printf '\n' || printf '%s\n' CAP_NET_BIND_SERVICE ;;
  UMask) [[ "${HARDENED:-0}" == 1 ]] && printf '%s\n' 0027 || printf '%s\n' 0022 ;;
  *) [[ "${HARDENED:-0}" == 1 ]] && printf '%s\n' yes || printf '%s\n' no ;;
esac
EOF_SYSTEMCTL
chmod 0755 "$FIXTURE/bin/systemctl"
for detection in auditctl augenrules fail2ban-client aide; do
  cp "$FIXTURE/bin/systemctl" "$FIXTURE/bin/$detection"
  chmod 0755 "$FIXTURE/bin/$detection"
done

run_capture() {
  local expected=$1
  local logfile=$2
  shift 2
  local rc
  set +e
  PATH="$FIXTURE/bin:$PATH" ASTRO_SYSTEMCTL="$FIXTURE/bin/systemctl" "$@" >"$logfile" 2>&1
  rc=$?
  set -e
  [[ "$rc" -eq "$expected" ]] || {
    printf 'expected rc=%s, got rc=%s\n' "$expected" "$rc" >&2
    sed -n '1,200p' "$logfile" >&2
    exit 1
  }
}

ln -s "$FIXTURE/Caddyfile" "$FIXTURE/Caddyfile.link"
run_capture 2 "$FIXTURE/symlink.log" \
  bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile.link" --systemd-dir "$FIXTURE/systemd"
grep -q '^BLOCKED: Caddyfile' "$FIXTURE/symlink.log"

run_capture 2 "$FIXTURE/stderr.log" \
  env SHOW_STDERR_PROPERTY=PrivateTmp bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile" --systemd-dir "$FIXTURE/systemd"
grep -q '^BLOCKED: Cannot read effective PrivateTmp' "$FIXTURE/stderr.log"

run_capture 2 "$FIXTURE/list-stderr.log" \
  env LIST_STDERR=1 bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile" --systemd-dir "$FIXTURE/systemd"
grep -q '^BLOCKED: Cannot obtain active systemd inventory' "$FIXTURE/list-stderr.log"

run_capture 3 "$FIXTURE/gaps.log" \
  bash "$SCRIPT" --caddyfile "$FIXTURE/Caddyfile" --systemd-dir "$FIXTURE/systemd"
grep -q '^OPEN: astro-example.service lacks required effective service hardening' "$FIXTURE/gaps.log"
grep -q 'no readiness claim is made' "$FIXTURE/gaps.log"

plan_dir=$FIXTURE/system-output/hardening-plan
run_capture 3 "$FIXTURE/plan.log" \
  env HARDENED=1 bash "$SCRIPT" --apply --output-dir "$plan_dir" --caddyfile "$FIXTURE/Caddyfile" --systemd-dir "$FIXTURE/systemd"
[[ "$(stat -Lc '%u:%g:%a' "$plan_dir")" == 0:0:700 ]]
for artifact in LOCAL-EVIDENCE.txt OWNER-PLAN.md caddy-security-review.caddy.example site-security-hardening.conf.example; do
  [[ "$(stat -Lc '%u:%g:%a' "$plan_dir/$artifact")" == 0:0:600 ]]
done
grep -q '^OPEN: Static header counts do not prove per-site response coverage' "$plan_dir/LOCAL-EVIDENCE.txt"
grep -q '^OPEN: Cloudflare per-zone minimum-TLS evidence' "$plan_dir/LOCAL-EVIDENCE.txt"
! grep -q 'CLOSED:' "$FIXTURE/plan.log"

printf 'PASS: hardening audit blocks incomplete evidence, returns OPEN for material gaps, and privately stages only a non-ready plan\n'
