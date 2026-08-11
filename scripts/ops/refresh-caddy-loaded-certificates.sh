#!/usr/bin/env bash
# C-01 daily refresh for the final, reviewed Caddy manual-certificate loaders.
#
# No arguments (or --audit) are read-only.  --reload performs exactly one
# graceful Caddy admin reload of the already validated JSON, and only after every file,
# certificate, configuration, service, listener, application, and TLS gate has
# passed.  This helper never writes the live Caddyfile or certificate storage,
# never restarts/stops Caddy, and never deletes anything.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

readonly LIVE_CADDYFILE='/etc/caddy/Caddyfile'
readonly EXPECTED_CADDYFILE_SHA_FILE='/etc/caddy/c01-manual-cert-refresh.expected-sha256'
readonly CADDY_SERVICE='caddy.service'
readonly CADDY_BINARY='/usr/bin/caddy'
readonly REVIEWED_CADDY_VERSION='v2.11.4 h1:XKxkMTgNSizEvKG6QHue6cAsFOteU2qA61w2tKkCWi0='
readonly REVIEWED_CADDY_BINARY_SHA256='b7105518e3ed1c0761f232e44fc09345535533c9cb0abf0e12809416c7ac64d9'
readonly CADDY_ADMIN_URL='http://127.0.0.1:2019'
readonly CADDY_DATA_ROOT='/var/lib/caddy/.local/share/caddy'
readonly ASTRO_CA_ID='astro_origin_2026'
readonly PAYROLL_CA_ID='payroll_origin_isolated_2026'
readonly FORBIDDEN_TRANSITION_CA_ID='astro_origin_transition_2026'
readonly LOCAL_CA_ID='local'
readonly FINAL_SCHEMA_MARKER='# C-01-REFRESH-SCHEMA: named-internal-manual-v1'
readonly ROLLBACK_SCHEMA_MARKER='# C-01-REFRESH-SCHEMA: rollback-local-manual-v1'
readonly PAYROLL_APEX='payrollmiddleast.org'
readonly ASTRO_POLICY_LIFETIME_NS='432000000000000'
readonly PAYROLL_POLICY_LIFETIME_NS='432000000000000'
readonly ROLLBACK_POLICY_LIFETIME_NS='432000000000000'
readonly ROLLBACK_RENEWAL_WINDOW_RATIO='0.99'
readonly COMPROMISED_ROOT_SPKI_SHA256='01255cc20dbb7f6842821121d5566f23871c5d912b712b458a6681fa323c38c5'
readonly COMPROMISED_INTERMEDIATE_SPKI_SHA256='a804cdc839f8dcb54ff08f6faf0eed24c1b374c470b8196ebfc6198d779a6b32'
readonly ASTRO_CERT_HEADROOM_SECONDS='86400' # 24 hours
readonly PAYROLL_CERT_HEADROOM_SECONDS='86400' # 24 hours
readonly ROLLBACK_CERT_HEADROOM_SECONDS='345600' # 96 hours
readonly PRE_RELOAD_SERVED_HEADROOM_SECONDS='1800' # 30 minutes to complete a guarded reload
readonly CONFIG_CONVERGENCE_SECONDS='30'
readonly LOCK_DIR='/run/astro-caddy-certificate-refresh'
readonly LOCK_FILE="$LOCK_DIR/refresh.lock"
readonly EVIDENCE_BASE='/var/lib/astro-caddy-certificate-refresh/evidence'
readonly RELOAD_CONFIRMATION='RELOAD-VALIDATED-C01-CERTIFICATES'
readonly EXPECTED_SITE_COUNT='29'
readonly EXPECTED_SUBJECT_COUNT='58'
readonly EXPECTED_CF_SITE_COUNT='28'
readonly EXPECTED_CF_SUBJECT_COUNT='56'

readonly -a CF_APEXES=(
  'c-uae.com'
  'cbss.ae'
  'connectfm.ae'
  'connectfreelance.ae'
  'connectfz.com'
  'connectgroup.co'
  'connecthr.ae'
  'connectresources.ae'
  'connectresources.sa'
  'connectresourcesint.com'
  'connectstaff.ae'
  'emiratiguard.com'
  'emiratisationgate.org'
  'emiratisationgateway.com'
  'eormiddleast.com'
  'evolutionmiddleast.com'
  'freelancerdxb.com'
  'iberiaeor.com'
  'iberiaworkforce.com'
  'kinzahr.com'
  'kpmpro.ae'
  'ngmanpower.com'
  'peomiddleast.com'
  'pittant.com'
  'redo.ae'
  'royalvisa.ae'
  'spheavyrental.ae'
  'thefreelancergate.com'
)

MODE='audit'
CONFIRM_RELOAD=''
EXPECTED_CADDYFILE_SHA256=''
EXPECTED_CONFIG_SHA256=''
BASELINE_MAIN_PID=''
BASELINE_NRESTARTS=''
BASELINE_LISTENERS_FILE=''
CADDY_UID=''
CADDY_GID=''
WORK_DIR=''
EVIDENCE_DIR=''
RUN_COMPLETE='false'
ACTIVE_SCHEMA=''
INITIAL_SCHEMA=''

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  log "ERROR: $*" >&2
  return 1
}

usage() {
  cat <<'USAGE'
Usage:
  refresh-caddy-loaded-certificates.sh
  refresh-caddy-loaded-certificates.sh --audit
  refresh-caddy-loaded-certificates.sh \
    --reload --confirm-reload RELOAD-VALIDATED-C01-CERTIFICATES
  refresh-caddy-loaded-certificates.sh --list-subjects
  refresh-caddy-loaded-certificates.sh --list-final-storage-pairs
  refresh-caddy-loaded-certificates.sh --list-rollback-storage-pairs

Audit mode validates without changing Caddy. Reload mode is intended for the
reviewed systemd timer and performs one graceful reload only after all preflight
gates pass. The live Caddyfile SHA must equal the root-owned pinned SHA file.
Only the exact named-internal final marker or exact rollback-local bridge marker
is accepted; every unmarked, mixed, or unknown schema is refused.
USAGE
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

sha256_file() {
  sha256sum -- "$1" | awk '{print $1}'
}

canonical_json_sha256() {
  jq -cS . "$1" | sha256sum | awk '{print $1}'
}

emit_cf_subjects() {
  local apex
  for apex in "${CF_APEXES[@]}"; do
    printf '%s\nwww.%s\n' "$apex" "$apex"
  done | LC_ALL=C sort
}

emit_expected_subjects() {
  {
    emit_cf_subjects
    printf '%s\nwww.%s\n' "$PAYROLL_APEX" "$PAYROLL_APEX"
  } | LC_ALL=C sort
}

astro_pair_paths() {
  local host=$1
  local base="$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID/$host/$host"
  printf '%s\t%s\n' "$base.crt" "$base.key"
}

payroll_pair_paths() {
  local host=$1
  local base="$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID/$host/$host"
  printf '%s\t%s\n' "$base.crt" "$base.key"
}

local_pair_paths() {
  local host=$1
  local base="$CADDY_DATA_ROOT/certificates/$LOCAL_CA_ID/$host/$host"
  printf '%s\t%s\n' "$base.crt" "$base.key"
}

emit_final_storage_pairs() {
  local host
  while IFS= read -r host; do
    astro_pair_paths "$host"
  done < <(emit_cf_subjects)
  for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
    payroll_pair_paths "$host"
  done
}

emit_rollback_storage_pairs() {
  local host
  while IFS= read -r host; do
    local_pair_paths "$host"
  done < <(emit_expected_subjects)
}

emit_expected_storage_pairs() {
  case $ACTIVE_SCHEMA in
    final) emit_final_storage_pairs ;;
    rollback) emit_rollback_storage_pairs ;;
    *) die 'cannot emit storage paths for an unrecognized refresh schema' ;;
  esac
}

