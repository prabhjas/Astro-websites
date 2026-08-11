#!/usr/bin/env bash
# Retire the compromised Caddy `local` CA storage only after a successful C-01
# rotation has soaked for a bounded period.
#
# No arguments (or --audit) are read-only with respect to Caddy configuration
# and certificate storage.  Audit still requires an explicit successful
# rotation evidence directory.  --apply performs two same-filesystem atomic
# renames into that evidence directory; it never deletes certificate material.
# The transaction is fail-closed and automatically restores known moved trees
# in reverse order if any post-move validation fails.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

readonly REVIEWED_FINAL_CADDYFILE_SHA256='82aaa881339358f3b6b00d555f70ffb55ccd0628dee9598b27a001299c34d076'
readonly REVIEWED_REFRESH_HELPER_SHA256='306d9045ec4a12e39b2e999dc2e0db6979057d6b43975713b6c68a31e4f734f2'
readonly REVIEWED_REFRESH_SERVICE_SHA256='a665c39aa1c74c7905d2a5f352e2eff17142b68158f6c4321597b8419f77e7b8'
readonly REVIEWED_REFRESH_TIMER_SHA256='09f7b43f1ac8b7e871e4e9a67a078b96cafd9e033792022e6d444a3ad0f4011d'
readonly COMPROMISED_ROOT_SPKI_SHA256='01255cc20dbb7f6842821121d5566f23871c5d912b712b458a6681fa323c38c5'
readonly LIVE_CADDYFILE='/etc/caddy/Caddyfile'
readonly FINAL_PIN_FILE='/etc/caddy/c01-manual-cert-refresh.expected-sha256'
readonly FINAL_SCHEMA_MARKER='# C-01-REFRESH-SCHEMA: named-internal-manual-v1'
readonly CADDY_SERVICE='caddy.service'
readonly CADDY_ADMIN_URL='http://127.0.0.1:2019'
readonly CADDY_DATA_ROOT='/var/lib/caddy/.local/share/caddy'
readonly LOCAL_AUTHORITY_SOURCE="$CADDY_DATA_ROOT/pki/authorities/local"
readonly LOCAL_CERTIFICATES_SOURCE="$CADDY_DATA_ROOT/certificates/local"
readonly ASTRO_CA_ID='astro_origin_2026'
readonly PAYROLL_CA_ID='payroll_origin_isolated_2026'
readonly PAYROLL_APEX='payrollmiddleast.org'
readonly EVIDENCE_BASE='/opt/deploy-backups/caddy-ca-rotation'
readonly ROTATION_LOCK_DIR='/run/astro-caddy-ca-rotation-lock'
readonly ROTATION_LOCK_FILE="$ROTATION_LOCK_DIR/rotation.lock"
readonly REFRESH_LOCK_DIR='/run/astro-caddy-certificate-refresh'
readonly REFRESH_LOCK_FILE="$REFRESH_LOCK_DIR/refresh.lock"
readonly REFRESH_HELPER='/usr/local/sbin/astro-caddy-certificate-refresh'
readonly REFRESH_SERVICE_FILE='/etc/systemd/system/astro-caddy-certificate-refresh.service'
readonly REFRESH_TIMER_FILE='/etc/systemd/system/astro-caddy-certificate-refresh.timer'
readonly REFRESH_SERVICE_UNIT='astro-caddy-certificate-refresh.service'
readonly REFRESH_TIMER_UNIT='astro-caddy-certificate-refresh.timer'
readonly MIN_SOAK_SECONDS='259200'   # 72 hours
readonly MAX_SOAK_SECONDS='2592000'  # 30 days
readonly EXPECTED_SUBJECT_COUNT='58'
readonly APPLY_CONFIRMATION='QUARANTINE-RETIRED-LOCAL-CA-82aaa881-AFTER-SOAK'

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
MODE_SEEN=''
ROTATION_EVIDENCE_DIR=''
EXPECTED_CADDYFILE_SHA256=''
CONFIRM_QUARANTINE=''
WORK_DIR=''
QUARANTINE_DIR=''
QUARANTINE_LOG=''
AUTHORITY_DESTINATION=''
CERTIFICATES_DESTINATION=''
AUTHORITY_BASELINE_MANIFEST=''
CERTIFICATES_BASELINE_MANIFEST=''
EXPECTED_EFFECTIVE_CONFIG_SHA256=''
BASELINE_MAIN_PID=''
BASELINE_NRESTARTS=''
BASELINE_LISTENERS_FILE=''
CADDY_UID=''
CADDY_GID=''
SOAK_AGE_SECONDS=''
TRANSACTION_ARMED='false'
RUN_COMPLETE='false'
REFRESH_LOCK_HELD='false'

log() {
  local line
  line="$(date -u +'%Y-%m-%dT%H:%M:%SZ') $*"
  printf '%s\n' "$line"
  if [[ -n $QUARANTINE_LOG ]]; then
    printf '%s\n' "$line" >>"$QUARANTINE_LOG"
  fi
}

die() {
  log "ERROR: $*" >&2
  return 1
}

