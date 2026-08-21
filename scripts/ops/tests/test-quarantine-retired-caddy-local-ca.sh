#!/usr/bin/env bash
# Bounded fixture/static tests.  Never reads or changes live Caddy state.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
HELPER=$(cd -- "$SCRIPT_DIR/.." && pwd)/quarantine-retired-caddy-local-ca.sh
ROTATION_HELPER=$(cd -- "$SCRIPT_DIR/.." && pwd)/rotate-caddy-ca-no-downtime.sh
TRACKED_REFRESH_HELPER=$(cd -- "$SCRIPT_DIR/.." && pwd)/refresh-caddy-loaded-certificates.sh
TRACKED_REFRESH_SERVICE=$(cd -- "$SCRIPT_DIR/.." && pwd)/systemd/astro-caddy-certificate-refresh.service
TRACKED_REFRESH_TIMER=$(cd -- "$SCRIPT_DIR/.." && pwd)/systemd/astro-caddy-certificate-refresh.timer

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

assert_rejected() {
  local label=$1
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$label"
  fi
}

bash -n "$HELPER"

# shellcheck source=/dev/null
source "$HELPER"

[[ $REVIEWED_FINAL_CADDYFILE_SHA256 == 82aaa881339358f3b6b00d555f70ffb55ccd0628dee9598b27a001299c34d076 ]] ||
  fail 'reviewed final Caddyfile SHA changed'
[[ $REVIEWED_REFRESH_HELPER_SHA256 == "$(sha256sum "$TRACKED_REFRESH_HELPER" | awk '{print $1}')" ]] ||
  fail 'pinned refresh helper SHA differs from the frozen artifact'
[[ $REVIEWED_REFRESH_SERVICE_SHA256 == "$(sha256sum "$TRACKED_REFRESH_SERVICE" | awk '{print $1}')" ]] ||
  fail 'pinned refresh service SHA differs from the frozen artifact'
[[ $REVIEWED_REFRESH_TIMER_SHA256 == "$(sha256sum "$TRACKED_REFRESH_TIMER" | awk '{print $1}')" ]] ||
  fail 'pinned refresh timer SHA differs from the frozen artifact'
[[ $MIN_SOAK_SECONDS -eq 259200 && $MAX_SOAK_SECONDS -eq 2592000 ]] ||
  fail 'soak bounds are not exactly 72 hours through 30 days'
[[ $LOCAL_AUTHORITY_SOURCE == /var/lib/caddy/.local/share/caddy/pki/authorities/local ]] ||
  fail 'authority source is not the one exact local path'
[[ $LOCAL_CERTIFICATES_SOURCE == /var/lib/caddy/.local/share/caddy/certificates/local ]] ||
  fail 'certificate source is not the one exact local path'
[[ $APPLY_CONFIRMATION == QUARANTINE-RETIRED-LOCAL-CA-82aaa881-AFTER-SOAK ]] ||
  fail 'apply confirmation token changed'

test_root=$(mktemp -d)
trap 'rm -rf -- "$test_root"' EXIT
WORK_DIR="$test_root/work"
mkdir -m 0700 "$WORK_DIR"

# Evidence paths are lexical, immediate-child, and exact-name constrained before
# any filesystem lookup can be attempted.
validate_evidence_path_string \
  '/opt/deploy-backups/caddy-ca-rotation/rotation-20260810T010203Z.Ab12Cd34'
assert_rejected 'nested evidence path was accepted' validate_evidence_path_string \
  '/opt/deploy-backups/caddy-ca-rotation/nested/rotation-20260810T010203Z.Ab12Cd34'
assert_rejected 'relative evidence path was accepted' validate_evidence_path_string \
  'rotation-20260810T010203Z.Ab12Cd34'
assert_rejected 'malformed evidence suffix was accepted' validate_evidence_path_string \
  '/opt/deploy-backups/caddy-ca-rotation/rotation-20260810T010203Z.short'
assert_rejected 'path traversal evidence was accepted' validate_evidence_path_string \
  '/opt/deploy-backups/caddy-ca-rotation/rotation-20260810T010203Z.Ab12Cd34/..'

valid_evidence='/opt/deploy-backups/caddy-ca-rotation/rotation-20260810T010203Z.Ab12Cd34'
if (
  MODE='audit'; MODE_SEEN=''; ROTATION_EVIDENCE_DIR=''; EXPECTED_CADDYFILE_SHA256=''; CONFIRM_QUARANTINE=''
  parse_args --audit --apply --rotation-evidence-dir "$valid_evidence"
) >/dev/null 2>&1; then
  fail 'conflicting audit/apply modes were accepted'