assert_canonical_directory() {
  local path=$1
  local allowed_uids=$2
  local required_gid=${3:-}
  local required_mode=${4:-}
  [[ -d $path && ! -L $path ]] || { die "$path must be a non-symlink directory"; return 1; }
  [[ $(readlink -e -- "$path") == "$path" ]] || { die "$path is not canonical"; return 1; }
  local uid gid mode nlink mode_value
  IFS=: read -r uid gid mode nlink < <(stat -c '%u:%g:%a:%h' -- "$path")
  case ":$allowed_uids:" in
    *":$uid:"*) ;;
    *) die "$path has unexpected owner uid=$uid"; return 1 ;;
  esac
  [[ $mode =~ ^[0-7]{3,4}$ ]] || { die "$path has invalid mode $mode"; return 1; }
  mode_value=$((8#$mode))
  (( (mode_value & 0022) == 0 )) || { die "$path is group/other writable (mode $mode)"; return 1; }
  [[ $nlink =~ ^[0-9]+$ ]] && ((nlink >= 2)) || { die "$path has unsafe directory link count $nlink"; return 1; }
  [[ -z $required_gid || $gid == "$required_gid" ]] ||
    { die "$path has gid=$gid; expected $required_gid"; return 1; }
  [[ -z $required_mode || $mode == "$required_mode" ]] ||
    { die "$path has mode=$mode; expected $required_mode"; return 1; }
}

assert_exact_regular_file() {
  local path=$1
  local required_uid=$2
  local required_gid=$3
  local required_mode=$4
  [[ -f $path && ! -L $path ]] || { die "$path must be a non-symlink regular file"; return 1; }
  [[ $(readlink -e -- "$path") == "$path" ]] || { die "$path is not canonical"; return 1; }
  local uid gid mode nlink
  IFS=: read -r uid gid mode nlink < <(stat -c '%u:%g:%a:%h' -- "$path")
  [[ $uid == "$required_uid" && $gid == "$required_gid" && $mode == "$required_mode" && $nlink == 1 ]] ||
    { die "$path metadata is $uid:$gid:$mode:$nlink; expected $required_uid:$required_gid:$required_mode:1"; return 1; }
}

ensure_root_private_directory() {
  local path=$1
  if [[ ! -e $path && ! -L $path ]]; then
    install -d -o root -g root -m 0700 -- "$path"
  fi
  assert_canonical_directory "$path" 0 0 700
}

acquire_lock() {
  assert_canonical_directory / 0 >/dev/null
  assert_canonical_directory /run 0 >/dev/null
  ensure_root_private_directory "$LOCK_DIR"
  if [[ ! -e $LOCK_FILE && ! -L $LOCK_FILE ]]; then
    install -o root -g root -m 0600 /dev/null "$LOCK_FILE"
  fi
  assert_exact_regular_file "$LOCK_FILE" 0 0 600
  exec 9<>"$LOCK_FILE"
  flock -n 9 || die 'another Caddy certificate refresh holds the lock'
}

create_evidence_directory() {
  assert_canonical_directory / 0 >/dev/null
  assert_canonical_directory /var 0 >/dev/null
  assert_canonical_directory /var/lib 0 >/dev/null
  local state_root=${EVIDENCE_BASE%/evidence}
  ensure_root_private_directory "$state_root"
  ensure_root_private_directory "$EVIDENCE_BASE"
  local stamp
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  EVIDENCE_DIR=$(mktemp -d "$EVIDENCE_BASE/refresh-$stamp.XXXXXXXX")
  WORK_DIR=$EVIDENCE_DIR
  assert_canonical_directory "$EVIDENCE_DIR" 0 0 700
  BASELINE_LISTENERS_FILE="$EVIDENCE_DIR/listeners.before.txt"
  install -o root -g root -m 0600 /dev/null "$EVIDENCE_DIR/run.log"
  exec > >(tee -a "$EVIDENCE_DIR/run.log") 2>&1
}

mark_failed() {
  local rc=$?
  if [[ -n $EVIDENCE_DIR && -d $EVIDENCE_DIR && $RUN_COMPLETE != true ]]; then
    printf 'failed_utc=%s\nexit_status=%s\nmode=%s\n' \
      "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$rc" "$MODE" >"$EVIDENCE_DIR/FAILED"
    chmod 0600 "$EVIDENCE_DIR/FAILED"
  fi
  return "$rc"
}

exit_for_signal() {
  local rc=$1
  trap - HUP INT TERM
  exit "$rc"
}

resolve_caddy_identity() {
  CADDY_UID=$(id -u caddy)
  CADDY_GID=$(id -g caddy)
  [[ $CADDY_UID =~ ^[1-9][0-9]*$ && $CADDY_GID =~ ^[1-9][0-9]*$ ]] ||
    die 'caddy service identity is invalid'
}

verify_reviewed_caddy_binary() {
  assert_canonical_directory / 0 >/dev/null
  assert_canonical_directory /usr 0 >/dev/null
  assert_canonical_directory /usr/bin 0 >/dev/null
  assert_exact_regular_file "$CADDY_BINARY" 0 0 755
  [[ $(sha256_file "$CADDY_BINARY") == "$REVIEWED_CADDY_BINARY_SHA256" ]] ||
    die 'installed Caddy binary hash differs from the reviewed build'
  [[ $("$CADDY_BINARY" version) == "$REVIEWED_CADDY_VERSION" ]] ||
    die 'installed Caddy version differs from the reviewed build'
}

verify_running_caddy_binary() {
  local pid=$1
  local proc_exe="/proc/$pid/exe"
  [[ -L $proc_exe ]] || die "Caddy MainPID $pid has no executable link"
  [[ $(readlink -e -- "$proc_exe") == "$CADDY_BINARY" ]] ||
    die "Caddy MainPID $pid is not running the reviewed non-deleted binary"
  [[ $(sha256_file "$proc_exe") == "$REVIEWED_CADDY_BINARY_SHA256" ]] ||
    die "Caddy MainPID $pid executable bytes differ from the reviewed build"
}

assert_storage_ancestry() {
  local path
  for path in / /var /var/lib; do
    assert_canonical_directory "$path" 0 >/dev/null
  done
  for path in \
    /var/lib/caddy \
    /var/lib/caddy/.local \
    /var/lib/caddy/.local/share \
    "$CADDY_DATA_ROOT" \
    "$CADDY_DATA_ROOT/certificates" \
    "$CADDY_DATA_ROOT/pki" \
    "$CADDY_DATA_ROOT/pki/authorities"; do
    assert_canonical_directory "$path" "0:$CADDY_UID" >/dev/null
  done
  case $ACTIVE_SCHEMA in
    final)
      assert_canonical_directory "$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID" "$CADDY_UID" "$CADDY_GID" 700
      assert_canonical_directory "$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID" "$CADDY_UID" "$CADDY_GID" 700
      assert_canonical_directory "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID" "$CADDY_UID" "$CADDY_GID" 700
      assert_canonical_directory "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID" "$CADDY_UID" "$CADDY_GID" 700
      ;;
    rollback)
      assert_canonical_directory "$CADDY_DATA_ROOT/certificates/$LOCAL_CA_ID" "$CADDY_UID" "$CADDY_GID" 700
      assert_canonical_directory "$CADDY_DATA_ROOT/pki/authorities/$LOCAL_CA_ID" "$CADDY_UID" "$CADDY_GID" 700
      ;;
    *) die 'storage ancestry requested for an unrecognized refresh schema' ;;
  esac
}