usage() {
  cat <<'USAGE'
Usage:
  sudo quarantine-retired-caddy-local-ca.sh \
    --rotation-evidence-dir /opt/deploy-backups/caddy-ca-rotation/rotation-...

  sudo quarantine-retired-caddy-local-ca.sh --audit \
    --rotation-evidence-dir /opt/deploy-backups/caddy-ca-rotation/rotation-...

  sudo quarantine-retired-caddy-local-ca.sh --apply \
    --rotation-evidence-dir /opt/deploy-backups/caddy-ca-rotation/rotation-... \
    --expected-caddyfile-sha256 82aaa881339358f3b6b00d555f70ffb55ccd0628dee9598b27a001299c34d076 \
    --confirm-quarantine QUARANTINE-RETIRED-LOCAL-CA-82aaa881-AFTER-SOAK

Default mode is audit.  Both modes require the exact successful rotation
evidence directory.  Apply is accepted only 72 hours through 30 days after the
recorded rotation success and only while the reviewed final state is unchanged.
The old hierarchy is moved, never deleted, and remains reversible in the
root-private rotation evidence directory.
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

assert_path_absent() {
  local path=$1
  [[ ! -e $path && ! -L $path ]] || die "path must be absent, including symlinks: $path"
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
  if [[ ! $nlink =~ ^[0-9]+$ ]] || ((nlink < 2)); then
    die "$path has unsafe directory link count $nlink"
    return 1
  fi
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

assert_root_ancestry() {
  local path
  for path in "$@"; do
    assert_canonical_directory "$path" 0 >/dev/null || return 1
  done
}

acquire_rotation_lock() {
  assert_root_ancestry / /run
  ensure_root_private_directory "$ROTATION_LOCK_DIR"
  if [[ ! -e $ROTATION_LOCK_FILE && ! -L $ROTATION_LOCK_FILE ]]; then
    install -o root -g root -m 0600 /dev/null "$ROTATION_LOCK_FILE"
  fi
  assert_exact_regular_file "$ROTATION_LOCK_FILE" 0 0 600
  exec 9<>"$ROTATION_LOCK_FILE"
  flock -n 9 || die 'C-01 rotation or post-soak quarantine already holds the lock'
}

acquire_refresh_lock() {
  ensure_root_private_directory "$REFRESH_LOCK_DIR"
  if [[ ! -e $REFRESH_LOCK_FILE && ! -L $REFRESH_LOCK_FILE ]]; then
    install -o root -g root -m 0600 /dev/null "$REFRESH_LOCK_FILE"
  fi
  assert_exact_regular_file "$REFRESH_LOCK_FILE" 0 0 600
  exec 8<>"$REFRESH_LOCK_FILE"
  flock -n 8 || die 'the C-01 certificate refresh is currently running; retry later'
  REFRESH_LOCK_HELD='true'
}

release_refresh_lock() {
  [[ $REFRESH_LOCK_HELD == true ]] || return 0
  flock -u 8 || true
  exec 8>&-
  REFRESH_LOCK_HELD='false'
}

create_work_directory() {
  WORK_DIR=$(mktemp -d '/run/astro-caddy-local-ca-quarantine-work.XXXXXXXX')
  chown root:root "$WORK_DIR"
  chmod 0700 "$WORK_DIR"
  assert_canonical_directory "$WORK_DIR" 0 0 700
  BASELINE_LISTENERS_FILE="$WORK_DIR/listeners.before.txt"
  AUTHORITY_BASELINE_MANIFEST="$WORK_DIR/authority.before.manifest"
  CERTIFICATES_BASELINE_MANIFEST="$WORK_DIR/certificates.before.manifest"
}

resolve_caddy_identity() {
  CADDY_UID=$(id -u caddy)
  CADDY_GID=$(id -g caddy)
  [[ $CADDY_UID =~ ^[1-9][0-9]*$ && $CADDY_GID =~ ^[1-9][0-9]*$ ]] ||
    die 'caddy service identity is invalid'
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

emit_final_storage_pairs() {
  local host base
  while IFS= read -r host; do
    base="$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID/$host/$host"
    printf '%s\t%s\n' "$base.crt" "$base.key"
  done < <(emit_cf_subjects)
  for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
    base="$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID/$host/$host"
    printf '%s\t%s\n' "$base.crt" "$base.key"
  done
}

validate_final_config_shape() {
  local json_file=$1
  jq -e . "$json_file" >/dev/null || { die 'adapted Caddy JSON is invalid'; return 1; }
  local expected_subjects="$WORK_DIR/expected-subjects.txt"
  local actual_subjects="$WORK_DIR/actual-subjects.txt"
  local actual_automate="$WORK_DIR/actual-automate.txt"
  local expected_pairs="$WORK_DIR/expected-load-pairs.tsv"
  local actual_pairs="$WORK_DIR/actual-load-pairs.tsv"
  local expected_astro="$WORK_DIR/expected-astro-policy-subjects.txt"
  local actual_astro="$WORK_DIR/actual-astro-policy-subjects.txt"
  emit_expected_subjects >"$expected_subjects"
  jq -r '.apps.tls.automation.policies[]?.subjects[]?' "$json_file" | LC_ALL=C sort >"$actual_subjects"
  [[ $(wc -l <"$actual_subjects") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    { die 'effective config does not have exactly 58 automation subjects'; return 1; }
  cmp -s "$expected_subjects" "$actual_subjects" ||
    { die 'effective automation subjects differ from the exact 58-name allowlist'; return 1; }

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
  ' "$json_file" >/dev/null || { die 'manual-loader/force-automation shape is unsafe'; return 1; }
  jq -r '.apps.tls.certificates.automate[]' "$json_file" | LC_ALL=C sort >"$actual_automate"
  cmp -s "$expected_subjects" "$actual_automate" ||
    { die 'force_automate subjects differ from the exact 58-name allowlist'; return 1; }
  emit_final_storage_pairs | LC_ALL=C sort >"$expected_pairs"
  jq -r '.apps.tls.certificates.load_files[] | [.certificate, .key] | @tsv' "$json_file" |
    LC_ALL=C sort >"$actual_pairs"
  cmp -s "$expected_pairs" "$actual_pairs" ||
    { die 'manual loaders differ from the exact 58 named-CA storage pairs'; return 1; }

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
  ' "$json_file" >/dev/null || { die 'PKI app is not isolated to the two named CAs'; return 1; }
  [[ $(jq '.apps.tls.automation.policies | length' "$json_file") -eq 2 ]] ||
    { die 'final config does not have exactly two automation policies'; return 1; }
  emit_cf_subjects >"$expected_astro"
  jq -r --arg ca "$ASTRO_CA_ID" --argjson lifetime 432000000000000 '
    [.apps.tls.automation.policies[]
     | select((. | keys | sort) == (["issuers", "subjects"] | sort)
       and (.issuers | length) == 1
       and .issuers[0] == {"ca": $ca, "lifetime": $lifetime, "module": "internal"})] as $p
    | if ($p | length) == 1 then $p[0].subjects[] else error("unsafe Astro policy") end
  ' "$json_file" | LC_ALL=C sort >"$actual_astro" ||
    { die 'unsafe final named-Astro policy'; return 1; }
  cmp -s "$expected_astro" "$actual_astro" ||
    { die 'Astro policy differs from the exact 56-name allowlist'; return 1; }
  jq -e --arg apex "$PAYROLL_APEX" --arg www "www.$PAYROLL_APEX" \
      --arg ca "$PAYROLL_CA_ID" --argjson lifetime 432000000000000 '
    [.apps.tls.automation.policies[]
     | select((. | keys | sort) == (["issuers", "subjects"] | sort)
       and (.issuers | length) == 1
       and .issuers[0] == {"ca": $ca, "lifetime": $lifetime, "module": "internal"})] as $p
    | ($p | length) == 1 and (($p[0].subjects | sort) == ([$apex, $www] | sort))
  ' "$json_file" >/dev/null || { die 'unsafe final Payroll policy'; return 1; }
  ! jq -e '.. | objects | select(has("ca") and .ca == "local")' "$json_file" >/dev/null ||
    { die 'effective config still references the local CA'; return 1; }
  ! grep -Fq "$CADDY_DATA_ROOT/certificates/local/" "$json_file" ||
    { die 'effective config still contains a local certificate loader'; return 1; }
}

validate_evidence_path_string() {
  local path=$1
  [[ $path == "$EVIDENCE_BASE"/rotation-* ]] ||
    { die 'rotation evidence must be an absolute path under the reviewed evidence base'; return 1; }
  [[ ${path%/*} == "$EVIDENCE_BASE" ]] ||
    { die 'rotation evidence must be an immediate child of the reviewed evidence base'; return 1; }
  [[ ${path##*/} =~ ^rotation-[0-9]{8}T[0-9]{6}Z\.[A-Za-z0-9]{8}$ ]] ||
    { die 'rotation evidence directory name does not match the exact rotation format'; return 1; }
}

read_unique_manifest_value() {
  local file=$1
  local key=$2
  local count value
  count=$(awk -F= -v key="$key" '$1 == key { count++ } END { print count + 0 }' "$file")
  [[ $count -eq 1 ]] || { die "$file must contain exactly one $key entry"; return 1; }
  value=$(awk -F= -v key="$key" '$1 == key { print substr($0, length(key) + 2) }' "$file")
  [[ -n $value && $value != *$'\r'* && $value != *$'\n'* ]] ||
    { die "$file contains an unsafe $key value"; return 1; }
  printf '%s\n' "$value"
}

validate_success_age() {
  local success_file=$1
  local now_epoch=$2
  local line completed completed_epoch marker_epoch delta
  [[ $(wc -l <"$success_file") -eq 1 ]] || { die 'ROTATION.SUCCESS must contain exactly one line'; return 1; }
  IFS= read -r line <"$success_file"
  [[ $line == completed_utc=* ]] || { die 'ROTATION.SUCCESS has an unknown format'; return 1; }
  completed=${line#completed_utc=}
  [[ $(date -u -d "$completed" +'%Y-%m-%dT%H:%M:%SZ' 2>/dev/null) == "$completed" ]] ||
    { die 'ROTATION.SUCCESS timestamp is not canonical UTC'; return 1; }
  completed_epoch=$(date -u -d "$completed" +%s)
  [[ $now_epoch =~ ^[0-9]+$ && $completed_epoch =~ ^[0-9]+$ ]] ||
    { die 'invalid soak timestamps'; return 1; }
  (( now_epoch >= completed_epoch )) || { die 'ROTATION.SUCCESS is in the future'; return 1; }
  marker_epoch=$(stat -c %Y -- "$success_file")
  delta=$((marker_epoch - completed_epoch))
  (( delta >= -2 && delta <= 2 )) ||
    { die 'ROTATION.SUCCESS content timestamp and file mtime disagree'; return 1; }
  SOAK_AGE_SECONDS=$((now_epoch - completed_epoch))
  (( SOAK_AGE_SECONDS >= MIN_SOAK_SECONDS )) ||
    { die "rotation soak is only $SOAK_AGE_SECONDS seconds; minimum is $MIN_SOAK_SECONDS"; return 1; }
  (( SOAK_AGE_SECONDS <= MAX_SOAK_SECONDS )) ||
    { die "rotation success is $SOAK_AGE_SECONDS seconds old; maximum is $MAX_SOAK_SECONDS"; return 1; }
}

validate_rotation_evidence() {
  validate_evidence_path_string "$ROTATION_EVIDENCE_DIR" || return 1
  assert_root_ancestry / /opt /opt/deploy-backups || return 1
  assert_canonical_directory "$EVIDENCE_BASE" 0 0 700 || return 1
  assert_canonical_directory "$ROTATION_EVIDENCE_DIR" 0 0 700 || return 1
  [[ $(readlink -e -- "$ROTATION_EVIDENCE_DIR") == "$ROTATION_EVIDENCE_DIR" ]] ||
    { die 'rotation evidence path is not canonical'; return 1; }
  local success="$ROTATION_EVIDENCE_DIR/ROTATION.SUCCESS"
  local manifest="$ROTATION_EVIDENCE_DIR/manifest.txt"
  local final_candidate="$ROTATION_EVIDENCE_DIR/final.Caddyfile"
  local final_live_hash="$ROTATION_EVIDENCE_DIR/final.live-caddyfile.sha256"
  assert_exact_regular_file "$success" 0 0 600 || return 1
  assert_exact_regular_file "$manifest" 0 0 600 || return 1
  assert_exact_regular_file "$final_candidate" 0 0 600 || return 1
  assert_exact_regular_file "$final_live_hash" 0 0 600 || return 1
  validate_success_age "$success" "$(date -u +%s)" || return 1
  [[ $(read_unique_manifest_value "$manifest" astro_ca_id) == "$ASTRO_CA_ID" ]] ||
    { die 'rotation manifest has the wrong Astro CA ID'; return 1; }
  [[ $(read_unique_manifest_value "$manifest" payroll_ca_id) == "$PAYROLL_CA_ID" ]] ||
    { die 'rotation manifest has the wrong Payroll CA ID'; return 1; }
  [[ $(sha256_file "$final_candidate") == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    { die 'rotation evidence final candidate differs from the reviewed SHA'; return 1; }
  [[ $(stat -c %s -- "$final_live_hash") -eq 65 &&
     $(<"$final_live_hash") == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    { die 'rotation evidence final live-Caddyfile hash is absent or differs from the reviewed SHA'; return 1; }
  grep -Fxq "$FINAL_SCHEMA_MARKER" "$final_candidate" ||
    { die 'rotation evidence final candidate lacks the exact final schema marker'; return 1; }
  local forbidden
  for forbidden in \
    FAILED \
    failed-new-storage \
    ROTATION.SUCCESS.REVOKED-BY-ROLLBACK \
    ROLLBACK.SUCCESS \
    ROLLBACK.FAILED \
    ROLLBACK.REFUSED.CONCURRENT-CHANGE; do
    assert_path_absent "$ROTATION_EVIDENCE_DIR/$forbidden" || return 1
  done
}

validate_refresh_installation() {
  assert_exact_regular_file "$REFRESH_HELPER" 0 0 755 || return 1
  assert_exact_regular_file "$REFRESH_SERVICE_FILE" 0 0 644 || return 1
  assert_exact_regular_file "$REFRESH_TIMER_FILE" 0 0 644 || return 1
  [[ $(sha256_file "$REFRESH_HELPER") == "$REVIEWED_REFRESH_HELPER_SHA256" ]] ||
    { die 'installed refresh helper differs from the reviewed SHA'; return 1; }
  [[ $(sha256_file "$REFRESH_SERVICE_FILE") == "$REVIEWED_REFRESH_SERVICE_SHA256" ]] ||
    { die 'installed refresh service differs from the reviewed SHA'; return 1; }
  [[ $(sha256_file "$REFRESH_TIMER_FILE") == "$REVIEWED_REFRESH_TIMER_SHA256" ]] ||
    { die 'installed refresh timer differs from the reviewed SHA'; return 1; }
  systemctl is-enabled --quiet "$REFRESH_TIMER_UNIT" ||
    { die 'certificate refresh timer is not enabled'; return 1; }
  systemctl is-active --quiet "$REFRESH_TIMER_UNIT" ||
    { die 'certificate refresh timer is not active'; return 1; }
  [[ $(systemctl show "$REFRESH_SERVICE_UNIT" -p FragmentPath --value) == "$REFRESH_SERVICE_FILE" ]] ||
    { die 'systemd loaded the refresh service from an unexpected path'; return 1; }
  [[ $(systemctl show "$REFRESH_TIMER_UNIT" -p FragmentPath --value) == "$REFRESH_TIMER_FILE" ]] ||
    { die 'systemd loaded the refresh timer from an unexpected path'; return 1; }
}

run_refresh_audit() {
  local phase=$1
  local output="$WORK_DIR/refresh-audit.$phase.log"
  validate_refresh_installation || return 1
  if ! "$REFRESH_HELPER" --audit >"$output" 2>&1; then
    sed -n '1,160p' "$output" >&2
    die "pinned refresh helper audit failed during $phase"
    return 1
  fi
  grep -Fq 'AUDIT PASS: exact final schema/file/effective JSON, 58 storage pairs, 29 applications, and 58 live chains' "$output" ||
    { die "refresh helper did not report the exact final PASS contract during $phase"; return 1; }
  log "Refresh helper audit PASS ($phase): final named storage/chains 58, local applications 29, Cloudflare edges 28."
}

capture_listener_snapshot() {
  local output_file=$1
  : >"$output_file"
  local port line_file
  for port in 80 443 2019; do
    line_file="$WORK_DIR/listener-$port.txt"
    ss -H -lntp "sport = :$port" | LC_ALL=C sort >"$line_file"
    [[ -s $line_file ]] || { die "Caddy has no listener on port $port"; return 1; }
    while IFS= read -r line; do
      [[ $line == *"pid=$BASELINE_MAIN_PID,"* ]] ||
        { die "port $port is not owned by Caddy MainPID $BASELINE_MAIN_PID"; return 1; }
      awk -v port="$port" '{print port "\t" $1 "\t" $4 "\t" $5 "\t" $NF}' <<<"$line" >>"$output_file"
    done <"$line_file"
  done
}

capture_service_baseline() {
  systemctl is-active --quiet "$CADDY_SERVICE" || die 'Caddy is not active'
  BASELINE_MAIN_PID=$(systemctl show "$CADDY_SERVICE" -p MainPID --value)
  BASELINE_NRESTARTS=$(systemctl show "$CADDY_SERVICE" -p NRestarts --value)
  [[ $BASELINE_MAIN_PID =~ ^[1-9][0-9]*$ ]] || die 'Caddy MainPID is invalid'
  [[ $BASELINE_NRESTARTS =~ ^[0-9]+$ ]] || die 'Caddy NRestarts is invalid'
  capture_listener_snapshot "$BASELINE_LISTENERS_FILE"
}

verify_service_invariants() {
  local pid restarts active sub exec_status current="$WORK_DIR/listeners.current.txt"
  pid=$(systemctl show "$CADDY_SERVICE" -p MainPID --value)
  restarts=$(systemctl show "$CADDY_SERVICE" -p NRestarts --value)
  active=$(systemctl show "$CADDY_SERVICE" -p ActiveState --value)
  sub=$(systemctl show "$CADDY_SERVICE" -p SubState --value)
  exec_status=$(systemctl show "$CADDY_SERVICE" -p ExecMainStatus --value)
  [[ $pid == "$BASELINE_MAIN_PID" ]] ||
    { die "Caddy MainPID changed: $BASELINE_MAIN_PID -> $pid"; return 1; }
  [[ $restarts == "$BASELINE_NRESTARTS" ]] ||
    { die "Caddy NRestarts changed: $BASELINE_NRESTARTS -> $restarts"; return 1; }
  [[ $active == active && $sub == running && $exec_status == 0 ]] ||
    { die "Caddy state is $active/$sub with ExecMainStatus=$exec_status"; return 1; }
  capture_listener_snapshot "$current" || return 1
  cmp -s "$BASELINE_LISTENERS_FILE" "$current" ||
    { die 'Caddy listener set changed'; return 1; }
}

validate_live_final_state() {
  local label=$1
  local adapted="$WORK_DIR/$label.adapted.json"
  local effective="$WORK_DIR/$label.effective.json"
  assert_canonical_directory / 0 >/dev/null || return 1
  assert_canonical_directory /etc 0 >/dev/null || return 1
  assert_canonical_directory /etc/caddy 0 >/dev/null || return 1
  assert_exact_regular_file "$LIVE_CADDYFILE" 0 "$CADDY_GID" 640 || return 1
  assert_exact_regular_file "$FINAL_PIN_FILE" 0 "$CADDY_GID" 640 || return 1
  [[ $(stat -c %s -- "$FINAL_PIN_FILE") -eq 65 ]] ||
    { die 'final pin must be 64 lowercase hex bytes plus newline'; return 1; }
  local pin
  pin=$(<"$FINAL_PIN_FILE")
  [[ $pin == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    { die 'final Caddyfile pin differs from the reviewed SHA'; return 1; }
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    { die 'live Caddyfile differs from the reviewed final SHA'; return 1; }
  [[ $(grep -Fxc "$FINAL_SCHEMA_MARKER" "$LIVE_CADDYFILE" || true) -eq 1 ]] ||
    { die 'live Caddyfile lacks exactly one final schema marker'; return 1; }
  [[ $(grep -Ec '^# C-01-REFRESH-SCHEMA: ' "$LIVE_CADDYFILE" || true) -eq 1 ]] ||
    { die 'live Caddyfile has a mixed or unknown refresh schema marker'; return 1; }
  cmp -s "$LIVE_CADDYFILE" "$ROTATION_EVIDENCE_DIR/final.Caddyfile" ||
    { die 'live Caddyfile bytes differ from the successful rotation final candidate'; return 1; }
  caddy adapt --adapter caddyfile --config "$LIVE_CADDYFILE" >"$adapted" 2>"$WORK_DIR/$label.adapt.stderr" ||
    { die 'Caddy could not adapt the exact live final file'; return 1; }
  jq -e . "$adapted" >/dev/null || { die 'adapted live Caddy JSON is invalid'; return 1; }
  curl --noproxy '*' -fsS --connect-timeout 2 --max-time 5 "$CADDY_ADMIN_URL/config/" >"$effective" ||
    { die 'could not read Caddy effective JSON'; return 1; }
  local adapted_sha effective_sha
  adapted_sha=$(canonical_json_sha256 "$adapted")
  effective_sha=$(canonical_json_sha256 "$effective")
  [[ $adapted_sha == "$effective_sha" ]] ||
    { die "effective Caddy JSON differs from the exact live file ($effective_sha != $adapted_sha)"; return 1; }
  validate_final_config_shape "$adapted" || return 1
  if [[ -z $EXPECTED_EFFECTIVE_CONFIG_SHA256 ]]; then
    EXPECTED_EFFECTIVE_CONFIG_SHA256=$adapted_sha
  else
    [[ $adapted_sha == "$EXPECTED_EFFECTIVE_CONFIG_SHA256" ]] ||
      { die 'final adapted/effective JSON changed during this run'; return 1; }
  fi
}

assert_storage_ancestry() {
  assert_root_ancestry / /var /var/lib
  local path
  for path in \
    /var/lib/caddy \
    /var/lib/caddy/.local \
    /var/lib/caddy/.local/share \
    "$CADDY_DATA_ROOT" \
    "$CADDY_DATA_ROOT/pki" \
    "$CADDY_DATA_ROOT/pki/authorities" \
    "$CADDY_DATA_ROOT/certificates"; do
    assert_canonical_directory "$path" "0:$CADDY_UID" >/dev/null || return 1
  done
}

assert_safe_relative_path() {
  local relative=$1
  [[ $relative == . || $relative =~ ^[A-Za-z0-9._/-]+$ ]] ||
    { die "unsafe Caddy storage path component: $relative"; return 1; }
  [[ $relative != /* && $relative != ../* && $relative != */../* && $relative != *'/..' ]] ||
    { die "unsafe traversal component in Caddy storage path: $relative"; return 1; }
  [[ $relative != *'|'* && $relative != *$'\n'* && $relative != *$'\r'* ]] ||
    { die "unsafe delimiter in Caddy storage path: $relative"; return 1; }
}

build_tree_manifest() {
  local root=$1
  local output=$2
  assert_canonical_directory "$root" "$CADDY_UID" "$CADDY_GID" 700 || return 1
  local root_device paths_file sorted_file
  root_device=$(stat -c %d -- "$root") || return 1
  paths_file="$output.paths.unsorted"
  sorted_file="$output.paths.sorted"
  find -P "$root" -xdev -print0 >"$paths_file" || return 1
  LC_ALL=C sort -z "$paths_file" >"$sorted_file" || return 1
  : >"$output" || return 1
  local path relative type uid gid mode nlink device inode mtime size digest
  while IFS= read -r -d '' path; do
    if [[ $path == "$root" ]]; then
      relative='.'
    else
      relative=${path#"$root"/}
    fi
    assert_safe_relative_path "$relative" || return 1
    IFS=: read -r type uid gid mode nlink device inode mtime size \
      < <(stat -c '%F:%u:%g:%a:%h:%d:%i:%Y:%s' -- "$path") || return 1
    [[ $device == "$root_device" ]] || { die "nested filesystem in retired local tree: $path"; return 1; }
    case $type in
      directory)
        [[ $uid == "$CADDY_UID" && $gid == "$CADDY_GID" && $mode == 700 ]] ||
          { die "$path directory metadata is $uid:$gid:$mode; expected caddy:caddy:700"; return 1; }
        if [[ ! $nlink =~ ^[0-9]+$ ]] || ((nlink < 2)); then
          die "$path has unsafe directory link count $nlink"
          return 1
        fi
        printf 'D|%s|%s|%s|%s|%s|%s|%s|%s\n' \
          "$relative" "$uid" "$gid" "$mode" "$nlink" "$device" "$inode" "$mtime" >>"$output" || return 1
        ;;
      'regular file')
        [[ $uid == "$CADDY_UID" && $gid == "$CADDY_GID" && $mode == 600 && $nlink == 1 ]] ||
          { die "$path file metadata is $uid:$gid:$mode:$nlink; expected caddy:caddy:600:1"; return 1; }
        digest=$(sha256_file "$path") || { die "cannot hash Caddy storage file: $path"; return 1; }
        printf 'F|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n' \
          "$relative" "$uid" "$gid" "$mode" "$nlink" "$device" "$inode" "$mtime" "$size" "$digest" \
          >>"$output" || return 1
        ;;
      *)
        die "retired local tree contains forbidden file type '$type': $path"
        return 1
        ;;
    esac
  done <"$sorted_file"
  [[ -s $output ]] || { die "empty Caddy storage tree: $root"; return 1; }
  chmod 0600 "$output" "$paths_file" "$sorted_file" || return 1
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

validate_local_authority_material() {
  local name path
  for name in root.crt root.key intermediate.crt intermediate.key; do
    path="$LOCAL_AUTHORITY_SOURCE/$name"
    assert_exact_regular_file "$path" "$CADDY_UID" "$CADDY_GID" 600 || return 1
  done
  [[ $(find -P "$LOCAL_AUTHORITY_SOURCE" -mindepth 1 -maxdepth 1 -print | wc -l) -eq 4 ]] ||
    { die 'retired local authority directory must contain exactly its four Caddy CA files'; return 1; }
  local root_spki intermediate_spki
  for name in root.crt intermediate.crt; do
    [[ $(grep -c -- '-----BEGIN CERTIFICATE-----' "$LOCAL_AUTHORITY_SOURCE/$name") -eq 1 ]] ||
      { die "$LOCAL_AUTHORITY_SOURCE/$name must contain exactly one public certificate"; return 1; }
    ! grep -Fq -- 'PRIVATE KEY-----' "$LOCAL_AUTHORITY_SOURCE/$name" ||
      { die "$LOCAL_AUTHORITY_SOURCE/$name contains private-key material"; return 1; }
  done
  root_spki=$(public_spki_sha256_from_cert "$LOCAL_AUTHORITY_SOURCE/root.crt")
  intermediate_spki=$(public_spki_sha256_from_cert "$LOCAL_AUTHORITY_SOURCE/intermediate.crt")
  [[ $root_spki == "$COMPROMISED_ROOT_SPKI_SHA256" ]] ||
    { die 'local authority root is not the exact compromised hierarchy being retired'; return 1; }
  [[ $root_spki == "$(public_spki_sha256_from_key "$LOCAL_AUTHORITY_SOURCE/root.key")" ]] ||
    { die 'local root certificate/private key mismatch'; return 1; }
  [[ $intermediate_spki == "$(public_spki_sha256_from_key "$LOCAL_AUTHORITY_SOURCE/intermediate.key")" ]] ||
    { die 'local intermediate certificate/private key mismatch'; return 1; }
  timeout 8 openssl verify -no_check_time -CAfile "$LOCAL_AUTHORITY_SOURCE/root.crt" \
    "$LOCAL_AUTHORITY_SOURCE/intermediate.crt" >/dev/null 2>&1 ||
    { die 'local intermediate does not validate to the retired local root'; return 1; }
}

validate_required_local_pairs() {
  local host host_dir cert key leaf embedded_intermediate
  while IFS= read -r host; do
    host_dir="$LOCAL_CERTIFICATES_SOURCE/$host"
    assert_canonical_directory "$host_dir" "$CADDY_UID" "$CADDY_GID" 700 || return 1
    cert="$host_dir/$host.crt"
    key="$host_dir/$host.key"
    assert_exact_regular_file "$cert" "$CADDY_UID" "$CADDY_GID" 600 || return 1
    assert_exact_regular_file "$key" "$CADDY_UID" "$CADDY_GID" 600 || return 1
    leaf="$WORK_DIR/legacy-leaf.pem"
    embedded_intermediate="$WORK_DIR/legacy-intermediate.pem"
    extract_chain_cert "$cert" 1 "$leaf" || { die "cannot extract retired leaf for $host"; return 1; }
    extract_chain_cert "$cert" 2 "$embedded_intermediate" ||
      { die "cannot extract retired intermediate for $host"; return 1; }
    [[ $(grep -c -- '-----BEGIN CERTIFICATE-----' "$cert") -eq 2 ]] ||
      { die "$host retired certificate file must contain exactly leaf and intermediate"; return 1; }
    ! grep -Fq -- 'PRIVATE KEY-----' "$cert" ||
      { die "$host retired certificate file contains private-key material"; return 1; }
    timeout 5 openssl x509 -in "$leaf" -noout -checkhost "$host" >/dev/null 2>&1 ||
      { die "$host is absent from its retired local certificate"; return 1; }
    [[ $(public_spki_sha256_from_cert "$leaf") == "$(public_spki_sha256_from_key "$key")" ]] ||
      { die "$host retired certificate/private key mismatch"; return 1; }
    timeout 8 openssl verify -no_check_time -purpose sslserver \
      -CAfile "$LOCAL_AUTHORITY_SOURCE/root.crt" -untrusted "$embedded_intermediate" "$leaf" >/dev/null 2>&1 ||
      { die "$host retired certificate chain does not validate to the compromised root"; return 1; }
  done < <(emit_expected_subjects)
}

validate_legacy_storage_and_capture() {
  assert_storage_ancestry || return 1
  build_tree_manifest "$LOCAL_AUTHORITY_SOURCE" "$AUTHORITY_BASELINE_MANIFEST" || return 1
  build_tree_manifest "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_BASELINE_MANIFEST" || return 1
  validate_local_authority_material || return 1
  validate_required_local_pairs || return 1
}

write_public_certificate_evidence() {
  local public_dir="$QUARANTINE_DIR/public-certificates"
  validate_local_authority_material || return 1
  assert_path_absent "$public_dir" || return 1
  install -d -o root -g root -m 0700 "$public_dir"
  assert_canonical_directory "$public_dir" 0 0 700 || return 1
  local root_sha_before intermediate_sha_before
  root_sha_before=$(sha256_file "$LOCAL_AUTHORITY_SOURCE/root.crt")
  intermediate_sha_before=$(sha256_file "$LOCAL_AUTHORITY_SOURCE/intermediate.crt")
  install -o root -g root -m 0600 "$LOCAL_AUTHORITY_SOURCE/root.crt" "$public_dir/root.crt"
  install -o root -g root -m 0600 "$LOCAL_AUTHORITY_SOURCE/intermediate.crt" "$public_dir/intermediate.crt"
  [[ $root_sha_before == "$(sha256_file "$LOCAL_AUTHORITY_SOURCE/root.crt")" &&
     $root_sha_before == "$(sha256_file "$public_dir/root.crt")" ]] ||
    { die 'retired root certificate changed during public-evidence capture'; return 1; }
  [[ $intermediate_sha_before == "$(sha256_file "$LOCAL_AUTHORITY_SOURCE/intermediate.crt")" &&
     $intermediate_sha_before == "$(sha256_file "$public_dir/intermediate.crt")" ]] ||
    { die 'retired intermediate changed during public-evidence capture'; return 1; }
  ! grep -Fq -- 'PRIVATE KEY-----' "$public_dir/root.crt" ||
    { die 'public root evidence unexpectedly contains private-key material'; return 1; }
  ! grep -Fq -- 'PRIVATE KEY-----' "$public_dir/intermediate.crt" ||
    { die 'public intermediate evidence unexpectedly contains private-key material'; return 1; }
  local output="$QUARANTINE_DIR/public-certificate-metadata.txt"
  : >"$output"
  local label cert
  for label in root intermediate; do
    cert="$LOCAL_AUTHORITY_SOURCE/$label.crt"
    printf '[%s]\nsha256=%s\nspki_sha256=%s\n' \
      "$label" "$(sha256_file "$cert")" "$(public_spki_sha256_from_cert "$cert")" >>"$output"
    timeout 5 openssl x509 -in "$cert" -noout -subject -issuer -serial -dates -fingerprint -sha256 >>"$output"
  done
  chmod 0600 "$output"
}

retain_refresh_audit_logs() {
  [[ -n $QUARANTINE_DIR && -d $QUARANTINE_DIR ]] || return 0
  local audit_log destination
  for audit_log in "$WORK_DIR"/refresh-audit.*.log; do
    [[ -e $audit_log || -L $audit_log ]] || continue
    assert_exact_regular_file "$audit_log" 0 0 600 || return 1
    destination="$QUARANTINE_DIR/${audit_log##*/}"
    if [[ -e $destination || -L $destination ]]; then
      assert_exact_regular_file "$destination" 0 0 600 || return 1
      [[ $(sha256_file "$destination") == "$(sha256_file "$audit_log")" ]] ||
        { die "retained refresh audit log has unknown content: $destination"; return 1; }
    else
      install -o root -g root -m 0600 "$audit_log" "$destination" || return 1
    fi
  done
}

create_quarantine_directory() {
  local stamp
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  QUARANTINE_DIR=$(mktemp -d "$ROTATION_EVIDENCE_DIR/retired-local-ca-quarantine-$stamp.XXXXXXXX")
  chown root:root "$QUARANTINE_DIR"
  chmod 0700 "$QUARANTINE_DIR"
  assert_canonical_directory "$QUARANTINE_DIR" 0 0 700
  QUARANTINE_LOG="$QUARANTINE_DIR/run.log"
  install -o root -g root -m 0600 /dev/null "$QUARANTINE_LOG"
  AUTHORITY_DESTINATION="$QUARANTINE_DIR/pki-authorities-local"
  CERTIFICATES_DESTINATION="$QUARANTINE_DIR/certificates-local"
  assert_path_absent "$AUTHORITY_DESTINATION"
  assert_path_absent "$CERTIFICATES_DESTINATION"
  [[ $(stat -c %d -- "$QUARANTINE_DIR") == $(stat -c %d -- "$LOCAL_AUTHORITY_SOURCE") ]] ||
    die 'rotation evidence and local authority are on different filesystems; atomic rename is impossible'
  [[ $(stat -c %d -- "$QUARANTINE_DIR") == $(stat -c %d -- "$LOCAL_CERTIFICATES_SOURCE") ]] ||
    die 'rotation evidence and local certificate storage are on different filesystems; atomic rename is impossible'
  install -o root -g root -m 0600 "$AUTHORITY_BASELINE_MANIFEST" "$QUARANTINE_DIR/pki-authorities-local.before.manifest"
  install -o root -g root -m 0600 "$CERTIFICATES_BASELINE_MANIFEST" "$QUARANTINE_DIR/certificates-local.before.manifest"
  write_public_certificate_evidence
  retain_refresh_audit_logs
  {
    printf 'started_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf 'rotation_evidence_dir=%s\n' "$ROTATION_EVIDENCE_DIR"
    printf 'reviewed_final_caddyfile_sha256=%s\n' "$REVIEWED_FINAL_CADDYFILE_SHA256"
    printf 'effective_config_sha256=%s\n' "$EXPECTED_EFFECTIVE_CONFIG_SHA256"
    printf 'soak_age_seconds=%s\n' "$SOAK_AGE_SECONDS"
    printf 'astro_ca_id=%s\n' "$ASTRO_CA_ID"
    printf 'payroll_ca_id=%s\n' "$PAYROLL_CA_ID"
    printf 'retired_root_spki_sha256=%s\n' "$COMPROMISED_ROOT_SPKI_SHA256"
    printf 'refresh_helper_sha256=%s\n' "$REVIEWED_REFRESH_HELPER_SHA256"
    printf 'refresh_service_sha256=%s\n' "$REVIEWED_REFRESH_SERVICE_SHA256"
    printf 'refresh_timer_sha256=%s\n' "$REVIEWED_REFRESH_TIMER_SHA256"
    printf 'authority_tree_manifest_sha256=%s\n' "$(sha256_file "$AUTHORITY_BASELINE_MANIFEST")"
    printf 'certificates_tree_manifest_sha256=%s\n' "$(sha256_file "$CERTIFICATES_BASELINE_MANIFEST")"
    printf 'baseline_main_pid=%s\n' "$BASELINE_MAIN_PID"
    printf 'baseline_nrestarts=%s\n' "$BASELINE_NRESTARTS"
  } >"$QUARANTINE_DIR/manifest.txt"
  chmod 0600 "$QUARANTINE_DIR/manifest.txt"
}

compare_tree_to_manifest() {
  local root=$1
  local expected=$2
  local label=$3
  local current="$WORK_DIR/$label.current.manifest"
  build_tree_manifest "$root" "$current" || return 1
  cmp -s "$expected" "$current" || { die "$label tree changed from its validated manifest"; return 1; }
}

rehash_live_effective_fast() {
  local label=$1
  local effective="$WORK_DIR/$label.fast-effective.json"
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    { die 'live Caddyfile changed immediately before atomic move'; return 1; }
  [[ $(<"$FINAL_PIN_FILE") == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    { die 'final pin changed immediately before atomic move'; return 1; }
  curl --noproxy '*' -fsS --connect-timeout 2 --max-time 5 "$CADDY_ADMIN_URL/config/" >"$effective" ||
    { die 'could not re-read effective Caddy JSON immediately before atomic move'; return 1; }
  [[ $(canonical_json_sha256 "$effective") == "$EXPECTED_EFFECTIVE_CONFIG_SHA256" ]] ||
    { die 'effective Caddy JSON changed immediately before atomic move'; return 1; }
}

move_known_tree() {
  local source=$1
  local destination=$2
  local expected_manifest=$3
  local label=$4
  assert_path_absent "$destination" || return 1
  [[ $(stat -c %d -- "$source") == $(stat -c %d -- "${destination%/*}") ]] ||
    { die "$label source and destination are not on one filesystem"; return 1; }
  compare_tree_to_manifest "$source" "$expected_manifest" "$label-pre-move" || return 1
  rehash_live_effective_fast "$label-pre-move" || return 1
  compare_tree_to_manifest "$source" "$expected_manifest" "$label-final-pre-move" || return 1
  mv -T -n -- "$source" "$destination" || return 1
  assert_path_absent "$source" || return 1
  compare_tree_to_manifest "$destination" "$expected_manifest" "$label-post-move" || return 1
}

restore_one_known_tree() {
  local source=$1
  local destination=$2
  local expected_manifest=$3
  local label=$4
  if [[ -d $source && ! -L $source && ! -e $destination && ! -L $destination ]]; then
    compare_tree_to_manifest "$source" "$expected_manifest" "$label-untouched" || return 1
    return 0
  fi
  if [[ ! -e $source && ! -L $source && -d $destination && ! -L $destination ]]; then
    compare_tree_to_manifest "$destination" "$expected_manifest" "$label-before-restore" || return 1
    [[ $(stat -c %d -- "$destination") == $(stat -c %d -- "${source%/*}") ]] ||
      { die "$label cannot be restored atomically across filesystems"; return 1; }
    mv -T -n -- "$destination" "$source" || return 1
    assert_path_absent "$destination" || return 1
    compare_tree_to_manifest "$source" "$expected_manifest" "$label-after-restore" || return 1
    return 0
  fi
  die "$label restore refused: source/destination state is unknown and nothing will be overwritten"
  return 1
}

restore_transaction() {
  local restore_ok='true'
  log 'Automatic restore: returning any exact known legacy trees in reverse order.'
  restore_one_known_tree "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_DESTINATION" \
    "$CERTIFICATES_BASELINE_MANIFEST" certificates || restore_ok='false'
  restore_one_known_tree "$LOCAL_AUTHORITY_SOURCE" "$AUTHORITY_DESTINATION" \
    "$AUTHORITY_BASELINE_MANIFEST" authority || restore_ok='false'
  if [[ $restore_ok == true ]]; then
    validate_rotation_evidence || restore_ok='false'
    validate_live_final_state restore || restore_ok='false'
    verify_service_invariants || restore_ok='false'
    run_refresh_audit restore || restore_ok='false'
  fi
  retain_refresh_audit_logs || restore_ok='false'
  if [[ $restore_ok == true ]]; then
    printf 'restored_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >"$QUARANTINE_DIR/RESTORE.SUCCESS"
    chmod 0600 "$QUARANTINE_DIR/RESTORE.SUCCESS"
    log 'Automatic restore PASS: both exact trees and all final service/health gates are verified.'
    return 0
  fi
  printf 'restore_verification_failed_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    >"$QUARANTINE_DIR/RESTORE.FAILED"
  chmod 0600 "$QUARANTINE_DIR/RESTORE.FAILED"
  log 'CRITICAL: automatic restore could not be fully verified; inspect the root-private evidence.' >&2
  return 1
}

cleanup_exit() {
  local rc=$?
  set +e
  release_refresh_lock || true
  if [[ $TRANSACTION_ARMED == true && $RUN_COMPLETE != true && -n $QUARANTINE_DIR ]]; then
    if [[ -f "$QUARANTINE_DIR/QUARANTINE.SUCCESS" && ! -L "$QUARANTINE_DIR/QUARANTINE.SUCCESS" ]]; then
      if [[ ! -e "$QUARANTINE_DIR/QUARANTINE.SUCCESS.REVOKED-BY-RESTORE" &&
            ! -L "$QUARANTINE_DIR/QUARANTINE.SUCCESS.REVOKED-BY-RESTORE" ]]; then
        mv -T -n -- "$QUARANTINE_DIR/QUARANTINE.SUCCESS" \
          "$QUARANTINE_DIR/QUARANTINE.SUCCESS.REVOKED-BY-RESTORE" || true
      fi
    fi
    printf 'failed_utc=%s\nexit_status=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$rc" \
      >"$QUARANTINE_DIR/QUARANTINE.FAILED"
    chmod 0600 "$QUARANTINE_DIR/QUARANTINE.FAILED"
    restore_transaction || true
  elif [[ $RUN_COMPLETE != true && -n $QUARANTINE_DIR ]]; then
    printf 'failed_utc=%s\nexit_status=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$rc" \
      >"$QUARANTINE_DIR/QUARANTINE.FAILED"
    chmod 0600 "$QUARANTINE_DIR/QUARANTINE.FAILED"
  fi
  retain_refresh_audit_logs || true
  if [[ -n $WORK_DIR && -d $WORK_DIR ]]; then
    case $WORK_DIR in
      /run/astro-caddy-local-ca-quarantine-work.*) rm -r -- "$WORK_DIR" ;;
      *) log "refusing unsafe work-directory cleanup path: $WORK_DIR" ;;
    esac
  fi
  return "$rc"
}

exit_for_signal() {
  local rc=$1
  trap - HUP INT TERM
  exit "$rc"
}

run_common_audit() {
  validate_rotation_evidence
  validate_refresh_installation
  capture_service_baseline
  validate_live_final_state initial
  validate_legacy_storage_and_capture
  verify_service_invariants
  run_refresh_audit pre-quarantine
  validate_rotation_evidence
  validate_live_final_state after-refresh-audit
  compare_tree_to_manifest "$LOCAL_AUTHORITY_SOURCE" "$AUTHORITY_BASELINE_MANIFEST" authority-after-audit
  compare_tree_to_manifest "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_BASELINE_MANIFEST" certificates-after-audit
  verify_service_invariants
}

run_audit() {
  run_common_audit
  log "AUDIT PASS: final SHA/schema/pin/effective config, successful $SOAK_AGE_SECONDS-second soak, exact legacy trees, refresh audit, 58 chains, 29 applications, 28 edges, PID and listeners."
  log 'No Caddyfile, Caddy service, certificate storage, Cloudflare setting, firewall, or rotation evidence was changed.'
}

run_apply() {
  [[ $EXPECTED_CADDYFILE_SHA256 == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
    die "--apply requires --expected-caddyfile-sha256 $REVIEWED_FINAL_CADDYFILE_SHA256"
  [[ $CONFIRM_QUARANTINE == "$APPLY_CONFIRMATION" ]] ||
    die "--apply requires --confirm-quarantine $APPLY_CONFIRMATION"
  run_common_audit
  acquire_refresh_lock
  validate_rotation_evidence
  validate_live_final_state locked-pre-transaction
  compare_tree_to_manifest "$LOCAL_AUTHORITY_SOURCE" "$AUTHORITY_BASELINE_MANIFEST" authority-locked
  compare_tree_to_manifest "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_BASELINE_MANIFEST" certificates-locked
  verify_service_invariants
  create_quarantine_directory
  TRANSACTION_ARMED='true'

  # The final config references neither tree.  Move the authority first so the
  # compromised signing key becomes unavailable at the earliest atomic step;
  # if the second rename fails, the EXIT trap restores this first rename.
  validate_rotation_evidence
  validate_live_final_state before-authority-move
  verify_service_invariants
  compare_tree_to_manifest "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_BASELINE_MANIFEST" certificates-before-authority
  move_known_tree "$LOCAL_AUTHORITY_SOURCE" "$AUTHORITY_DESTINATION" \
    "$AUTHORITY_BASELINE_MANIFEST" authority

  validate_rotation_evidence
  validate_live_final_state before-certificates-move
  verify_service_invariants
  compare_tree_to_manifest "$AUTHORITY_DESTINATION" "$AUTHORITY_BASELINE_MANIFEST" authority-before-certificates
  move_known_tree "$LOCAL_CERTIFICATES_SOURCE" "$CERTIFICATES_DESTINATION" \
    "$CERTIFICATES_BASELINE_MANIFEST" certificates

  compare_tree_to_manifest "$AUTHORITY_DESTINATION" "$AUTHORITY_BASELINE_MANIFEST" authority-final
  compare_tree_to_manifest "$CERTIFICATES_DESTINATION" "$CERTIFICATES_BASELINE_MANIFEST" certificates-final
  assert_path_absent "$LOCAL_AUTHORITY_SOURCE"
  assert_path_absent "$LOCAL_CERTIFICATES_SOURCE"
  validate_rotation_evidence
  validate_live_final_state post-move
  verify_service_invariants
  release_refresh_lock
  run_refresh_audit post-quarantine
  retain_refresh_audit_logs
  validate_rotation_evidence
  validate_live_final_state final
  verify_service_invariants
  compare_tree_to_manifest "$AUTHORITY_DESTINATION" "$AUTHORITY_BASELINE_MANIFEST" authority-post-health
  compare_tree_to_manifest "$CERTIFICATES_DESTINATION" "$CERTIFICATES_BASELINE_MANIFEST" certificates-post-health

  local success_tmp="$QUARANTINE_DIR/.QUARANTINE.SUCCESS.tmp"
  {
    printf 'completed_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf 'authority_destination=%s\n' "$AUTHORITY_DESTINATION"
    printf 'certificates_destination=%s\n' "$CERTIFICATES_DESTINATION"
  } >"$success_tmp"
  chmod 0600 "$success_tmp"
  mv -T -n -- "$success_tmp" "$QUARANTINE_DIR/QUARANTINE.SUCCESS"
  assert_path_absent "$success_tmp"
  assert_exact_regular_file "$QUARANTINE_DIR/QUARANTINE.SUCCESS" 0 0 600
  RUN_COMPLETE='true'
  TRANSACTION_ARMED='false'
  log "QUARANTINE PASS: retired local CA material moved reversibly to $QUARANTINE_DIR"
  log 'Caddy was not reloaded or restarted; final named CA chains, applications, edges, PID, and listeners stayed healthy.'
}

parse_args() {
  while (($#)); do
    case $1 in
      --audit)
        [[ -z $MODE_SEEN ]] || { die 'specify exactly one of --audit or --apply'; return 1; }
        MODE='audit'
        MODE_SEEN='audit'
        shift
        ;;
      --apply)
        [[ -z $MODE_SEEN ]] || { die 'specify exactly one of --audit or --apply'; return 1; }
        MODE='apply'
        MODE_SEEN='apply'
        shift
        ;;
      --rotation-evidence-dir)
        (($# >= 2)) || { die '--rotation-evidence-dir requires a value'; return 1; }
        [[ -z $ROTATION_EVIDENCE_DIR ]] || { die '--rotation-evidence-dir may be specified only once'; return 1; }
        ROTATION_EVIDENCE_DIR=$2
        shift 2
        ;;
      --expected-caddyfile-sha256)
        (($# >= 2)) || { die '--expected-caddyfile-sha256 requires a value'; return 1; }
        [[ -z $EXPECTED_CADDYFILE_SHA256 ]] ||
          { die '--expected-caddyfile-sha256 may be specified only once'; return 1; }
        EXPECTED_CADDYFILE_SHA256=$2
        shift 2
        ;;
      --confirm-quarantine)
        (($# >= 2)) || { die '--confirm-quarantine requires a value'; return 1; }
        [[ -z $CONFIRM_QUARANTINE ]] || { die '--confirm-quarantine may be specified only once'; return 1; }
        CONFIRM_QUARANTINE=$2
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "unknown argument: $1"
        return 1
        ;;
    esac
  done
  [[ -n $ROTATION_EVIDENCE_DIR ]] ||
    { die '--rotation-evidence-dir is required in audit and apply modes'; return 1; }
  validate_evidence_path_string "$ROTATION_EVIDENCE_DIR" || return 1
  if [[ $MODE == audit ]]; then
    [[ -z $EXPECTED_CADDYFILE_SHA256 && -z $CONFIRM_QUARANTINE ]] ||
      { die 'apply confirmation options are forbidden in audit mode'; return 1; }
  fi
}

main() {
  parse_args "$@"
  [[ $EUID -eq 0 ]] || die 'must run as root'
  local command
  for command in awk caddy cmp curl date find flock grep id install jq mktemp mv openssl readlink sed sha256sum sort ss stat systemctl timeout; do
    require_command "$command"
  done
  resolve_caddy_identity
  acquire_rotation_lock
  create_work_directory
  trap cleanup_exit EXIT
  trap 'exit_for_signal 129' HUP
  trap 'exit_for_signal 130' INT
  trap 'exit_for_signal 143' TERM
  if [[ $MODE == apply ]]; then
    run_apply
  else
    run_audit
    RUN_COMPLETE='true'
  fi
  trap - HUP INT TERM
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main "$@"
fi