fi
if (
  MODE='audit'; MODE_SEEN=''; ROTATION_EVIDENCE_DIR=''; EXPECTED_CADDYFILE_SHA256=''; CONFIRM_QUARANTINE=''
  parse_args --rotation-evidence-dir "$valid_evidence" --rotation-evidence-dir "$valid_evidence"
) >/dev/null 2>&1; then
  fail 'duplicate evidence options were accepted'
fi
if (
  MODE='audit'; MODE_SEEN=''; ROTATION_EVIDENCE_DIR=''; EXPECTED_CADDYFILE_SHA256=''; CONFIRM_QUARANTINE=''
  parse_args --audit --rotation-evidence-dir "$valid_evidence" --confirm-quarantine "$APPLY_CONFIRMATION"
) >/dev/null 2>&1; then
  fail 'apply confirmation was accepted in audit mode'
fi

# Soak checks bind canonical content time to marker mtime and enforce both ends.
now_epoch=$(date -u +%s)
success="$test_root/ROTATION.SUCCESS"
write_success_marker() {
  local age=$1
  local epoch=$((now_epoch - age))
  printf 'completed_utc=%s\n' "$(date -u -d "@$epoch" +'%Y-%m-%dT%H:%M:%SZ')" >"$success"
  touch -d "@$epoch" "$success"
  chmod 0600 "$success"
}
write_success_marker "$MIN_SOAK_SECONDS"
validate_success_age "$success" "$now_epoch"
[[ $SOAK_AGE_SECONDS -eq $MIN_SOAK_SECONDS ]] || fail 'minimum accepted soak age was recorded incorrectly'
write_success_marker "$((MIN_SOAK_SECONDS - 1))"
assert_rejected 'under-72-hour rotation soak was accepted' validate_success_age "$success" "$now_epoch"
write_success_marker "$MAX_SOAK_SECONDS"
validate_success_age "$success" "$now_epoch"
write_success_marker "$((MAX_SOAK_SECONDS + 1))"
assert_rejected 'over-30-day rotation evidence was accepted' validate_success_age "$success" "$now_epoch"
write_success_marker "$MIN_SOAK_SECONDS"
touch -d "@$((now_epoch - MIN_SOAK_SECONDS + 60))" "$success"
assert_rejected 'success content/mtime disagreement was accepted' validate_success_age "$success" "$now_epoch"
printf 'unexpected=value\n' >"$success"
touch -d "@$((now_epoch - MIN_SOAK_SECONDS))" "$success"
assert_rejected 'unknown success marker format was accepted' validate_success_age "$success" "$now_epoch"

# Render the exact two-policy/manual-loader final shape and exercise the JSON
# validator without reading /etc/caddy or the admin API.
render_final_fixture() {
  local output=$1
  local apex ca_id host base
  printf '%s\n' "$FINAL_SCHEMA_MARKER" >"$output"
  {
    printf '{\n\tskip_install_trust\n\tauto_https ignore_loaded_certs\n\tpki {\n'
    printf '\t\tca %s {\n' "$ASTRO_CA_ID"
    printf '\t\t\tname "Astro Origin Authority 2026"\n'
    printf '\t\t\troot_cn "Astro Origin Authority 2026 ECC Root"\n'
    printf '\t\t\tintermediate_cn "Astro Origin Authority 2026 ECC Intermediate"\n\t\t}\n'
    printf '\t\tca %s {\n' "$PAYROLL_CA_ID"
    printf '\t\t\tname "Payroll Origin Isolated Authority 2026"\n'
    printf '\t\t\troot_cn "Payroll Origin Isolated Authority 2026 ECC Root"\n'
    printf '\t\t\tintermediate_cn "Payroll Origin Isolated Authority 2026 ECC Intermediate"\n\t\t}\n'
    printf '\t}\n}\n\n'
  } >>"$output"
  for apex in "${CF_APEXES[@]}" "$PAYROLL_APEX"; do
    if [[ $apex == "$PAYROLL_APEX" ]]; then
      ca_id=$PAYROLL_CA_ID
    else
      ca_id=$ASTRO_CA_ID
    fi
    printf '%s, www.%s {\n' "$apex" "$apex" >>"$output"
    printf '\ttls force_automate {\n\t\tissuer internal {\n\t\t\tca %s\n\t\t\tlifetime 120h\n\t\t}\n\t}\n' \
      "$ca_id" >>"$output"
    for host in "$apex" "www.$apex"; do
      base="$CADDY_DATA_ROOT/certificates/$ca_id/$host/$host"
      printf '\ttls %s.crt %s.key\n' "$base" "$base" >>"$output"
    done
    printf '\trespond 204\n}\n\n' >>"$output"
  done
}

