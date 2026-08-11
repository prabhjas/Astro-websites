#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

TEST_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
REPO_ROOT=$(cd -- "$TEST_DIR/../../.." && pwd -P)
SCRIPT="$REPO_ROOT/scripts/ops/rotate-caddy-ca-no-downtime.sh"
FIXTURE="$TEST_DIR/fixtures/Caddyfile.c01-before"
TEST_TMP=$(mktemp -d /tmp/test-caddy-ca-rotation.XXXXXX)

cleanup() {
  case "$TEST_TMP" in
    /tmp/test-caddy-ca-rotation.*) rm -r -- "$TEST_TMP" ;;
    *) printf 'refusing unsafe test cleanup path: %s\n' "$TEST_TMP" >&2 ;;
  esac
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

assert_eq() {
  local expected=$1
  local actual=$2
  local label=$3
  [[ $actual == "$expected" ]] || fail "$label: expected $expected, got $actual"
}

bash -n "$SCRIPT"
bash "$SCRIPT" --help >/dev/null
if bash "$SCRIPT" --apply >/dev/null 2>&1; then
  fail '--apply succeeded without the explicit expected Caddyfile SHA gate'
fi

# shellcheck source=../../rotate-caddy-ca-no-downtime.sh
source "$SCRIPT"
WORK_DIR="$TEST_TMP"

fixture_sha_before=$(sha256_file "$FIXTURE")
render_all_candidates "$FIXTURE" "$TEST_TMP"
fixture_sha_after=$(sha256_file "$FIXTURE")
assert_eq "$fixture_sha_before" "$fixture_sha_after" 'fixture mutated'

stage=''
for stage in canary wave1 wave2 wave3 final rollback-bridge; do
  candidate="$TEST_TMP/$stage.Caddyfile"
  [[ -s $candidate ]] || fail "$stage candidate missing"
  grep -Fq '# DRIFT-MARKER: this comment and the custom header must survive every transform.' "$candidate" ||
    fail "$stage dropped the drift marker"
  grep -Fq $'\theader X-Fixture-Drift "preserve-this-exactly"' "$candidate" ||
    fail "$stage changed an unrelated live directive"
  caddy adapt --adapter caddyfile --config "$candidate" >/dev/null 2>"$TEST_TMP/$stage.recheck.stderr" ||
    fail "$stage no longer adapts"
done

assert_eq 28 "$(grep -Ec '^[[:space:]]*tls[[:space:]]+internal[[:space:]]*$' "$TEST_TMP/canary.Caddyfile")" 'canary old-local block count'
assert_eq 1 "$(grep -Fc $'\t\t\tca astro_origin_2026' "$TEST_TMP/canary.Caddyfile")" 'canary Astro block count'
assert_eq 10 "$(grep -Fc $'\t\t\tca astro_origin_2026' "$TEST_TMP/wave1.Caddyfile")" 'wave1 Astro block count'
assert_eq 19 "$(grep -Fc $'\t\t\tca astro_origin_2026' "$TEST_TMP/wave2.Caddyfile")" 'wave2 Astro block count'
assert_eq 28 "$(grep -Fc $'\t\t\tca astro_origin_2026' "$TEST_TMP/wave3.Caddyfile")" 'wave3 Astro block count'
assert_eq 0 "$(grep -Ec '^[[:space:]]*tls[[:space:]]+internal[[:space:]]*$' "$TEST_TMP/final.Caddyfile" || true)" 'final old-local block count'
assert_eq 28 "$(grep -Fc $'\t\t\tca astro_origin_2026' "$TEST_TMP/final.Caddyfile")" 'final Astro block count'
assert_eq 56 "$(grep -Fc "/certificates/$ASTRO_CA_ID/" "$TEST_TMP/final.Caddyfile")" 'final Astro manual pair count'
assert_eq 2 "$(grep -Fc "/certificates/$PAYROLL_CA_ID/" "$TEST_TMP/final.Caddyfile")" 'final Payroll manual pair count'
assert_eq 1 "$(grep -Fc 'auto_https ignore_loaded_certs' "$TEST_TMP/final.Caddyfile")" 'final ignore-loaded-certs count'
grep -Fxq '# C-01-REFRESH-SCHEMA: named-internal-manual-v1' "$TEST_TMP/final.Caddyfile" || fail 'final refresh schema marker missing'
grep -Fxq '# C-01-REFRESH-SCHEMA: rollback-local-manual-v1' "$TEST_TMP/rollback-bridge.Caddyfile" || fail 'rollback schema marker missing'
assert_eq 58 "$(grep -Fc '/certificates/local/' "$TEST_TMP/rollback-bridge.Caddyfile")" 'rollback local manual pair count'
assert_eq 29 "$(grep -Fc $'\t\trenewal_window_ratio 0.99' "$TEST_TMP/rollback-bridge.Caddyfile")" 'rollback renewal ratio count'