public_spki_sha256_from_cert() {
  timeout 5 openssl x509 -in "$1" -noout -pubkey |
    timeout 5 openssl pkey -pubin -outform DER 2>/dev/null |
    sha256sum | awk '{print $1}'
}

public_spki_sha256_from_key() {
  timeout 5 openssl pkey -in "$1" -passin pass: -pubout 2>/dev/null |
    timeout 5 openssl pkey -pubin -outform DER 2>/dev/null |
    sha256sum | awk '{print $1}'
}

assert_spki_not_historically_exposed() {
  local spki=$1
  local label=$2
  [[ $spki =~ ^[0-9a-f]{64}$ ]] || { die "$label has an invalid SPKI SHA-256"; return 1; }
  [[ $spki != "$COMPROMISED_ROOT_SPKI_SHA256" && \
     $spki != "$COMPROMISED_INTERMEDIATE_SPKI_SHA256" ]] || {
    die "$label reused historically exposed CA key material"
    return 1
  }
}

assert_four_ca_spkis_pairwise_unique() {
  [[ $# -eq 4 ]] || { die 'exactly four new CA SPKIs are required'; return 1; }
  [[ $(printf '%s\n' "$@" | LC_ALL=C sort -u | wc -l) -eq 4 ]] || {
    die 'Astro and Payroll root/intermediate keys are not pairwise unique'
    return 1
  }
}

extract_chain_cert() {
  local source=$1
  local ordinal=$2
  local output=$3
  awk -v wanted="$ordinal" '
    /-----BEGIN CERTIFICATE-----/ { n++; if (n == wanted) printing = 1 }
    printing { print }
    /-----END CERTIFICATE-----/ { if (printing) exit }
  ' "$source" >"$output"
  [[ -s $output ]]
}

extract_chain_tail() {
  local source=$1
  local output=$2
  awk '
    /-----BEGIN CERTIFICATE-----/ { n++ }
    n >= 2 { print }
  ' "$source" >"$output"
  [[ -s $output ]]
}

validate_leaf_pair() {
  local kind=$1
  local host=$2
  local cert_path=$3
  local key_path=$4
  local trust_root=$5
  local trust_intermediate=$6
  local headroom=$7
  local required_uid=$8
  local required_gid=$9

  assert_exact_regular_file "$cert_path" "$required_uid" "$required_gid" 600 || return 1
  assert_exact_regular_file "$key_path" "$required_uid" "$required_gid" 600 || return 1
  local cert_sha_before key_sha_before cert_sha_after key_sha_after
  cert_sha_before=$(sha256_file "$cert_path")
  key_sha_before=$(sha256_file "$key_path")
  [[ $(grep -c -- '-----BEGIN CERTIFICATE-----' "$cert_path") -eq 2 ]] ||
    { die "$host internal certificate file must contain exactly leaf and intermediate"; return 1; }
  ! grep -Fq -- 'PRIVATE KEY-----' "$cert_path" ||
    { die "$host certificate file contains private-key material"; return 1; }

  local leaf="$WORK_DIR/leaf.pem"
  local chain="$WORK_DIR/chain.pem"
  extract_chain_cert "$cert_path" 1 "$leaf" || { die "cannot extract leaf certificate for $host"; return 1; }
  extract_chain_tail "$cert_path" "$chain" || { die "cannot extract certificate chain for $host"; return 1; }
  timeout 5 openssl x509 -in "$leaf" -noout -checkhost "$host" >/dev/null 2>&1 ||
    { die "$host is absent from its stored certificate"; return 1; }
  timeout 5 openssl x509 -in "$leaf" -noout -checkend "$headroom" >/dev/null 2>&1 ||
    { die "$host stored certificate lacks required validity headroom"; return 1; }
  [[ $(public_spki_sha256_from_cert "$leaf") == "$(public_spki_sha256_from_key "$key_path")" ]] ||
    { die "$host stored certificate and private key do not match"; return 1; }

  if [[ $kind != astro && $kind != payroll && $kind != rollback-local ]]; then
    die "unknown certificate kind: $kind"
    return 1
  fi
  timeout 8 openssl verify -purpose sslserver -CAfile "$trust_root" -untrusted "$trust_intermediate" "$leaf" >/dev/null 2>&1 ||
    { die "$host stored $kind chain does not validate to its named isolated CA"; return 1; }
  local stored_intermediate="$WORK_DIR/stored-intermediate.pem"
  extract_chain_cert "$cert_path" 2 "$stored_intermediate" ||
    { die "cannot extract stored $kind intermediate for $host"; return 1; }
  [[ $(timeout 5 openssl x509 -in "$stored_intermediate" -noout -fingerprint -sha256) == \
     "$(timeout 5 openssl x509 -in "$trust_intermediate" -noout -fingerprint -sha256)" ]] ||
    { die "$host stored $kind chain uses the wrong intermediate"; return 1; }

  cert_sha_after=$(sha256_file "$cert_path")
  key_sha_after=$(sha256_file "$key_path")
  [[ $cert_sha_before == "$cert_sha_after" && $key_sha_before == "$key_sha_after" ]] ||
    { die "$host certificate material changed during validation"; return 1; }
  local fingerprint not_after
  fingerprint=$(timeout 5 openssl x509 -in "$leaf" -noout -fingerprint -sha256)
  not_after=$(timeout 5 openssl x509 -in "$leaf" -noout -enddate | sed 's/^notAfter=//')
  printf '%s|%s|%s|%s|%s|%s|%s\n' \
    "$kind" "$host" "$cert_sha_before" "$key_sha_before" "$fingerprint" "$not_after" "$cert_path"
}

validate_named_ca_material() {
  local ca_id=$1
  local label=$2
  local headroom=$3
  local allow_compromised=${4:-false}
  local ca_dir="$CADDY_DATA_ROOT/pki/authorities/$ca_id"
  local name path
  for name in root.crt root.key intermediate.crt intermediate.key; do
    path="$ca_dir/$name"
    assert_exact_regular_file "$path" "$CADDY_UID" "$CADDY_GID" 600
  done
  local root_spki intermediate_spki
  root_spki=$(public_spki_sha256_from_cert "$ca_dir/root.crt")
  intermediate_spki=$(public_spki_sha256_from_cert "$ca_dir/intermediate.crt")
  [[ $root_spki == "$(public_spki_sha256_from_key "$ca_dir/root.key")" ]] ||
    die "$label root certificate/key mismatch"
  [[ $intermediate_spki == "$(public_spki_sha256_from_key "$ca_dir/intermediate.key")" ]] ||
    die "$label intermediate certificate/key mismatch"
  if [[ $allow_compromised != true ]]; then
    assert_spki_not_historically_exposed "$root_spki" "$label root"
    assert_spki_not_historically_exposed "$intermediate_spki" "$label intermediate"
  fi
  timeout 5 openssl x509 -in "$ca_dir/root.crt" -noout -checkend "$headroom" >/dev/null 2>&1 ||
    die "$label root CA lacks validity headroom"
  timeout 5 openssl x509 -in "$ca_dir/intermediate.crt" -noout -checkend "$headroom" >/dev/null 2>&1 ||
    die "$label intermediate CA lacks validity headroom"
  timeout 8 openssl verify -CAfile "$ca_dir/root.crt" "$ca_dir/intermediate.crt" >/dev/null 2>&1 ||
    die "$label intermediate does not validate to its named root"
}

validate_all_storage() {
  local output_file=$1
  : >"$output_file"
  assert_storage_ancestry
  local host cert_path key_path host_dir
  if [[ $ACTIVE_SCHEMA == final ]]; then
    validate_named_ca_material "$ASTRO_CA_ID" Astro "$ASTRO_CERT_HEADROOM_SECONDS"
    validate_named_ca_material "$PAYROLL_CA_ID" Payroll "$PAYROLL_CERT_HEADROOM_SECONDS"
    local astro_root_spki astro_intermediate_spki payroll_root_spki payroll_intermediate_spki
    astro_root_spki=$(public_spki_sha256_from_cert "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/root.crt")
    astro_intermediate_spki=$(public_spki_sha256_from_cert "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/intermediate.crt")
    payroll_root_spki=$(public_spki_sha256_from_cert "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/root.crt")
    payroll_intermediate_spki=$(public_spki_sha256_from_cert "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/intermediate.crt")
    assert_four_ca_spkis_pairwise_unique \
      "$astro_root_spki" "$astro_intermediate_spki" "$payroll_root_spki" "$payroll_intermediate_spki"
    while IFS= read -r host; do
      host_dir="$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID/$host"
      assert_canonical_directory "$host_dir" "$CADDY_UID" "$CADDY_GID" 700
      IFS=$'\t' read -r cert_path key_path < <(astro_pair_paths "$host")
      validate_leaf_pair astro "$host" "$cert_path" "$key_path" \
        "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/root.crt" \
        "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/intermediate.crt" \
        "$ASTRO_CERT_HEADROOM_SECONDS" "$CADDY_UID" "$CADDY_GID" >>"$output_file"
    done < <(emit_cf_subjects)
    for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
      host_dir="$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID/$host"
      assert_canonical_directory "$host_dir" "$CADDY_UID" "$CADDY_GID" 700
      IFS=$'\t' read -r cert_path key_path < <(payroll_pair_paths "$host")
      validate_leaf_pair payroll "$host" "$cert_path" "$key_path" \
        "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/root.crt" \
        "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/intermediate.crt" \
        "$PAYROLL_CERT_HEADROOM_SECONDS" "$CADDY_UID" "$CADDY_GID" >>"$output_file"
    done
  elif [[ $ACTIVE_SCHEMA == rollback ]]; then
    validate_named_ca_material "$LOCAL_CA_ID" 'Rollback local' "$ROLLBACK_CERT_HEADROOM_SECONDS" true
    while IFS= read -r host; do
      host_dir="$CADDY_DATA_ROOT/certificates/$LOCAL_CA_ID/$host"
      assert_canonical_directory "$host_dir" "$CADDY_UID" "$CADDY_GID" 700
      IFS=$'\t' read -r cert_path key_path < <(local_pair_paths "$host")
      validate_leaf_pair rollback-local "$host" "$cert_path" "$key_path" \
        "$CADDY_DATA_ROOT/pki/authorities/$LOCAL_CA_ID/root.crt" \
        "$CADDY_DATA_ROOT/pki/authorities/$LOCAL_CA_ID/intermediate.crt" \
        "$ROLLBACK_CERT_HEADROOM_SECONDS" "$CADDY_UID" "$CADDY_GID" >>"$output_file"
    done < <(emit_expected_subjects)
  else
    die 'storage validation requested for an unrecognized refresh schema'
  fi
  [[ $(wc -l <"$output_file") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    die "storage validation did not produce exactly $EXPECTED_SUBJECT_COUNT records"
}

validate_common_config_shape() {
  local json_file=$1
  jq -e . "$json_file" >/dev/null || { die 'adapted Caddy JSON is invalid'; return 1; }
  local expected_subjects="$WORK_DIR/expected-subjects.txt"
  local actual_subjects="$WORK_DIR/actual-subjects.txt"
  emit_expected_subjects >"$expected_subjects"
  jq -r '.apps.tls.automation.policies[]?.subjects[]?' "$json_file" | LC_ALL=C sort >"$actual_subjects"
  [[ $(wc -l <"$actual_subjects") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    { die 'effective config does not have exactly 58 automation subjects'; return 1; }
  cmp -s "$expected_subjects" "$actual_subjects" ||
    { die 'effective automation subjects differ from the 58-name allowlist'; return 1; }
  jq -e '
    (.apps.tls.certificates | keys | sort) == (["automate", "load_files"] | sort)
      and (.apps.tls.certificates.automate | length) == 58
      and (.apps.tls.certificates.load_files | length) == 58
      and ([.apps.tls.certificates.load_files[].tags[]?] | length) == 58
      and ([.apps.tls.certificates.load_files[].tags[]?] | unique | length) == 58
      and all(.apps.tls.certificates.load_files[];
        (. | keys | sort) == (["certificate", "key", "tags"] | sort)
          and (.tags | length) == 1)
      and all(.apps.http.servers[]; .automatic_https.ignore_loaded_certificates == true)
  ' "$json_file" >/dev/null || { die 'final manual-loader/force-automation shape is unsafe'; return 1; }

  local actual_automate="$WORK_DIR/actual-automate.txt"
  jq -r '.apps.tls.certificates.automate[]' "$json_file" | LC_ALL=C sort >"$actual_automate"
  cmp -s "$expected_subjects" "$actual_automate" ||
    { die 'force_automate subjects differ from the exact 58-name allowlist'; return 1; }
  local expected_pairs="$WORK_DIR/expected-load-pairs.tsv"
  local actual_pairs="$WORK_DIR/actual-load-pairs.tsv"
  emit_expected_storage_pairs | LC_ALL=C sort >"$expected_pairs"
  jq -r '.apps.tls.certificates.load_files[] | [.certificate, .key] | @tsv' "$json_file" |
    LC_ALL=C sort >"$actual_pairs"
  cmp -s "$expected_pairs" "$actual_pairs" ||
    { die 'manual certificate loaders differ from the exact 58 storage pairs'; return 1; }
}

validate_final_config_shape() {
  local json_file=$1
  validate_common_config_shape "$json_file" || return 1
  jq -e --arg astro "$ASTRO_CA_ID" --arg payroll "$PAYROLL_CA_ID" '
    (.apps.pki | keys) == ["certificate_authorities"]
      and (.apps.pki.certificate_authorities | keys | sort) == ([$astro, $payroll] | sort)
      and .apps.pki.certificate_authorities[$astro] == {
        "name": "Astro Origin Authority 2026",
        "root_common_name": "Astro Origin Authority 2026 ECC Root",
        "intermediate_common_name": "Astro Origin Authority 2026 ECC Intermediate",
        "install_trust": false
      }
      and .apps.pki.certificate_authorities[$payroll] == {
        "name": "Payroll Origin Isolated Authority 2026",
        "root_common_name": "Payroll Origin Isolated Authority 2026 ECC Root",
        "intermediate_common_name": "Payroll Origin Isolated Authority 2026 ECC Intermediate",
        "install_trust": false
      }
  ' "$json_file" >/dev/null || { die 'final PKI app is not isolated to the two named CAs'; return 1; }
  ! grep -Fq "$FORBIDDEN_TRANSITION_CA_ID" "$json_file" ||
    { die 'temporary transition CA remains in final effective config'; return 1; }

  # Caddy consolidates site blocks that have identical automation settings.
  # The reviewed final form is therefore one 56-subject Astro policy and one
  # two-subject Payroll policy, rather than one policy per site block.
  [[ $(jq '.apps.tls.automation.policies | length' "$json_file") -eq 2 ]] ||
    { die 'final effective config does not have exactly two grouped automation policies'; return 1; }
  local expected_astro="$WORK_DIR/expected-astro-policy-subjects.txt"
  local actual_astro="$WORK_DIR/actual-astro-policy-subjects.txt"
  emit_cf_subjects >"$expected_astro"
  jq -r --arg ca "$ASTRO_CA_ID" --argjson lifetime "$ASTRO_POLICY_LIFETIME_NS" '
    [.apps.tls.automation.policies[]
     | select((. | keys | sort) == (["issuers", "subjects"] | sort)
       and (.issuers | length) == 1
       and .issuers[0] == {"ca": $ca, "lifetime": $lifetime, "module": "internal"}
       and (.renewal_window_ratio == null))] as $p
    | if ($p | length) == 1 then $p[0].subjects[] else error("unsafe Astro policy count") end
  ' "$json_file" | LC_ALL=C sort >"$actual_astro" ||
    { die 'unsafe final named-Astro policy'; return 1; }
  cmp -s "$expected_astro" "$actual_astro" ||
    { die 'final Astro policy subjects differ from the exact 56-name allowlist'; return 1; }

  jq -e --arg apex "$PAYROLL_APEX" --arg www "www.$PAYROLL_APEX" \
      --arg ca "$PAYROLL_CA_ID" --argjson lifetime "$PAYROLL_POLICY_LIFETIME_NS" '
    [.apps.tls.automation.policies[]
     | select((. | keys | sort) == (["issuers", "subjects"] | sort)
       and (.issuers | length) == 1
       and .issuers[0] == {"ca": $ca, "lifetime": $lifetime, "module": "internal"}
       and (.renewal_window_ratio == null))] as $p
    | ($p | length) == 1
      and (($p[0].subjects | sort) == ([$apex, $www] | sort))
  ' "$json_file" >/dev/null || { die 'unsafe final Payroll policy'; return 1; }
}

validate_rollback_config_shape() {
  local json_file=$1
  validate_common_config_shape "$json_file" || return 1
  # Referencing the built-in `local` authority causes the adapter to emit its
  # PKI entry.  Accept only that one authority, with trust installation off.
  jq -e '
    (.apps.pki | keys) == ["certificate_authorities"]
      and (.apps.pki.certificate_authorities | keys) == ["local"]
      and .apps.pki.certificate_authorities.local == {"install_trust": false}
  ' "$json_file" >/dev/null ||
    { die 'rollback bridge PKI app is not the exact non-installing local authority'; return 1; }
  ! grep -Fq "$ASTRO_CA_ID" "$json_file" ||
    { die 'rollback bridge contains the durable Astro CA'; return 1; }
  ! grep -Fq "$PAYROLL_CA_ID" "$json_file" ||
    { die 'rollback bridge contains the isolated Payroll CA'; return 1; }
  ! grep -Fq "$FORBIDDEN_TRANSITION_CA_ID" "$json_file" ||
    { die 'rollback bridge contains the temporary transition CA'; return 1; }

  # All rollback blocks use the same local issuer settings, so Caddy adapts
  # them into one policy whose subject set must be the complete 58-name set.
  jq -e --arg ca "$LOCAL_CA_ID" \
      --argjson lifetime "$ROLLBACK_POLICY_LIFETIME_NS" \
      --argjson renewal "$ROLLBACK_RENEWAL_WINDOW_RATIO" '
    (.apps.tls.automation.policies | length) == 1
      and (.apps.tls.automation.policies[0] | keys | sort) ==
        (["issuers", "renewal_window_ratio", "subjects"] | sort)
      and (.apps.tls.automation.policies[0].issuers | length) == 1
      and .apps.tls.automation.policies[0].issuers[0] ==
        {"ca": $ca, "lifetime": $lifetime, "module": "internal"}
      and .apps.tls.automation.policies[0].renewal_window_ratio == $renewal
  ' "$json_file" >/dev/null || { die 'unsafe grouped rollback-local policy'; return 1; }
}

validate_recognized_config_shape() {
  local json_file=$1
  case $ACTIVE_SCHEMA in
    final) validate_final_config_shape "$json_file" ;;
    rollback) validate_rollback_config_shape "$json_file" ;;
    *) die 'effective-config validation requested for an unrecognized refresh schema' ;;
  esac
}

read_refresh_schema() {
  local source_file=$1
  local final_count rollback_count marker_count
  final_count=$(grep -Fxc "$FINAL_SCHEMA_MARKER" "$source_file" || true)
  rollback_count=$(grep -Fxc "$ROLLBACK_SCHEMA_MARKER" "$source_file" || true)
  marker_count=$(grep -Ec '^# C-01-REFRESH-SCHEMA: ' "$source_file" || true)
  if [[ $marker_count -eq 1 && $final_count -eq 1 && $rollback_count -eq 0 ]]; then
    printf 'final\n'
  elif [[ $marker_count -eq 1 && $final_count -eq 0 && $rollback_count -eq 1 ]]; then
    printf 'rollback\n'
  else
    die "live Caddyfile has an unknown, missing, or mixed C-01 refresh schema marker"
  fi
}

detect_refresh_schema() {
  ACTIVE_SCHEMA=$(read_refresh_schema "$LIVE_CADDYFILE")
  if [[ -z $INITIAL_SCHEMA ]]; then
    INITIAL_SCHEMA=$ACTIVE_SCHEMA
    printf 'refresh_schema=%s\n' "$ACTIVE_SCHEMA" >>"$EVIDENCE_DIR/manifest.txt"
  else
    [[ $ACTIVE_SCHEMA == "$INITIAL_SCHEMA" ]] || die "refresh schema changed during this run"
  fi
}

validate_live_file_and_config() {
  assert_canonical_directory / 0 >/dev/null
  assert_canonical_directory /etc 0 >/dev/null
  assert_canonical_directory /etc/caddy 0 >/dev/null
  assert_exact_regular_file "$LIVE_CADDYFILE" 0 "$CADDY_GID" 640
  assert_exact_regular_file "$EXPECTED_CADDYFILE_SHA_FILE" 0 "$CADDY_GID" 640
  [[ $(stat -c '%s' "$EXPECTED_CADDYFILE_SHA_FILE") -eq 65 ]] ||
    die 'pinned Caddyfile SHA file must contain exactly 64 lowercase hex bytes plus newline'
  EXPECTED_CADDYFILE_SHA256=$(<"$EXPECTED_CADDYFILE_SHA_FILE")
  [[ $EXPECTED_CADDYFILE_SHA256 =~ ^[0-9a-f]{64}$ ]] || die 'pinned Caddyfile SHA is not one lowercase SHA-256 value'
  local live_sha
  live_sha=$(sha256_file "$LIVE_CADDYFILE")
  [[ $live_sha == "$EXPECTED_CADDYFILE_SHA256" ]] ||
    die "live Caddyfile drifted: expected $EXPECTED_CADDYFILE_SHA256, got $live_sha"
  detect_refresh_schema

  local adapted="$WORK_DIR/live.adapted.json"
  local effective="$WORK_DIR/live.effective.json"
  "$CADDY_BINARY" adapt --adapter caddyfile --config "$LIVE_CADDYFILE" >"$adapted" 2>"$WORK_DIR/live.adapt.stderr"
  jq -e . "$adapted" >/dev/null
  curl --noproxy '*' -fsS --connect-timeout 2 --max-time 5 "$CADDY_ADMIN_URL/config/" >"$effective"
  local adapted_sha effective_sha
  adapted_sha=$(canonical_json_sha256 "$adapted")
  effective_sha=$(canonical_json_sha256 "$effective")
  [[ $adapted_sha == "$effective_sha" ]] ||
    die "effective Caddy JSON differs from the exact live file ($effective_sha != $adapted_sha)"
  validate_recognized_config_shape "$adapted"
  EXPECTED_CONFIG_SHA256=$adapted_sha
  printf '%s  %s\n%s  canonical-live-config.json\n' \
    "$live_sha" "$LIVE_CADDYFILE" "$adapted_sha" >"$EVIDENCE_DIR/config-sha256.txt"
}

capture_listener_snapshot() {
  local output_file=$1
  : >"$output_file"
  local port line_file
  for port in 80 443 2019; do
    line_file="$WORK_DIR/listener-$port.txt"
    # Query TCP and UDP together so the baseline also preserves Caddy's QUIC
    # socket on 443 when enabled. Every required port must retain TCP.
    ss -H -lntup "sport = :$port" | LC_ALL=C sort >"$line_file"
    [[ -s $line_file ]] || die "Caddy has no TCP/UDP listener on port $port"
    awk '$1 == "tcp" { found = 1 } END { exit !found }' "$line_file" ||
      die "Caddy has no TCP listener on port $port"
    while IFS= read -r line; do
      [[ $line == *"pid=$BASELINE_MAIN_PID,"* ]] || die "port $port is not owned by Caddy MainPID $BASELINE_MAIN_PID"
      # Ignore dynamic accept-queue counters; retain endpoint, peer, process,
      # PID, FD, and protocol identity so a reload must preserve listeners.
      awk -v port="$port" '{print port "\t" $1 "\t" $2 "\t" $5 "\t" $6 "\t" $NF}' <<<"$line" >>"$output_file"
    done <"$line_file"
  done
}

capture_service_baseline() {
  systemctl is-active --quiet "$CADDY_SERVICE" || die 'Caddy is not active'
  BASELINE_MAIN_PID=$(systemctl show "$CADDY_SERVICE" -p MainPID --value)
  BASELINE_NRESTARTS=$(systemctl show "$CADDY_SERVICE" -p NRestarts --value)
  [[ $BASELINE_MAIN_PID =~ ^[1-9][0-9]*$ ]] || die 'Caddy MainPID is invalid'
  [[ $BASELINE_NRESTARTS =~ ^[0-9]+$ ]] || die 'Caddy NRestarts is invalid'
  verify_running_caddy_binary "$BASELINE_MAIN_PID"
  capture_listener_snapshot "$BASELINE_LISTENERS_FILE"
}

verify_service_invariants() {
  local pid restarts active sub exec_status current_listeners="$WORK_DIR/listeners.current.txt"
  pid=$(systemctl show "$CADDY_SERVICE" -p MainPID --value)
  restarts=$(systemctl show "$CADDY_SERVICE" -p NRestarts --value)
  active=$(systemctl show "$CADDY_SERVICE" -p ActiveState --value)
  sub=$(systemctl show "$CADDY_SERVICE" -p SubState --value)
  exec_status=$(systemctl show "$CADDY_SERVICE" -p ExecMainStatus --value)
  [[ $pid == "$BASELINE_MAIN_PID" ]] || die "Caddy MainPID changed: $BASELINE_MAIN_PID -> $pid"
  [[ $restarts == "$BASELINE_NRESTARTS" ]] || die "Caddy NRestarts changed: $BASELINE_NRESTARTS -> $restarts"
  [[ $active == active && $sub == running && $exec_status == 0 ]] ||
    die "Caddy state is $active/$sub with ExecMainStatus=$exec_status"
  verify_running_caddy_binary "$pid"
  capture_listener_snapshot "$current_listeners"
  cmp -s "$BASELINE_LISTENERS_FILE" "$current_listeners" || die 'Caddy listener set changed'
}

assert_http_status() {
  local label=$1
  shift
  local status
  status=$(curl --noproxy '*' -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout 4 --max-time 12 "$@") || die "$label request failed"
  [[ $status =~ ^[1-4][0-9][0-9]$ ]] || die "$label returned unacceptable HTTP status $status"
  printf '%s|%s\n' "$label" "$status"
}

assert_cloudflare_edge_status() {
  local apex=$1
  local header_file="$WORK_DIR/cloudflare-edge-$apex.headers"
  local status
  : >"$header_file"
  status=$(curl --noproxy '*' -sS -o /dev/null -D "$header_file" -w '%{http_code}' \
    --connect-timeout 4 --max-time 12 "https://$apex/") || die "cloudflare-edge:$apex request failed"
  [[ $status =~ ^[1-4][0-9][0-9]$ ]] ||
    die "cloudflare-edge:$apex returned unacceptable HTTP status $status"
  tr -d '\r' <"$header_file" | grep -Eiq '^cf-ray:[[:space:]]*[^[:space:]]+' ||
    die "cloudflare-edge:$apex response lacks a nonempty Cloudflare cf-ray header"
  printf 'cloudflare-edge:%s|%s|cf-ray=present\n' "$apex" "$status"
}

verify_application_health() {
  local prefix=$1
  local local_file="$EVIDENCE_DIR/$prefix-local-http-health.txt"
  local direct_file="$EVIDENCE_DIR/$prefix-direct-https-health.txt"
  local edge_file="$EVIDENCE_DIR/$prefix-cloudflare-edge-health.txt"
  : >"$local_file"
  : >"$direct_file"
  : >"$edge_file"
  local apex
  for apex in "${CF_APEXES[@]}" "$PAYROLL_APEX"; do
    assert_http_status "local-http:$apex" --resolve "$apex:80:127.0.0.1" "http://$apex/" >>"$local_file"
  done
  [[ $(wc -l <"$local_file") -eq $EXPECTED_SITE_COUNT ]] || die 'local application health did not cover all 29 apexes'
  if [[ $ACTIVE_SCHEMA == final ]]; then
    assert_http_status 'direct-https:c-uae.com' \
      --cacert "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/root.crt" \
      --resolve 'c-uae.com:443:127.0.0.1' 'https://c-uae.com/' >>"$direct_file"
    assert_http_status "direct-https:$PAYROLL_APEX" \
      --cacert "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/root.crt" \
      --resolve "$PAYROLL_APEX:443:127.0.0.1" "https://$PAYROLL_APEX/" >>"$direct_file"
  elif [[ $ACTIVE_SCHEMA == rollback ]]; then
    assert_http_status 'direct-https:c-uae.com' \
      --cacert "$CADDY_DATA_ROOT/pki/authorities/$LOCAL_CA_ID/root.crt" \
      --resolve 'c-uae.com:443:127.0.0.1' 'https://c-uae.com/' >>"$direct_file"
    assert_http_status "direct-https:$PAYROLL_APEX" \
      --cacert "$CADDY_DATA_ROOT/pki/authorities/$LOCAL_CA_ID/root.crt" \
      --resolve "$PAYROLL_APEX:443:127.0.0.1" "https://$PAYROLL_APEX/" >>"$direct_file"
  else
    die 'application health requested for an unrecognized refresh schema'
  fi
  for apex in "${CF_APEXES[@]}"; do
    assert_cloudflare_edge_status "$apex" >>"$edge_file"
  done
  [[ $(wc -l <"$edge_file") -eq $EXPECTED_CF_SITE_COUNT ]] || die 'Cloudflare edge health did not cover all 28 apexes'
}

verify_internal_sni() {
  local host=$1
  local ca_id=$2
  local kind=$3
  local headroom=$4
  local require_storage_match=$5
  local ca_dir="$CADDY_DATA_ROOT/pki/authorities/$ca_id"
  local raw="$WORK_DIR/sclient.raw"
  local leaf="$WORK_DIR/sclient.leaf.pem"
  local served_intermediate="$WORK_DIR/sclient.intermediate.pem"
  timeout 12 openssl s_client -connect '127.0.0.1:443' -servername "$host" -showcerts \
    -verify_return_error -verify_hostname "$host" -CAfile "$ca_dir/root.crt" \
    </dev/null >"$raw" 2>"$WORK_DIR/sclient.stderr" || die "$host live $kind TLS handshake failed"
  grep -Fq 'Verify return code: 0 (ok)' "$raw" || die "$host live $kind chain is untrusted"
  [[ $(grep -c -- '-----BEGIN CERTIFICATE-----' "$raw") -eq 2 ]] || die "$host live $kind chain does not contain exactly two certificates"
  extract_chain_cert "$raw" 1 "$leaf" || die "cannot extract live $kind leaf for $host"
  extract_chain_cert "$raw" 2 "$served_intermediate" || die "cannot extract live $kind intermediate for $host"
  timeout 5 openssl x509 -in "$leaf" -noout -checkhost "$host" >/dev/null 2>&1 || die "$host live $kind hostname check failed"
  timeout 5 openssl x509 -in "$leaf" -noout -checkend "$headroom" >/dev/null 2>&1 ||
    die "$host live $kind certificate lacks validity headroom"
  timeout 8 openssl verify -purpose sslserver -CAfile "$ca_dir/root.crt" -untrusted "$ca_dir/intermediate.crt" "$leaf" >/dev/null 2>&1 ||
    die "$host live $kind chain does not validate to CA $ca_id"
  [[ $(timeout 5 openssl x509 -in "$served_intermediate" -noout -fingerprint -sha256) == \
     "$(timeout 5 openssl x509 -in "$ca_dir/intermediate.crt" -noout -fingerprint -sha256)" ]] ||
    die "$host live $kind chain serves the wrong intermediate"
  local live_fp stored_cert stored_key stored_fp
  live_fp=$(timeout 5 openssl x509 -in "$leaf" -noout -fingerprint -sha256)
  case $kind in
    astro-internal) IFS=$'\t' read -r stored_cert stored_key < <(astro_pair_paths "$host") ;;
    payroll-internal) IFS=$'\t' read -r stored_cert stored_key < <(payroll_pair_paths "$host") ;;
    rollback-local) IFS=$'\t' read -r stored_cert stored_key < <(local_pair_paths "$host") ;;
    *) die "unknown live-chain kind: $kind" ;;
  esac
  stored_fp=$(timeout 5 openssl x509 -in "$stored_cert" -noout -fingerprint -sha256)
  if [[ $require_storage_match == true && $live_fp != "$stored_fp" ]]; then
    die "$host live $kind leaf was not refreshed from its validated storage file"
  fi
  printf '%s|%s|%s|storage_match=%s\n' "$host" "$kind" "$live_fp" "$([[ $live_fp == "$stored_fp" ]] && printf true || printf false)"
}