final_caddyfile="$test_root/final.Caddyfile"
final_json="$test_root/final.json"
render_final_fixture "$final_caddyfile"
caddy adapt --adapter caddyfile --config "$final_caddyfile" >"$final_json" 2>"$test_root/final.adapt.stderr"
validate_final_config_shape "$final_json"

bad_json="$test_root/bad.json"
jq '.apps.tls.automation.policies[0].issuers[0].ca = "local"' "$final_json" >"$bad_json"
assert_rejected 'local issuer was accepted' validate_final_config_shape "$bad_json"
jq '.apps.pki.certificate_authorities.local = {"install_trust": false}' "$final_json" >"$bad_json"
assert_rejected 'local PKI authority was accepted' validate_final_config_shape "$bad_json"
jq '.apps.tls.certificates.load_files[0].certificate = "/var/lib/caddy/.local/share/caddy/certificates/local/x/x.crt"' \
  "$final_json" >"$bad_json"
assert_rejected 'local manual loader was accepted' validate_final_config_shape "$bad_json"
jq 'del(.apps.tls.certificates.load_files[0])' "$final_json" >"$bad_json"
assert_rejected '57 manual loaders were accepted' validate_final_config_shape "$bad_json"
jq '.apps.tls.automation.policies[0].subjects += ["unknown.example"]' "$final_json" >"$bad_json"
assert_rejected 'unknown automation subject was accepted' validate_final_config_shape "$bad_json"

# Tree manifests reject every non-directory/non-regular type, unsafe metadata,
# symlinks, and hard links.  The generic atomic move/restore primitives are
# exercised only in this isolated temporary fixture.
CADDY_UID=$(id -u)
CADDY_GID=$(id -g)
tree_parent="$test_root/tree-parent"
mkdir -m 0700 "$tree_parent"
tree="$tree_parent/local"
mkdir -m 0700 "$tree"
printf 'fixture\n' >"$tree/item.crt"
chmod 0600 "$tree/item.crt"
manifest="$test_root/tree.manifest"
build_tree_manifest "$tree" "$manifest"
[[ $(wc -l <"$manifest") -eq 2 ]] || fail 'safe fixture tree manifest has the wrong entry count'

many_links="$test_root/many-links"
mkdir -m 0700 "$many_links"
for child in 1 2 3 4 5 6 7 8; do
  mkdir -m 0700 "$many_links/$child"
done
[[ $(stat -c %h "$many_links") -eq 10 ]] || fail 'nlink fixture did not reach 10'
build_tree_manifest "$many_links" "$test_root/many-links.manifest"

ln "$tree/item.crt" "$tree/hardlink.key"
assert_rejected 'hard-linked storage file was accepted' build_tree_manifest "$tree" "$test_root/hardlink.manifest"
rm "$tree/hardlink.key"
ln -s item.crt "$tree/symlink.crt"
assert_rejected 'symlinked storage file was accepted' build_tree_manifest "$tree" "$test_root/symlink.manifest"
rm "$tree/symlink.crt"
external_target="$test_root/external-target"
mkdir -m 0755 "$external_target"
printf 'must-not-change\n' >"$external_target/value"
chmod 0644 "$external_target/value"
external_before=$(stat -c '%u:%g:%a:%h:%d:%i:%Y:%s' "$external_target" "$external_target/value"; \
  sha256sum "$external_target/value")
ln -s "$external_target" "$tree/external-link"
assert_rejected 'external-directory symlink was accepted' \
  build_tree_manifest "$tree" "$test_root/external-symlink.manifest"
external_after=$(stat -c '%u:%g:%a:%h:%d:%i:%Y:%s' "$external_target" "$external_target/value"; \
  sha256sum "$external_target/value")
[[ $external_before == "$external_after" ]] || fail 'symlink rejection changed external-target metadata or content'
rm "$tree/external-link"
chmod 0644 "$tree/item.crt"
assert_rejected 'world-readable storage file was accepted' build_tree_manifest "$tree" "$test_root/mode.manifest"
chmod 0600 "$tree/item.crt"
build_tree_manifest "$tree" "$manifest"

# Replace only the live-state callback for this local fixture.  Production main
# always uses the real rehash function defined in the helper.
rehash_live_effective_fast() { :; }
destination="$test_root/quarantine/local"
mkdir -m 0700 "${destination%/*}"
move_known_tree "$tree" "$destination" "$manifest" fixture
[[ ! -e $tree && -d $destination ]] || fail 'fixture atomic move did not have the expected state'
chmod 0644 "$destination/item.crt"
assert_rejected 'restore accepted a destination that changed after validation' \
  restore_one_known_tree "$tree" "$destination" "$manifest" fixture