final_json="$TEST_TMP/final.adapted.json"
assert_eq 56 "$(jq --arg id "$ASTRO_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].module == "internal" and .issuers[0].ca == $id) | .subjects[]] | length' "$final_json")" 'final Astro subject count'
assert_eq 2 "$(jq --arg id "$PAYROLL_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].module == "internal" and .issuers[0].ca == $id) | .subjects[]] | length' "$final_json")" 'final isolated Payroll subject count'
assert_eq 0 "$(jq '[.apps.tls.automation.policies[].issuers[] | select(.module == "internal" and ((.ca // "local") == "local"))] | length' "$final_json")" 'final local issuer count'
assert_eq 58 "$(jq '[.apps.tls.certificates.load_files[]] | length' "$final_json")" 'final manually loaded pair count'
assert_eq 58 "$(jq '[.apps.tls.certificates.automate[]] | length' "$final_json")" 'final forced automation subject count'
assert_eq 56 "$(jq --arg needle "/certificates/$ASTRO_CA_ID/" '[.apps.tls.certificates.load_files[] | select(.certificate | contains($needle))] | length' "$final_json")" 'final Astro storage loader count'
assert_eq 2 "$(jq --arg needle "/certificates/$PAYROLL_CA_ID/" '[.apps.tls.certificates.load_files[] | select(.certificate | contains($needle))] | length' "$final_json")" 'final Payroll storage loader count'

prewarm_json="$TEST_TMP/prewarm.adapted.json"
assert_eq 58 "$(jq '[.apps.tls.automation.policies[].subjects[]] | length' "$prewarm_json")" 'prewarm subject count'
assert_eq 56 "$(jq --arg id "$ASTRO_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].ca == $id) | .subjects[]] | length' "$prewarm_json")" 'prewarm Astro subject count'
assert_eq 2 "$(jq --arg id "$PAYROLL_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].ca == $id) | .subjects[]] | length' "$prewarm_json")" 'prewarm Payroll subject count'
assert_eq 432000000000000 "$(jq --arg id "$ASTRO_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].ca == $id)][0].issuers[0].lifetime' "$prewarm_json")" 'prewarm Astro lifetime'
assert_eq 432000000000000 "$(jq --arg id "$PAYROLL_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].ca == $id)][0].issuers[0].lifetime' "$prewarm_json")" 'prewarm Payroll lifetime'
assert_eq 1 "$(jq '[.apps.http.servers[].listen[] | select(. == "127.0.0.1:9443")] | length' "$prewarm_json")" 'prewarm loopback listener count'
assert_eq 0 "$(jq '[.apps.http.servers[].listen[] | select(. == ":80" or . == ":443")] | length' "$prewarm_json")" 'prewarm production listener count'