verify_all_live_chains() {
  local prefix=$1
  local require_storage_match=$2
  local output_file="$EVIDENCE_DIR/$prefix-live-chains.txt"
  : >"$output_file"
  local host astro_headroom payroll_headroom rollback_headroom
  if [[ $require_storage_match == true ]]; then
    astro_headroom=$ASTRO_CERT_HEADROOM_SECONDS
    payroll_headroom=$PAYROLL_CERT_HEADROOM_SECONDS
    rollback_headroom=$ROLLBACK_CERT_HEADROOM_SECONDS
  else
    # A stale manual loader is exactly what this helper must recover. Keep only
    # enough pre-reload margin for bounded validation and the graceful reload;
    # storage and post-reload chains retain their full schema-specific gates.
    astro_headroom=$PRE_RELOAD_SERVED_HEADROOM_SECONDS
    payroll_headroom=$PRE_RELOAD_SERVED_HEADROOM_SECONDS
    rollback_headroom=$PRE_RELOAD_SERVED_HEADROOM_SECONDS
  fi
  if [[ $ACTIVE_SCHEMA == final ]]; then
    while IFS= read -r host; do
      verify_internal_sni "$host" "$ASTRO_CA_ID" astro-internal "$astro_headroom" \
        "$require_storage_match" >>"$output_file"
    done < <(emit_cf_subjects)
    for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
      verify_internal_sni "$host" "$PAYROLL_CA_ID" payroll-internal "$payroll_headroom" \
        "$require_storage_match" >>"$output_file"
    done
  elif [[ $ACTIVE_SCHEMA == rollback ]]; then
    while IFS= read -r host; do
      verify_internal_sni "$host" "$LOCAL_CA_ID" rollback-local "$rollback_headroom" \
        "$require_storage_match" >>"$output_file"
    done < <(emit_expected_subjects)
  else
    die 'live chain verification requested for an unrecognized refresh schema'
  fi
  [[ $(wc -l <"$output_file") -eq $EXPECTED_SUBJECT_COUNT ]] || die 'live chain verification did not cover all 58 subjects'
}