chmod 0600 "$destination/item.crt"
restore_one_known_tree "$tree" "$destination" "$manifest" fixture
[[ -d $tree && ! -e $destination ]] || fail 'fixture reverse atomic restore did not have the expected state'
mkdir -m 0700 "$destination"
assert_rejected 'restore would overwrite an unknown source/destination state' \
  restore_one_known_tree "$tree" "$destination" "$manifest" fixture

# Static mutation boundary: the production entrypoint names only the two exact
# sources, never deletes them, never reloads/restarts, and is not auto-invoked.
authority_move_line=$(grep -n 'move_known_tree "$LOCAL_AUTHORITY_SOURCE" "$AUTHORITY_DESTINATION"' "$HELPER" | cut -d: -f1)
certificates_move_line=$(grep -n 'move_known_tree "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_DESTINATION"' "$HELPER" | cut -d: -f1)
[[ $authority_move_line =~ ^[0-9]+$ && $certificates_move_line =~ ^[0-9]+$ && \
   $authority_move_line -lt $certificates_move_line ]] ||
  fail 'authority is not moved before certificates in the apply transaction'
grep -Fq 'mv -T -n -- "$source" "$destination"' "$HELPER" || fail 'no-clobber atomic same-filesystem move primitive is absent'
grep -Fq 'mv -T -n -- "$destination" "$source"' "$HELPER" || fail 'no-clobber atomic reverse restore primitive is absent'
grep -Fq 'run_refresh_audit pre-quarantine' "$HELPER" || fail 'pre-move refresh audit is absent'
grep -Fq 'run_refresh_audit post-quarantine' "$HELPER" || fail 'post-move refresh audit is absent'
grep -Fq 'validate_success_age "$success" "$(date -u +%s)"' "$HELPER" || fail 'evidence age gate is absent'
grep -Fq 'final.live-caddyfile.sha256' "$HELPER" || fail 'final live-Caddyfile evidence hash gate is absent'
grep -Fq 'assert_path_absent "$LOCAL_AUTHORITY_SOURCE"' "$HELPER" || fail 'post-move authority absence gate is absent'
grep -Fq 'assert_path_absent "$LOCAL_CERTIFICATES_SOURCE"' "$HELPER" || fail 'post-move certificate absence gate is absent'
commit_line=$(grep -n "RUN_COMPLETE='true'" "$HELPER" | head -n 1 | cut -d: -f1)
disarm_line=$(grep -n "TRANSACTION_ARMED='false'" "$HELPER" | tail -n 1 | cut -d: -f1)
[[ $commit_line =~ ^[0-9]+$ && $disarm_line =~ ^[0-9]+$ && $commit_line -lt $disarm_line ]] ||
  fail 'success commit is not recorded before rollback disarm'
grep -Fq 'QUARANTINE.SUCCESS.REVOKED-BY-RESTORE' "$HELPER" || fail 'signal-window success revocation is absent'
if grep -Eq '^[[:space:]]*(rm|unlink|shred)[[:space:]].*(pki/authorities/local|certificates/local)' "$HELPER"; then
  fail 'helper deletes retired local CA material'
fi
if grep -Eq '^[[:space:]]*(chmod|chown)[[:space:]].*(-R|--recursive)' "$HELPER"; then
  fail 'helper recursively changes ownership/mode through a potentially symlinked path'
fi
if grep -Eq '^[[:space:]]*(caddy[[:space:]]+reload|systemctl[[:space:]]+(restart|reload|start|stop|try-restart|reload-or-restart))' "$HELPER"; then
  fail 'helper contains a Caddy/service state transition'
fi
if grep -Eqi '(api\.cloudflare\.com|cloudflared|ufw[[:space:]]|iptables|nft[[:space:]]|curl[^\n]*(-X|--request)[[:space:]]*(POST|PUT|PATCH|DELETE))' "$HELPER"; then
  fail 'helper contains a Cloudflare/firewall/mutating HTTP operation'
fi
if grep -Fq 'quarantine-retired-caddy-local-ca' "$ROTATION_HELPER"; then
  fail 'rotation helper automatically references post-soak quarantine'
fi

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck -x "$HELPER" "$0"
fi

printf 'PASS: bounded soak/evidence/config/tree gates, exact atomic retirement, reverse restore, and no live mutation in fixtures.\n'