# Static guardrails: no restart, Cloudflare mutation, history rewrite, or old
# namespace deletion command belongs in this narrowly scoped script.
! grep -Eq 'systemctl[[:space:]]+restart|service[[:space:]]+caddy[[:space:]]+restart' "$SCRIPT" || fail 'script contains a Caddy restart'
! grep -Eq 'api\.cloudflare\.com|git[[:space:]]+(filter|push)|filter-repo' "$SCRIPT" || fail 'script mutates Cloudflare or Git history'
! grep -Eq 'rm[^#\n]*(pki/authorities/local|certificates/local)' "$SCRIPT" || fail 'script deletes the old local namespace'
grep -Fq -- '--expected-caddyfile-sha256' "$SCRIPT" || fail 'explicit SHA gate missing'
grep -Fq 'atomic_install_live_caddyfile' "$SCRIPT" || fail 'atomic live publication helper missing'
grep -Fq 'rollback_live' "$SCRIPT" || fail 'automatic rollback helper missing'
grep -Fq 'ROLLBACK.REFUSED.CONCURRENT-CHANGE' "$SCRIPT" || fail 'unknown concurrent rollback refusal missing'
grep -Fq 'failed-new-storage' "$SCRIPT" || fail 'failed namespace quarantine missing'
grep -Fq 'rollback-local-manual-v1' "$SCRIPT" || fail 'synchronous rollback bridge missing'
grep -Fq 'wait_for_local_storage_renewal' "$SCRIPT" || fail 'rollback local renewal gate missing'
grep -Fq 'install_and_enable_refresh_support "$expected_current_sha"' "$SCRIPT" || fail 'final refresh-support transaction missing'
grep -Fq 'install_and_enable_refresh_support "$ROLLBACK_BRIDGE_CADDYFILE_SHA256"' "$SCRIPT" || fail 'rollback refresh repin/re-enable missing'
grep -Fq 'snapshot_refresh_artifacts' "$SCRIPT" || fail 'root-private refresh artifact snapshot missing'
grep -Fq 'quiesce_refresh_support_if_present' "$SCRIPT" || fail 'refresh concurrency quiesce gate missing'
grep -Fq '"$CADDY_BINARY" reload --force --config "$adapted_json"' "$SCRIPT" || fail 'exact adapted-JSON reload missing'
! grep -Fq 'systemctl reload "$CADDY_SERVICE"' "$SCRIPT" || fail 'mutable Caddyfile systemd reload remains'
grep -Fq 'verify_local_http_health' "$SCRIPT" || fail 'local application health gate missing'
grep -Fq 'verify_cf_edge_health' "$SCRIPT" || fail 'Cloudflare edge health gate missing'
grep -Fq 'cf-ray=' "$SCRIPT" || fail 'Cloudflare edge identity evidence missing'
grep -Fq 'continuous-direct-health' "$SCRIPT" || fail 'continuous reload health sampler missing'
grep -Fq 'exec 9<>"$LOCK_FILE"' "$SCRIPT" || fail 'non-truncating lock open missing'
! grep -Fq '/run/lock/astro-caddy' "$SCRIPT" || fail 'unsafe world-writable lock parent remains'
grep -Fq 'mktemp -d "$EVIDENCE_BASE/rotation-$stamp.XXXXXXXX"' "$SCRIPT" || fail 'exclusive randomized evidence directory missing'
grep -Fq "$COMPROMISED_INTERMEDIATE_SPKI_SHA256" "$SCRIPT" || fail 'historically exposed intermediate SPKI rejection missing'
grep -Fq 'verify_running_caddy_binary "$BASELINE_MAIN_PID"' "$SCRIPT" || fail 'baseline running-binary gate missing'
grep -Fq 'verify_running_caddy_binary "$current_pid"' "$SCRIPT" || fail 'post-reload running-binary gate missing'
grep -Fq 'readlink -e -- "$proc_exe"' "$SCRIPT" || fail 'running executable canonical-path gate missing'
assert_eq 3 "$(grep -Fc 'sudo -u caddy -H "$CADDY_BINARY" validate' "$SCRIPT")" 'explicit reviewed Caddy validation path count'
! grep -Eq 'sudo -u caddy -H[[:space:]]+caddy[[:space:]]+validate' "$SCRIPT" ||
  fail 'bare Caddy lookup remains under sudo secure_path'
grep -Fq 'job=$(systemctl show "$REFRESH_SERVICE_UNIT" -p Job --value)' "$SCRIPT" ||
  fail 'refresh-service queued-job gate missing'
grep -Fq '[[ $active == inactive && $sub == dead && -z $job ]]' "$SCRIPT" ||
  fail 'refresh-service quiet gate does not require no queued job'