wait_for_effective_config() {
  local deadline=$((SECONDS + CONFIG_CONVERGENCE_SECONDS))
  local live_json="$WORK_DIR/live.after-reload.json"
  while ((SECONDS < deadline)); do
    if curl --noproxy '*' -fsS --connect-timeout 2 --max-time 5 "$CADDY_ADMIN_URL/config/" >"$live_json" 2>/dev/null; then
      if [[ $(canonical_json_sha256 "$live_json") == "$EXPECTED_CONFIG_SHA256" ]]; then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

preflight() {
  resolve_caddy_identity
  verify_reviewed_caddy_binary
  capture_service_baseline
  validate_live_file_and_config
  validate_all_storage "$EVIDENCE_DIR/storage.before.txt"
  verify_service_invariants
  verify_application_health before
  verify_all_live_chains before false
  verify_service_invariants
  validate_live_file_and_config
  validate_all_storage "$EVIDENCE_DIR/storage.pre-reload.txt"
  cmp -s "$EVIDENCE_DIR/storage.before.txt" "$EVIDENCE_DIR/storage.pre-reload.txt" ||
    die 'certificate storage changed during preflight; retry on the next timer run'
  verify_service_invariants
}

run_audit() {
  preflight
  verify_all_live_chains audit true
  verify_service_invariants
  printf 'audit_completed_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >"$EVIDENCE_DIR/AUDIT.SUCCESS"
  log "AUDIT PASS: exact $ACTIVE_SCHEMA schema/file/effective JSON, 58 storage pairs, 29 applications, and 58 live chains"
  log 'No reload, restart, Caddyfile write, certificate write, or deletion was performed.'
}

run_reload() {
  [[ $CONFIRM_RELOAD == "$RELOAD_CONFIRMATION" ]] ||
    die "--reload requires --confirm-reload $RELOAD_CONFIRMATION"
  preflight
  local validated_json="$WORK_DIR/live.adapted.json"
  assert_exact_regular_file "$validated_json" 0 0 600
  [[ $(canonical_json_sha256 "$validated_json") == "$EXPECTED_CONFIG_SHA256" ]] ||
    die 'validated reload JSON changed after preflight'
  log 'All preflight gates passed; gracefully force-loading the already validated JSON.'
  "$CADDY_BINARY" reload --force --config "$validated_json" --address '127.0.0.1:2019'
  wait_for_effective_config || die 'effective Caddy JSON did not converge after graceful reload'
  verify_service_invariants
  validate_all_storage "$EVIDENCE_DIR/storage.after.txt"
  validate_live_file_and_config
  verify_application_health after
  verify_all_live_chains after true
  verify_service_invariants
  printf 'completed_utc=%s\nmode=reload\nmain_pid=%s\nnrestarts=%s\n' \
    "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$BASELINE_MAIN_PID" "$BASELINE_NRESTARTS" \
    >"$EVIDENCE_DIR/REFRESH.SUCCESS"
  log 'REFRESH PASS: all 58 served leaves match validated storage; PID, restarts, listeners, applications, and chains stayed healthy.'
}

parse_args() {
  while (($#)); do
    case "$1" in
      --audit)
        MODE='audit'
        shift
        ;;
      --reload)
        MODE='reload'
        shift
        ;;
      --confirm-reload)
        (($# >= 2)) || die '--confirm-reload requires a value'
        CONFIRM_RELOAD=$2
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "unknown argument: $1"
        ;;
    esac
  done
  [[ $MODE == reload || -z $CONFIRM_RELOAD ]] || die '--confirm-reload is only valid with --reload'
}

main() {
  case ${1:-} in
    --list-subjects)
      [[ $# -eq 1 ]] || die '--list-subjects does not accept other arguments'
      emit_expected_subjects
      exit 0
      ;;
    --list-final-storage-pairs)
      [[ $# -eq 1 ]] || die '--list-final-storage-pairs does not accept other arguments'
      emit_final_storage_pairs
      exit 0
      ;;
    --list-rollback-storage-pairs)
      [[ $# -eq 1 ]] || die '--list-rollback-storage-pairs does not accept other arguments'
      emit_rollback_storage_pairs
      exit 0
      ;;
  esac
  parse_args "$@"
  [[ $EUID -eq 0 ]] || die 'must run as root'
  local command
  for command in awk cmp curl date flock grep id install jq mktemp openssl readlink sed sha256sum ss stat systemctl tee timeout tr; do
    require_command "$command"
  done
  acquire_lock
  create_evidence_directory
  trap mark_failed EXIT
  trap 'exit_for_signal 129' HUP
  trap 'exit_for_signal 130' INT
  trap 'exit_for_signal 143' TERM
  {
    printf 'started_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf 'mode=%s\n' "$MODE"
    printf 'live_caddyfile=%s\n' "$LIVE_CADDYFILE"
    printf 'expected_sha_file=%s\n' "$EXPECTED_CADDYFILE_SHA_FILE"
  } >"$EVIDENCE_DIR/manifest.txt"
  if [[ $MODE == reload ]]; then
    run_reload
  else
    run_audit
  fi
  RUN_COMPLETE='true'
  trap - EXIT HUP INT TERM
  log "Evidence retained root-private at $EVIDENCE_DIR"
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main "$@"
fi
