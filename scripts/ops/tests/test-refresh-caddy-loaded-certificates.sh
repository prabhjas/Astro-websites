#!/usr/bin/env bash
# Bounded fixture/static tests; never reads or reloads the live Caddy service.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
HELPER=$(cd -- "$SCRIPT_DIR/.." && pwd)/refresh-caddy-loaded-certificates.sh
SERVICE=$(cd -- "$SCRIPT_DIR/.." && pwd)/systemd/astro-caddy-certificate-refresh.service
TIMER=$(cd -- "$SCRIPT_DIR/.." && pwd)/systemd/astro-caddy-certificate-refresh.timer

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

bash -n "$HELPER"
[[ -f $SERVICE && -f $TIMER ]] || fail 'systemd templates are missing'

mapfile -t subjects < <("$HELPER" --list-subjects)
mapfile -t final_pairs < <("$HELPER" --list-final-storage-pairs)
mapfile -t rollback_pairs < <("$HELPER" --list-rollback-storage-pairs)
[[ ${#subjects[@]} -eq 58 ]] || fail 'subject allowlist is not exactly 58 names'
[[ $(printf '%s\n' "${subjects[@]}" | LC_ALL=C sort -u | wc -l) -eq 58 ]] || fail 'subject allowlist is not unique'
[[ ${#final_pairs[@]} -eq 58 ]] || fail 'final storage inventory is not exactly 58 pairs'
[[ ${#rollback_pairs[@]} -eq 58 ]] || fail 'rollback storage inventory is not exactly 58 pairs'
[[ $(printf '%s\n' "${final_pairs[@]}" | grep -c '/certificates/astro_origin_2026/') -eq 56 ]] ||
  fail 'final inventory does not contain exactly 56 Astro named-CA pairs'
[[ $(printf '%s\n' "${final_pairs[@]}" | grep -c '/certificates/payroll_origin_isolated_2026/') -eq 2 ]] ||
  fail 'final inventory does not contain exactly two Payroll named-CA pairs'
[[ $(printf '%s\n' "${rollback_pairs[@]}" | grep -c '/certificates/local/') -eq 58 ]] ||
  fail 'rollback inventory does not contain exactly 58 local pairs'

# Source only the pure validation functions; main is guarded.
# shellcheck source=/dev/null
source "$HELPER"

[[ $PRE_RELOAD_SERVED_HEADROOM_SECONDS -eq 1800 ]] ||
  fail 'pre-reload served-chain recovery margin is not exactly 30 minutes'
[[ $ASTRO_CERT_HEADROOM_SECONDS -eq 86400 && $PAYROLL_CERT_HEADROOM_SECONDS -eq 86400 ]] ||
  fail 'final storage/post-reload headroom is not exactly 24 hours'
[[ $ROLLBACK_CERT_HEADROOM_SECONDS -eq 345600 ]] ||
  fail 'rollback storage/post-reload headroom is not exactly 96 hours'
[[ $COMPROMISED_INTERMEDIATE_SPKI_SHA256 == a804cdc839f8dcb54ff08f6faf0eed24c1b374c470b8196ebfc6198d779a6b32 ]] ||
  fail 'compromised intermediate-key SPKI denylist changed'

# Both leaked keys are forbidden in every new CA role, and the two durable
# hierarchies must use four pairwise-distinct keys across role boundaries.
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

grep -Fqx '  verify_all_live_chains audit true' "$HELPER" ||
  fail 'read-only audit does not require storage-match/full-headroom live chains'
grep -Fq '[[ $nlink =~ ^[0-9]+$ ]] && ((nlink >= 2))' "$HELPER" ||
  fail 'canonical-directory gate does not accept arbitrary valid nlink counts >=2'
[[ $CADDY_BINARY == /usr/bin/caddy ]] || fail 'reviewed Caddy binary path changed'
[[ $REVIEWED_CADDY_VERSION == 'v2.11.4 h1:XKxkMTgNSizEvKG6QHue6cAsFOteU2qA61w2tKkCWi0=' ]] ||
  fail 'reviewed Caddy version changed'
[[ $REVIEWED_CADDY_BINARY_SHA256 == b7105518e3ed1c0761f232e44fc09345535533c9cb0abf0e12809416c7ac64d9 ]] ||
  fail 'reviewed Caddy binary SHA changed'
grep -Fq 'verify_running_caddy_binary "$BASELINE_MAIN_PID"' "$HELPER" ||
  fail 'refresh baseline does not prove the running Caddy executable'
grep -Fq 'verify_running_caddy_binary "$pid"' "$HELPER" ||
  fail 'refresh post-gates do not preserve the running Caddy executable'
grep -Fq 'readlink -e -- "$proc_exe"' "$HELPER" ||
  fail 'refresh running-executable canonical path gate missing'

test_root=$(mktemp -d)
trap 'rm -rf -- "$test_root"' EXIT
WORK_DIR="$test_root/work"
EVIDENCE_DIR="$test_root/evidence"
mkdir -m 0700 "$WORK_DIR" "$EVIDENCE_DIR"

render_fixture() {
  local schema=$1
  local output=$2
  local apex ca_id cert_path key_path
  if [[ $schema == final ]]; then
    printf '%s\n' "$FINAL_SCHEMA_MARKER" >"$output"
  else
    printf '%s\n' "$ROLLBACK_SCHEMA_MARKER" >"$output"
  fi
  {
    printf '{\n\tskip_install_trust\n\tauto_https ignore_loaded_certs\n'
    if [[ $schema == final ]]; then
      printf '\tpki {\n'
      printf '\t\tca %s {\n' "$ASTRO_CA_ID"
      printf '\t\t\tname "Astro Origin Authority 2026"\n'
      printf '\t\t\troot_cn "Astro Origin Authority 2026 ECC Root"\n'
      printf '\t\t\tintermediate_cn "Astro Origin Authority 2026 ECC Intermediate"\n\t\t}\n'
      printf '\t\tca %s {\n' "$PAYROLL_CA_ID"
      printf '\t\t\tname "Payroll Origin Isolated Authority 2026"\n'
      printf '\t\t\troot_cn "Payroll Origin Isolated Authority 2026 ECC Root"\n'
      printf '\t\t\tintermediate_cn "Payroll Origin Isolated Authority 2026 ECC Intermediate"\n\t\t}\n'
      printf '\t}\n'
    fi
    printf '}\n\n'
  } >>"$output"

  for apex in "${CF_APEXES[@]}" "$PAYROLL_APEX"; do
    printf '%s, www.%s {\n' "$apex" "$apex" >>"$output"
    if [[ $schema == final ]]; then
      if [[ $apex == "$PAYROLL_APEX" ]]; then
        ca_id=$PAYROLL_CA_ID
      else
        ca_id=$ASTRO_CA_ID
      fi
      printf '\ttls force_automate {\n\t\tissuer internal {\n\t\t\tca %s\n\t\t\tlifetime 120h\n\t\t}\n\t}\n' "$ca_id" >>"$output"
      if [[ $apex == "$PAYROLL_APEX" ]]; then
        IFS=$'\t' read -r cert_path key_path < <(payroll_pair_paths "$apex")
      else
        IFS=$'\t' read -r cert_path key_path < <(astro_pair_paths "$apex")
      fi
      printf '\ttls %s %s\n' "$cert_path" "$key_path" >>"$output"
      if [[ $apex == "$PAYROLL_APEX" ]]; then
        IFS=$'\t' read -r cert_path key_path < <(payroll_pair_paths "www.$apex")
      else
        IFS=$'\t' read -r cert_path key_path < <(astro_pair_paths "www.$apex")
      fi
    else
      printf '\ttls force_automate {\n\t\trenewal_window_ratio 0.99\n\t\tissuer internal {\n\t\t\tca local\n\t\t\tlifetime 120h\n\t\t}\n\t}\n' >>"$output"
      IFS=$'\t' read -r cert_path key_path < <(local_pair_paths "$apex")
      printf '\ttls %s %s\n' "$cert_path" "$key_path" >>"$output"
      IFS=$'\t' read -r cert_path key_path < <(local_pair_paths "www.$apex")
    fi
    printf '\ttls %s %s\n\trespond 204\n}\n\n' "$cert_path" "$key_path" >>"$output"
  done
}

final_caddyfile="$test_root/final.Caddyfile"
rollback_caddyfile="$test_root/rollback.Caddyfile"
final_json="$test_root/final.json"
rollback_json="$test_root/rollback.json"
render_fixture final "$final_caddyfile"
render_fixture rollback "$rollback_caddyfile"
caddy adapt --adapter caddyfile --config "$final_caddyfile" >"$final_json" 2>"$test_root/final.adapt.stderr"
caddy adapt --adapter caddyfile --config "$rollback_caddyfile" >"$rollback_json" 2>"$test_root/rollback.adapt.stderr"

[[ $(read_refresh_schema "$final_caddyfile") == final ]] || fail 'final marker was not recognized'
[[ $(read_refresh_schema "$rollback_caddyfile") == rollback ]] || fail 'rollback marker was not recognized'
mixed_caddyfile="$test_root/mixed.Caddyfile"
cp "$final_caddyfile" "$mixed_caddyfile"
printf '%s\n' "$ROLLBACK_SCHEMA_MARKER" >>"$mixed_caddyfile"
if read_refresh_schema "$mixed_caddyfile" >/dev/null 2>&1; then
  fail 'mixed schema markers were accepted'
fi

ACTIVE_SCHEMA=final
validate_recognized_config_shape "$final_json"
ACTIVE_SCHEMA=rollback
validate_recognized_config_shape "$rollback_json"

bad_final="$test_root/bad-final.json"
jq '.apps.tls.automation.policies[0].issuers[0].ca = "local"' "$final_json" >"$bad_final"
ACTIVE_SCHEMA=final
if validate_recognized_config_shape "$bad_final" >/dev/null 2>&1; then
  fail 'final schema accepted a local issuer'
fi
jq '.apps.tls.certificates.load_files += [.apps.tls.certificates.load_files[0]]' "$final_json" >"$bad_final"
if validate_recognized_config_shape "$bad_final" >/dev/null 2>&1; then
  fail 'final schema accepted an extra manual-loader pair'
fi

bad_rollback="$test_root/bad-rollback.json"
jq '.apps.tls.automation.policies[0].renewal_window_ratio = 0.5' "$rollback_json" >"$bad_rollback"
ACTIVE_SCHEMA=rollback
if validate_recognized_config_shape "$bad_rollback" >/dev/null 2>&1; then
  fail 'rollback schema accepted the wrong renewal window'
fi
jq --arg id "$ASTRO_CA_ID" '.apps.tls.automation.policies[0].issuers[0].ca = $id' "$rollback_json" >"$bad_rollback"
if validate_recognized_config_shape "$bad_rollback" >/dev/null 2>&1; then
  fail 'rollback schema accepted the durable Astro issuer'
fi

# Generate a small isolated chain to exercise metadata, hostname, chain,
# validity-headroom, and certificate/private-key SPKI checks.
pki="$test_root/pki"
mkdir -m 0700 "$pki"
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$pki/root.key" >/dev/null 2>&1
openssl req -new -x509 -key "$pki/root.key" -sha256 -days 365 -subj '/CN=Fixture Root' \
  -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -out "$pki/root.crt" >/dev/null 2>&1
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$pki/intermediate.key" >/dev/null 2>&1
openssl req -new -key "$pki/intermediate.key" -subj '/CN=Fixture Intermediate' -out "$pki/intermediate.csr" >/dev/null 2>&1
openssl x509 -req -in "$pki/intermediate.csr" -CA "$pki/root.crt" -CAkey "$pki/root.key" -CAcreateserial \
  -sha256 -days 180 -extfile <(printf '%s\n' 'basicConstraints=critical,CA:TRUE,pathlen:0' 'keyUsage=critical,keyCertSign,cRLSign') \
  -out "$pki/intermediate.crt" >/dev/null 2>&1
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$pki/fixture.example.key" >/dev/null 2>&1
openssl req -new -key "$pki/fixture.example.key" -subj '/CN=fixture.example' -out "$pki/leaf.csr" >/dev/null 2>&1
openssl x509 -req -in "$pki/leaf.csr" -CA "$pki/intermediate.crt" -CAkey "$pki/intermediate.key" -CAcreateserial \
  -sha256 -days 30 -extfile <(printf '%s\n' 'basicConstraints=critical,CA:FALSE' 'keyUsage=critical,digitalSignature,keyEncipherment' 'extendedKeyUsage=serverAuth' 'subjectAltName=DNS:fixture.example') \
  -out "$pki/leaf.crt" >/dev/null 2>&1
cp "$pki/leaf.crt" "$pki/fixture.example.crt"
openssl x509 -in "$pki/intermediate.crt" >>"$pki/fixture.example.crt"
chmod 0600 "$pki"/*
fixture_uid=$(id -u)
fixture_gid=$(id -g)
validate_leaf_pair astro fixture.example "$pki/fixture.example.crt" "$pki/fixture.example.key" \
  "$pki/root.crt" "$pki/intermediate.crt" 3600 "$fixture_uid" "$fixture_gid" >/dev/null

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$pki/wrong.key" >/dev/null 2>&1
chmod 0600 "$pki/wrong.key"
if validate_leaf_pair astro fixture.example "$pki/fixture.example.crt" "$pki/wrong.key" \
    "$pki/root.crt" "$pki/intermediate.crt" 3600 "$fixture_uid" "$fixture_gid" >/dev/null 2>&1; then
  fail 'mismatched private key was accepted'
fi
if validate_leaf_pair astro wrong.example "$pki/fixture.example.crt" "$pki/fixture.example.key" \
    "$pki/root.crt" "$pki/intermediate.crt" 3600 "$fixture_uid" "$fixture_gid" >/dev/null 2>&1; then
  fail 'wrong certificate hostname was accepted'
fi
if validate_leaf_pair astro fixture.example "$pki/fixture.example.crt" "$pki/fixture.example.key" \
    "$pki/root.crt" "$pki/intermediate.crt" 31536000 "$fixture_uid" "$fixture_gid" >/dev/null 2>&1; then
  fail 'insufficient validity headroom was accepted'
fi
ln -s "$pki/fixture.example.crt" "$pki/link.crt"
if validate_leaf_pair astro fixture.example "$pki/link.crt" "$pki/fixture.example.key" \
    "$pki/root.crt" "$pki/intermediate.crt" 3600 "$fixture_uid" "$fixture_gid" >/dev/null 2>&1; then
  fail 'symlink certificate path was accepted'
fi

# Static mutation boundary and unit hardening checks.
[[ $(grep -Ec '^[[:space:]]*"\$CADDY_BINARY"[[:space:]]+reload[[:space:]]+--force[[:space:]]+--config[[:space:]]+"\$validated_json"[[:space:]]+--address[[:space:]]+' "$HELPER") -eq 1 ]] ||
  fail 'helper must contain exactly one graceful reload call'
if grep -Eq '^[[:space:]]*systemctl[[:space:]]+(restart|start|stop|try-restart|reload-or-restart)' "$HELPER"; then
  fail 'helper contains a forbidden service state transition'
fi
if grep -Eq '^[[:space:]]*systemctl[[:space:]]+reload' "$HELPER"; then
  fail 'helper must not ask systemd to re-read the mutable live Caddyfile'
fi
if grep -Eq '^[[:space:]]*(rm|unlink|shred)[[:space:]]' "$HELPER"; then
  fail 'helper contains a deletion command'
fi
if grep -Eqi '(api\.cloudflare\.com|cloudflared|ufw[[:space:]]|iptables|nft[[:space:]]|curl[^\n]*(-X|--request)[[:space:]]*(POST|PUT|PATCH|DELETE))' "$HELPER"; then
  fail 'helper contains a Cloudflare/firewall/mutating HTTP operation'
fi
grep -Fq "grep -Eiq '^cf-ray:" "$HELPER" ||
  fail 'Cloudflare edge gate does not require a nonempty cf-ray response header'
grep -Fqx 'NoNewPrivileges=yes' "$SERVICE" || fail 'service lacks NoNewPrivileges'
grep -Fqx 'Requisite=caddy.service' "$SERVICE" || fail 'service could implicitly start an inactive Caddy service'
if grep -Fqx 'Requires=caddy.service' "$SERVICE"; then
  fail 'service contains start-propagating Requires instead of fail-closed Requisite'
fi
grep -Fqx 'ProtectSystem=strict' "$SERVICE" || fail 'service lacks strict filesystem protection'
grep -Eq '^ReadOnlyPaths=/usr/bin/caddy([[:space:]]|$)' "$SERVICE" ||
  fail 'service does not explicitly mount the reviewed Caddy binary read-only'
grep -Fqx 'UMask=0077' "$SERVICE" || fail 'service lacks root-private umask'
grep -Fqx 'RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6 AF_NETLINK' "$SERVICE" ||
  fail 'service cannot execute the AF_NETLINK-based listener gate'
grep -Fq 'ss -H -lntup "sport = :$port"' "$HELPER" ||
  fail 'listener invariant does not preserve both TCP and UDP/QUIC sockets'
grep -Fqx 'OnCalendar=daily' "$TIMER" || fail 'timer is not daily'
grep -Eq '^RandomizedDelaySec=[1-9]' "$TIMER" || fail 'timer lacks randomized delay'
grep -Fqx 'Persistent=true' "$TIMER" || fail 'timer is not persistent'
grep -Fq -- '--confirm-reload RELOAD-VALIDATED-C01-CERTIFICATES' "$SERVICE" ||
  fail 'service lacks explicit reload confirmation'

printf 'PASS: two exact schemas, 58 pairs, crypto/path gates, graceful-only mutation boundary, and timer hardening.\n'