grep -Fq 'SECONDS - quiet_since >= 5' "$SCRIPT" ||
  fail 'refresh-service continuous quiet-window gate missing'
! grep -Eq '(chmod|chown)[[:space:]]+-R' "$SCRIPT" ||
  fail 'failed-storage quarantine contains a recursive metadata mutation'
grep -Fq 'for ((attempt = 1; attempt <= 3; attempt++))' "$SCRIPT" ||
  fail 'Cloudflare edge gate lacks the bounded three-attempt loop'
grep -Fq '((attempt < 3)) && sleep 1' "$SCRIPT" ||
  fail 'Cloudflare edge gate lacks the bounded one-second retry delay'
grep -Fq 'cf_edge_remote_ip_is_external "$remote_ip"' "$SCRIPT" ||
  fail 'Cloudflare edge gate lacks the strict remote-IP predicate'

assert_eq "$REFRESH_HELPER_SOURCE_SHA256" "$(sha256_file "$REFRESH_HELPER_SOURCE")" 'frozen refresh helper hash'
assert_eq "$REFRESH_SERVICE_SOURCE_SHA256" "$(sha256_file "$REFRESH_SERVICE_SOURCE")" 'frozen refresh service hash'
assert_eq "$REFRESH_TIMER_SOURCE_SHA256" "$(sha256_file "$REFRESH_TIMER_SOURCE")" 'frozen refresh timer hash'
assert_eq "$REVIEWED_CADDY_BINARY_SHA256" "$(sha256_file "$CADDY_BINARY")" 'reviewed Caddy binary hash'
assert_eq "$REVIEWED_CADDY_VERSION" "$(caddy version)" 'reviewed Caddy version'

# Every new CA role must reject either historically exposed key, and all four
# new hierarchy keys must be unique even across root/intermediate roles.
safe_spki_1=$(printf '1%.0s' {1..64})
safe_spki_2=$(printf '2%.0s' {1..64})
safe_spki_3=$(printf '3%.0s' {1..64})
safe_spki_4=$(printf '4%.0s' {1..64})
assert_spki_not_historically_exposed "$safe_spki_1" 'fixture root'
if assert_spki_not_historically_exposed "$COMPROMISED_ROOT_SPKI_SHA256" 'fixture intermediate' >/dev/null 2>&1; then
  fail 'historically exposed root SPKI was accepted in an intermediate role'
fi
if assert_spki_not_historically_exposed "$COMPROMISED_INTERMEDIATE_SPKI_SHA256" 'fixture root' >/dev/null 2>&1; then
  fail 'historically exposed intermediate SPKI was accepted in a root role'
fi
assert_four_ca_spkis_pairwise_unique "$safe_spki_1" "$safe_spki_2" "$safe_spki_3" "$safe_spki_4"
if assert_four_ca_spkis_pairwise_unique "$safe_spki_1" "$safe_spki_2" "$safe_spki_1" "$safe_spki_4" >/dev/null 2>&1; then
  fail 'cross-role duplicate CA SPKI was accepted'
fi

# A Caddy-writable top-level symlink must be rejected without moving it or
# changing any metadata below its target.  Invoke it as a plain command in an
# errexit-enabled subshell, matching the production quarantine call context.
external_target="$TEST_TMP/quarantine-external-target"
mkdir -m 0750 "$external_target"
: >"$external_target/sentinel"
chmod 0640 "$external_target/sentinel"
external_metadata_before=$(stat -c '%a:%u:%g:%h:%d:%i' "$external_target")
sentinel_metadata_before=$(stat -c '%a:%u:%g:%h:%d:%i' "$external_target/sentinel")
symlink_source="$TEST_TMP/untrusted-namespace-link"
ln -s "$external_target" "$symlink_source"
CADDY_UID=$(id -u)
CADDY_GID=$(id -g)
EVIDENCE_DIR="$TEST_TMP/quarantine-symlink-evidence"
mkdir -m 0700 "$EVIDENCE_DIR"
set +e
(
  set -Eeuo pipefail
  quarantine_one_failed_path "$symlink_source" symlink-probe
) >/dev/null 2>&1
symlink_quarantine_rc=$?
set -e
[[ $symlink_quarantine_rc -ne 0 ]] || fail 'top-level namespace symlink was accepted for quarantine'
[[ -L $symlink_source ]] || fail 'rejected namespace symlink was moved or replaced'
assert_eq "$external_metadata_before" "$(stat -c '%a:%u:%g:%h:%d:%i' "$external_target")" 'external target directory metadata'
assert_eq "$sentinel_metadata_before" "$(stat -c '%a:%u:%g:%h:%d:%i' "$external_target/sentinel")" 'external target file metadata'
[[ ! -e $EVIDENCE_DIR/failed-new-storage/symlink-probe && ! -L $EVIDENCE_DIR/failed-new-storage/symlink-probe ]] ||
  fail 'rejected namespace symlink appeared in quarantine'

# Each Cloudflare host gets at most three independent attempts.  Two transient
# transport failures must recover without weakening the exact HTTP/IP/cf-ray
# validation, while three failures must still fail closed.
MOCK_EDGE_STATE_DIR="$TEST_TMP/mock-edge-state"
MOCK_EDGE_ALWAYS_FAIL=0
MOCK_EDGE_INVALID_IP=''
mkdir -m 0700 "$MOCK_EDGE_STATE_DIR"
curl() {
  local header_file='' url='' host key count_file count=0
  while (($#)); do
    case $1 in
      -D|-o|-w|--noproxy|--connect-timeout|--max-time)
        [[ $# -ge 2 ]] || return 97
        [[ $1 == -D ]] && header_file=$2
        shift 2
        ;;
      https://*)
        url=$1
        shift
        ;;
      *) shift ;;
    esac
  done
  [[ -n $header_file && $url == https://*/ ]] || return 98
  host=${url#https://}
  host=${host%/}
  key=${host//[^a-zA-Z0-9]/_}
  count_file="$MOCK_EDGE_STATE_DIR/$key.count"
  [[ ! -f $count_file ]] || count=$(<"$count_file")
  count=$((count + 1))
  printf '%s\n' "$count" >"$count_file"
  if [[ $MOCK_EDGE_ALWAYS_FAIL -eq 1 ]]; then
    return 28
  fi
  if [[ -n $MOCK_EDGE_INVALID_IP && $count -eq 1 ]]; then
    printf 'HTTP/2 200\r\ncf-ray: deadbeef-LHR\r\n\r\n' >"$header_file"
    printf '200|%s' "$MOCK_EDGE_INVALID_IP"
    return 0
  fi
  if [[ -z $MOCK_EDGE_INVALID_IP && $count -lt 3 ]]; then
    return 28
  fi
  printf 'HTTP/2 200\r\ncf-ray: deadbeef-LHR\r\n\r\n' >"$header_file"
  printf '200|203.0.113.10'
}
sleep() { :; }

WORK_DIR="$TEST_TMP/edge-retry-work"
mkdir -m 0700 "$WORK_DIR"
edge_retry_record="$TEST_TMP/edge-retry-success.txt"
verify_cf_edge_health "$edge_retry_record"
assert_eq "$EXPECTED_CF_APEX_COUNT" "$(wc -l <"$edge_retry_record")" 'retry edge success record count'
for edge_apex in "${CF_ROLLOUT_ORDER[@]}"; do
  edge_key=${edge_apex//[^a-zA-Z0-9]/_}
  assert_eq 3 "$(<"$MOCK_EDGE_STATE_DIR/$edge_key.count")" "bounded retries for $edge_apex"
done

for invalid_edge_ip in 127.0.0.2 ::ffff:127.0.0.1 0.0.0.0 ::; do
  if cf_edge_remote_ip_is_external "$invalid_edge_ip"; then
    fail "strict edge predicate accepted $invalid_edge_ip"
  fi
  MOCK_EDGE_STATE_DIR="$TEST_TMP/mock-edge-invalid-${invalid_edge_ip//[^a-zA-Z0-9]/_}"
  MOCK_EDGE_INVALID_IP=$invalid_edge_ip
  mkdir -m 0700 "$MOCK_EDGE_STATE_DIR"
  verify_cf_edge_health "$TEST_TMP/edge-invalid-${invalid_edge_ip//[^a-zA-Z0-9]/_}.txt"
  first_edge_key=${CF_ROLLOUT_ORDER[0]//[^a-zA-Z0-9]/_}
  assert_eq 2 "$(<"$MOCK_EDGE_STATE_DIR/$first_edge_key.count")" "retry after invalid edge IP $invalid_edge_ip"
done
cf_edge_remote_ip_is_external 104.16.1.2 || fail 'strict edge predicate rejected a public IPv4 address'
cf_edge_remote_ip_is_external 2606:4700::6810:102 || fail 'strict edge predicate rejected a public IPv6 address'

MOCK_EDGE_STATE_DIR="$TEST_TMP/mock-edge-always-fail-state"
MOCK_EDGE_ALWAYS_FAIL=1
MOCK_EDGE_INVALID_IP=''
mkdir -m 0700 "$MOCK_EDGE_STATE_DIR"
set +e
verify_cf_edge_health "$TEST_TMP/edge-retry-failure.txt" >/dev/null 2>&1
edge_failure_rc=$?
set -e
[[ $edge_failure_rc -ne 0 ]] || fail 'Cloudflare edge gate accepted three consecutive failures'
first_edge_key=${CF_ROLLOUT_ORDER[0]//[^a-zA-Z0-9]/_}
assert_eq 3 "$(<"$MOCK_EDGE_STATE_DIR/$first_edge_key.count")" 'fail-closed edge retry bound'

# Empirical Bash regression: invoking either recovery function through an OR
# list disables `errexit` even inside its explicit `set -e` subshell. Exercise
# the real failure-handler call sites with probes that would leave false-success
# markers if that conditional-context bug is reintroduced.
stop_direct_health_sampler_best_effort() { :; }
stop_prewarm() { :; }
rollback_live() {
  set +e
  (
    set -Eeuo pipefail
    false
    : >"$TEST_TMP/rollback-continued"
  )
  local probe_rc=$?
  [[ $probe_rc -ne 0 ]] || : >"$TEST_TMP/ROLLBACK.FALSE-SUCCESS"
  return "$probe_rc"
}
quarantine_failed_new_storage() {
  set +e
  (
    set -Eeuo pipefail
    false
    : >"$TEST_TMP/quarantine-continued"
  )
  local probe_rc=$?
  [[ $probe_rc -ne 0 ]] || : >"$TEST_TMP/QUARANTINE.FALSE-SUCCESS"
  return "$probe_rc"
}
MODE=apply
EVIDENCE_DIR="$TEST_TMP/failure-handler-evidence"
mkdir -m 0700 "$EVIDENCE_DIR"
set +e
(
  trap - EXIT ERR HUP INT TERM
  handle_failure 77 regression-probe
) >/dev/null 2>&1
handler_rc=$?
set -e
assert_eq 77 "$handler_rc" 'failure handler exit status'
[[ ! -e $TEST_TMP/rollback-continued && ! -e $TEST_TMP/ROLLBACK.FALSE-SUCCESS ]] ||
  fail 'rollback probe continued after a critical failure'
[[ ! -e $TEST_TMP/quarantine-continued && ! -e $TEST_TMP/QUARANTINE.FALSE-SUCCESS ]] ||
  fail 'quarantine probe continued or claimed success after a critical failure'
! grep -Eq 'rollback_live[[:space:]]*(\|\||&&)|quarantine_failed_new_storage[[:space:]]*(\|\||&&)' "$SCRIPT" ||
  fail 'recovery function is invoked in an errexit-disabling AND/OR list'

# A dangling namespace symlink must be rejected, not treated as absent.
ln -s "$TEST_TMP/nonexistent-target" "$TEST_TMP/dangling-namespace"
if assert_path_absent_including_symlink "$TEST_TMP/dangling-namespace" >/dev/null 2>&1; then
  fail 'dangling namespace symlink was accepted as absent'
fi

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck -x "$SCRIPT" "$0"
fi

printf 'PASS: C-01 named-internal canary/waves/final, synchronous rollback bridge, and static safety gates\n'
