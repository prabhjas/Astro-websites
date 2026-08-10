#!/usr/bin/env bash
# C-01: rotate the leaked Caddy CA without replacing the live Caddyfile wholesale.
#
# Default mode is a read-only audit.  The apply path is deliberately gated by
# the SHA-256 of the reviewed live file and always derives every candidate from
# those exact captured bytes.  It never reads caddy/Caddyfile.production.
#
# The apply sequence is:
#   1. Prewarm two new, disjoint internal PKIs on loopback-only ports and verify
#      every stored leaf certificate, private key, and chain.
#   2. Each transitioned site synchronously loads its verified named-CA stored
#      certificate/key pair during Provision while force_automate keeps that
#      same named internal certificate managed.  This bridge is required:
#      Caddy 2.11.4 otherwise evicts the old managed certificate before its
#      asynchronous storage load, which can create a no-certificate window.
#   3. Canary c-uae.com, then roll the 28 Cloudflare sites in three waves onto
#      the fresh Astro named CA.  Cloudflare remains in owner-approved Full mode.
#   4. Publish a final config with all 56 Cloudflare subjects on that named CA,
#      both Payroll subjects on a disjoint named CA, and zero `local` issuers.
#   5. Install the hash-pinned, fail-closed manual-certificate refresh helper
#      and timer in the same transaction, pinned to the exact final Caddyfile.
#
# This script intentionally does NOT delete the old `local` storage namespace,
# change Cloudflare settings, rewrite Git history, restart Caddy, or install a
# tracked Caddyfile over the live one.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

readonly REVIEWED_CADDYFILE_SHA256='b882cfeb2558adf82edc4c56a0f3ee8ba21d3a12465d457712ab3fe840b50139'
readonly REVIEWED_FINAL_CADDYFILE_SHA256='82aaa881339358f3b6b00d555f70ffb55ccd0628dee9598b27a001299c34d076'
readonly REVIEWED_ROLLBACK_CADDYFILE_SHA256='7e549afaeb3c5ddf5b13e51558b75bacffa82c3d7b9b1fcc69cbfbbee0533c15'
readonly COMPROMISED_ROOT_SPKI_SHA256='01255cc20dbb7f6842821121d5566f23871c5d912b712b458a6681fa323c38c5'
readonly COMPROMISED_INTERMEDIATE_SPKI_SHA256='a804cdc839f8dcb54ff08f6faf0eed24c1b374c470b8196ebfc6198d779a6b32'
readonly LIVE_CADDYFILE='/etc/caddy/Caddyfile'
readonly CADDY_SERVICE='caddy.service'
readonly CADDY_BINARY='/usr/bin/caddy'
readonly REVIEWED_CADDY_VERSION='v2.11.4 h1:XKxkMTgNSizEvKG6QHue6cAsFOteU2qA61w2tKkCWi0='
readonly REVIEWED_CADDY_BINARY_SHA256='b7105518e3ed1c0761f232e44fc09345535533c9cb0abf0e12809416c7ac64d9'
readonly CADDY_ADMIN_ADDRESS='127.0.0.1:2019'
readonly CADDY_ADMIN_URL='http://127.0.0.1:2019'
readonly CADDY_DATA_ROOT='/var/lib/caddy/.local/share/caddy'
readonly ASTRO_CA_ID='astro_origin_2026'
readonly PAYROLL_CA_ID='payroll_origin_isolated_2026'
readonly PREWARM_HTTPS_PORT='9443'
readonly PREWARM_ADMIN_PORT='12019'
readonly EVIDENCE_BASE='/opt/deploy-backups/caddy-ca-rotation'
readonly LOCK_DIR='/run/astro-caddy-ca-rotation-lock'
readonly LOCK_FILE="$LOCK_DIR/rotation.lock"
readonly EXPECTED_SITE_COUNT='29'
readonly EXPECTED_SUBJECT_COUNT='58'
readonly EXPECTED_CF_APEX_COUNT='28'
readonly EXPECTED_CF_SUBJECT_COUNT='56'
readonly PREWARM_TIMEOUT_SECONDS='180'
readonly CHAIN_CONVERGENCE_TIMEOUT_SECONDS='90'
readonly PREWARM_STOP_TIMEOUT_SECONDS='30'
readonly LOCAL_ROLLBACK_RENEWAL_TIMEOUT_SECONDS='600'
readonly REFRESH_SERVICE_QUIESCE_TIMEOUT_SECONDS='300'
readonly ASTRO_LEAF_LIFETIME='120h'
readonly PAYROLL_LEAF_LIFETIME='120h'
readonly REFRESH_HELPER_SOURCE='/opt/scripts/ops/refresh-caddy-loaded-certificates.sh'
readonly REFRESH_SERVICE_SOURCE='/opt/scripts/ops/systemd/astro-caddy-certificate-refresh.service'
readonly REFRESH_TIMER_SOURCE='/opt/scripts/ops/systemd/astro-caddy-certificate-refresh.timer'
readonly REFRESH_HELPER_SOURCE_SHA256='306d9045ec4a12e39b2e999dc2e0db6979057d6b43975713b6c68a31e4f734f2'
readonly REFRESH_SERVICE_SOURCE_SHA256='a665c39aa1c74c7905d2a5f352e2eff17142b68158f6c4321597b8419f77e7b8'
readonly REFRESH_TIMER_SOURCE_SHA256='09f7b43f1ac8b7e871e4e9a67a078b96cafd9e033792022e6d444a3ad0f4011d'
readonly REFRESH_HELPER_DEST='/usr/local/sbin/astro-caddy-certificate-refresh'
readonly REFRESH_SERVICE_DEST='/etc/systemd/system/astro-caddy-certificate-refresh.service'
readonly REFRESH_TIMER_DEST='/etc/systemd/system/astro-caddy-certificate-refresh.timer'
readonly REFRESH_TIMER_LINK='/etc/systemd/system/timers.target.wants/astro-caddy-certificate-refresh.timer'
readonly REFRESH_PIN_FILE='/etc/caddy/c01-manual-cert-refresh.expected-sha256'
readonly REFRESH_SERVICE_UNIT='astro-caddy-certificate-refresh.service'
readonly REFRESH_TIMER_UNIT='astro-caddy-certificate-refresh.timer'

# Canary first, then three cumulative waves: 1, 10, 19, 28 sites.
readonly -a CF_ROLLOUT_ORDER=(
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
readonly PAYROLL_APEX='payrollmiddleast.org'
readonly -a APPLY_STAGES=('canary' 'wave1' 'wave2' 'wave3' 'final')

MODE='audit'
EXPECTED_CADDYFILE_SHA256=''
WORK_DIR=''
EVIDENCE_DIR=''
EVIDENCE_LOG=''
PREWARM_UNIT=''
HEALTH_SAMPLER_PID=''
HEALTH_SAMPLER_FILE=''
ROLLBACK_ARMED=0
ROLLBACK_RUNNING=0
ORIGINAL_CADDYFILE=''
ORIGINAL_CADDYFILE_SHA256=''
ORIGINAL_CONFIG_SHA256=''
ROLLBACK_BRIDGE_CADDYFILE=''
ROLLBACK_BRIDGE_CADDYFILE_SHA256=''
ROLLBACK_BRIDGE_CONFIG_SHA256=''
REFRESH_SNAPSHOT_DIR=''
REFRESH_HELPER_SNAPSHOT=''
REFRESH_SERVICE_SNAPSHOT=''
REFRESH_TIMER_SNAPSHOT=''
BASELINE_MAIN_PID=''
BASELINE_NRESTARTS=''
PUBLISH_IN_PROGRESS_SHA256=''
RUN_ID=''
CADDY_UID=''
CADDY_GID=''
declare -A KNOWN_LIVE_SHA256=()

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
  sudo bash scripts/ops/rotate-caddy-ca-no-downtime.sh
  sudo bash scripts/ops/rotate-caddy-ca-no-downtime.sh --audit
  sudo bash scripts/ops/rotate-caddy-ca-no-downtime.sh \
    --apply \
    --expected-caddyfile-sha256 b882cfeb2558adf82edc4c56a0f3ee8ba21d3a12465d457712ab3fe840b50139

No arguments means read-only audit.  --apply is rejected unless the reviewed
SHA is supplied explicitly and the exact live Caddyfile still has that SHA.
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

assert_canonical_directory() {
  local path=$1
  local allowed_uids=$2
  local required_mode=${3:-}
  [[ -d $path && ! -L $path ]] || die "$path must be a non-symlink directory"
  [[ $(readlink -e -- "$path") == "$path" ]] || die "$path is not canonical"
  local uid gid mode nlink mode_value
  IFS=: read -r uid gid mode nlink < <(stat -c '%u:%g:%a:%h' -- "$path")
  case ":$allowed_uids:" in
    *":$uid:"*) ;;
    *) die "$path has unexpected owner uid=$uid" ;;
  esac
  [[ $mode =~ ^[0-7]{3,4}$ ]] || die "$path has invalid mode $mode"
  mode_value=$((8#$mode))
  (( (mode_value & 0022) == 0 )) || die "$path is group/other writable (mode $mode)"
  [[ $nlink =~ ^[0-9]+$ ]] && ((nlink >= 2)) || die "$path has unsafe directory link count $nlink"
  if [[ -n $required_mode && $mode != "$required_mode" ]]; then
    die "$path has mode $mode; expected $required_mode"
  fi
  printf '%s:%s:%s:%s\n' "$uid" "$gid" "$mode" "$nlink"
}

assert_exact_caddy_directory() {
  local path=$1
  local required_mode=${2:-700}
  local metadata
  metadata=$(assert_canonical_directory "$path" "$CADDY_UID" "$required_mode")
  [[ $metadata == "$CADDY_UID:$CADDY_GID:$required_mode:"* ]] ||
    die "$path must be caddy:caddy mode $required_mode (got $metadata)"
}

assert_root_owned_ancestry() {
  local path
  for path in "$@"; do
    assert_canonical_directory "$path" 0 >/dev/null
  done
}

assert_exact_root_directory() {
  local path=$1
  local required_mode=${2:-700}
  local metadata
  metadata=$(assert_canonical_directory "$path" 0 "$required_mode")
  [[ $metadata == "0:0:$required_mode:"* ]] || die "$path must be root:root mode $required_mode (got $metadata)"
}

assert_storage_ancestry() {
  assert_root_owned_ancestry / /var /var/lib
  local path
  for path in \
    /var/lib/caddy \
    /var/lib/caddy/.local \
    /var/lib/caddy/.local/share \
    "$CADDY_DATA_ROOT" \
    "$CADDY_DATA_ROOT/pki" \
    "$CADDY_DATA_ROOT/pki/authorities" \
    "$CADDY_DATA_ROOT/certificates"; do
    assert_canonical_directory "$path" "0:$CADDY_UID" >/dev/null
  done
}

assert_path_absent_including_symlink() {
  local path=$1
  [[ ! -e $path && ! -L $path ]] || die "path must not already exist (including symlink): $path"
}

assert_exact_regular_numeric() {
  local path=$1
  local expected_uid=$2
  local expected_gid=$3
  local expected_mode=$4
  [[ -f $path && ! -L $path ]] || die "$path must be a non-symlink regular file"
  [[ $(readlink -e -- "$path") == "$path" ]] || die "$path is not canonical"
  [[ $(stat -c '%u:%g:%a:%h' -- "$path") == "$expected_uid:$expected_gid:$expected_mode:1" ]] ||
    die "$path has unsafe metadata"
}

preflight_caddy_binary() {
  [[ $(command -v caddy) == "$CADDY_BINARY" ]] || die 'PATH does not resolve caddy to the reviewed binary'
  assert_exact_regular_numeric "$CADDY_BINARY" 0 0 755
  [[ $(sha256_file "$CADDY_BINARY") == "$REVIEWED_CADDY_BINARY_SHA256" ]] ||
    die 'installed Caddy binary differs from the reviewed build'
  [[ $("$CADDY_BINARY" version) == "$REVIEWED_CADDY_VERSION" ]] ||
    die 'installed Caddy version differs from the reviewed v2.11.4 build'
}

assert_reviewed_refresh_source() {
  local path=$1
  local expected_sha=$2
  local expected_mode=$3
  assert_exact_regular_numeric "$path" 0 0 "$expected_mode"
  [[ $(sha256_file "$path") == "$expected_sha" ]] || die "reviewed refresh artifact hash mismatch: $path"
}

verify_refresh_source_artifacts() {
  assert_root_owned_ancestry / /opt /opt/scripts /opt/scripts/ops /opt/scripts/ops/systemd
  assert_reviewed_refresh_source "$REFRESH_HELPER_SOURCE" "$REFRESH_HELPER_SOURCE_SHA256" 755
  assert_reviewed_refresh_source "$REFRESH_SERVICE_SOURCE" "$REFRESH_SERVICE_SOURCE_SHA256" 644
  assert_reviewed_refresh_source "$REFRESH_TIMER_SOURCE" "$REFRESH_TIMER_SOURCE_SHA256" 644
  bash -n "$REFRESH_HELPER_SOURCE"
}

preflight_refresh_destinations() {
  assert_root_owned_ancestry / /usr /usr/local /usr/local/sbin /etc /etc/systemd /etc/systemd/system
  assert_canonical_directory /etc/caddy 0 >/dev/null
  local path
  for path in \
    "$REFRESH_HELPER_DEST" \
    "$REFRESH_SERVICE_DEST" \
    "$REFRESH_TIMER_DEST" \
    "$REFRESH_TIMER_LINK" \
    "$REFRESH_PIN_FILE"; do
    assert_path_absent_including_symlink "$path"
  done
}

snapshot_reviewed_refresh_artifact() {
  local source=$1
  local destination=$2
  local expected_sha=$3
  local expected_mode=$4
  local before snapshot after
  assert_reviewed_refresh_source "$source" "$expected_sha" "$expected_mode"
  before=$(sha256_file "$source")
  install -o root -g root -m 0600 "$source" "$destination"
  snapshot=$(sha256_file "$destination")
  after=$(sha256_file "$source")
  [[ $before == "$expected_sha" && $snapshot == "$before" && $after == "$before" ]] ||
    die "refresh artifact changed during root-private snapshot: $source"
  assert_exact_regular_numeric "$destination" 0 0 600
}

snapshot_refresh_artifacts() {
  verify_refresh_source_artifacts
  REFRESH_SNAPSHOT_DIR="$EVIDENCE_DIR/refresh-support"
  assert_path_absent_including_symlink "$REFRESH_SNAPSHOT_DIR"
  install -d -o root -g root -m 0700 "$REFRESH_SNAPSHOT_DIR"
  assert_exact_root_directory "$REFRESH_SNAPSHOT_DIR" 700
  REFRESH_HELPER_SNAPSHOT="$REFRESH_SNAPSHOT_DIR/astro-caddy-certificate-refresh"
  REFRESH_SERVICE_SNAPSHOT="$REFRESH_SNAPSHOT_DIR/astro-caddy-certificate-refresh.service"
  REFRESH_TIMER_SNAPSHOT="$REFRESH_SNAPSHOT_DIR/astro-caddy-certificate-refresh.timer"
  snapshot_reviewed_refresh_artifact "$REFRESH_HELPER_SOURCE" "$REFRESH_HELPER_SNAPSHOT" "$REFRESH_HELPER_SOURCE_SHA256" 755
  snapshot_reviewed_refresh_artifact "$REFRESH_SERVICE_SOURCE" "$REFRESH_SERVICE_SNAPSHOT" "$REFRESH_SERVICE_SOURCE_SHA256" 644
  snapshot_reviewed_refresh_artifact "$REFRESH_TIMER_SOURCE" "$REFRESH_TIMER_SNAPSHOT" "$REFRESH_TIMER_SOURCE_SHA256" 644
}

atomic_install_refresh_artifact() {
  local source=$1
  local destination=$2
  local expected_sha=$3
  local destination_mode=$4
  assert_exact_regular_numeric "$source" 0 0 600
  [[ $(sha256_file "$source") == "$expected_sha" ]] || die "refresh evidence artifact hash mismatch: $source"
  local parent=${destination%/*}
  assert_root_owned_ancestry "$parent"
  if [[ -e $destination || -L $destination ]]; then
    assert_exact_regular_numeric "$destination" 0 0 "$destination_mode"
    [[ $(sha256_file "$destination") == "$expected_sha" ]] ||
      die "refusing to overwrite unknown refresh artifact: $destination"
    return 0
  fi
  local base=${destination##*/}
  local temp
  temp=$(mktemp "$parent/.$base.c01.XXXXXXXX")
  install -o root -g root -m "$destination_mode" "$source" "$temp"
  assert_exact_regular_numeric "$temp" 0 0 "$destination_mode"
  [[ $(sha256_file "$temp") == "$expected_sha" ]] || die "staged refresh artifact hash mismatch: $destination"
  assert_path_absent_including_symlink "$destination"
  [[ $(sha256_file "$source") == "$expected_sha" ]] || die "refresh evidence artifact changed before publication: $source"
  mv -T -- "$temp" "$destination"
  assert_exact_regular_numeric "$destination" 0 0 "$destination_mode"
  [[ $(sha256_file "$destination") == "$expected_sha" ]] || die "published refresh artifact hash mismatch: $destination"
}

atomic_pin_refresh_caddyfile_sha() {
  local expected_sha=$1
  [[ $expected_sha == "$REVIEWED_FINAL_CADDYFILE_SHA256" || $expected_sha == "$REVIEWED_ROLLBACK_CADDYFILE_SHA256" ]] ||
    die 'refusing to pin an unreviewed Caddyfile SHA for certificate refresh'
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$expected_sha" ]] ||
    die 'live Caddyfile does not match the requested certificate-refresh pin'
  local prior_hash=''
  if [[ -e $REFRESH_PIN_FILE || -L $REFRESH_PIN_FILE ]]; then
    assert_exact_regular_numeric "$REFRESH_PIN_FILE" 0 "$CADDY_GID" 640
    local prior_value
    prior_value=$(<"$REFRESH_PIN_FILE")
    [[ $prior_value == "$REVIEWED_FINAL_CADDYFILE_SHA256" || $prior_value == "$REVIEWED_ROLLBACK_CADDYFILE_SHA256" ]] ||
      die 'refusing to overwrite an unknown certificate-refresh pin'
    prior_hash=$(sha256_file "$REFRESH_PIN_FILE")
  fi
  local temp
  temp=$(mktemp /etc/caddy/.c01-manual-cert-refresh.expected-sha256.XXXXXXXX)
  printf '%s\n' "$expected_sha" >"$temp"
  chown root:"$CADDY_GID" "$temp"
  chmod 0640 "$temp"
  assert_exact_regular_numeric "$temp" 0 "$CADDY_GID" 640
  if [[ -n $prior_hash ]]; then
    [[ $(sha256_file "$REFRESH_PIN_FILE") == "$prior_hash" ]] || die 'certificate-refresh pin changed during publication'
  else
    assert_path_absent_including_symlink "$REFRESH_PIN_FILE"
  fi
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$expected_sha" ]] || die 'live Caddyfile changed before certificate-refresh pin publication'
  mv -T -- "$temp" "$REFRESH_PIN_FILE"
  assert_exact_regular_numeric "$REFRESH_PIN_FILE" 0 "$CADDY_GID" 640
  [[ $(<"$REFRESH_PIN_FILE") == "$expected_sha" ]] || die 'published certificate-refresh pin mismatch'
}

verify_installed_refresh_support() {
  local expected_pin=$1
  assert_exact_regular_numeric "$REFRESH_HELPER_DEST" 0 0 755
  assert_exact_regular_numeric "$REFRESH_SERVICE_DEST" 0 0 644
  assert_exact_regular_numeric "$REFRESH_TIMER_DEST" 0 0 644
  [[ $(sha256_file "$REFRESH_HELPER_DEST") == "$REFRESH_HELPER_SOURCE_SHA256" ]] || die 'installed refresh helper hash mismatch'
  [[ $(sha256_file "$REFRESH_SERVICE_DEST") == "$REFRESH_SERVICE_SOURCE_SHA256" ]] || die 'installed refresh service hash mismatch'
  [[ $(sha256_file "$REFRESH_TIMER_DEST") == "$REFRESH_TIMER_SOURCE_SHA256" ]] || die 'installed refresh timer hash mismatch'
  assert_exact_regular_numeric "$REFRESH_PIN_FILE" 0 "$CADDY_GID" 640
  [[ $(<"$REFRESH_PIN_FILE") == "$expected_pin" ]] || die 'installed refresh pin mismatch'
  systemd-analyze verify "$REFRESH_SERVICE_DEST" "$REFRESH_TIMER_DEST"
}

quiesce_refresh_support_if_present() {
  local service_present=0 timer_present=0
  if [[ -e $REFRESH_SERVICE_DEST || -L $REFRESH_SERVICE_DEST ]]; then
    service_present=1
    assert_exact_regular_numeric "$REFRESH_SERVICE_DEST" 0 0 644
    [[ $(sha256_file "$REFRESH_SERVICE_DEST") == "$REFRESH_SERVICE_SOURCE_SHA256" ]] ||
      die 'refusing to quiesce an unknown same-named refresh service'
  fi
  if [[ -e $REFRESH_TIMER_DEST || -L $REFRESH_TIMER_DEST ]]; then
    timer_present=1
    assert_exact_regular_numeric "$REFRESH_TIMER_DEST" 0 0 644
    [[ $(sha256_file "$REFRESH_TIMER_DEST") == "$REFRESH_TIMER_SOURCE_SHA256" ]] ||
      die 'refusing to quiesce an unknown same-named refresh timer'
  fi
  [[ $service_present -eq 1 && $timer_present -eq 1 ]] || return 0
  systemctl daemon-reload
  systemctl stop "$REFRESH_TIMER_UNIT"
  local deadline=$((SECONDS + REFRESH_SERVICE_QUIESCE_TIMEOUT_SECONDS))
  local quiet_since=-1 active sub job
  while :; do
    active=$(systemctl show "$REFRESH_SERVICE_UNIT" -p ActiveState --value)
    sub=$(systemctl show "$REFRESH_SERVICE_UNIT" -p SubState --value)
    job=$(systemctl show "$REFRESH_SERVICE_UNIT" -p Job --value)
    if [[ $active == failed ]]; then
      systemctl reset-failed "$REFRESH_SERVICE_UNIT" >/dev/null 2>&1 || true
      quiet_since=-1
    elif [[ $active == inactive && $sub == dead && -z $job ]]; then
      ((quiet_since >= 0)) || quiet_since=$SECONDS
      ((SECONDS - quiet_since >= 5)) && break
    elif [[ $active == active || $active == activating || $active == deactivating || $active == reloading || -n $job ]]; then
      quiet_since=-1
    else
      die "certificate-refresh service has unexpected state $active/$sub job=${job:-none}"
    fi
    ((SECONDS < deadline)) || die 'active certificate-refresh service did not quiesce; refusing concurrent Caddy publication'
    sleep 0.2
  done
}

install_and_enable_refresh_support() {
  local expected_pin=$1
  [[ -n $REFRESH_SNAPSHOT_DIR && -d $REFRESH_SNAPSHOT_DIR ]] || die 'root-private refresh artifact snapshots are unavailable'
  atomic_install_refresh_artifact "$REFRESH_HELPER_SNAPSHOT" "$REFRESH_HELPER_DEST" "$REFRESH_HELPER_SOURCE_SHA256" 755
  atomic_install_refresh_artifact "$REFRESH_SERVICE_SNAPSHOT" "$REFRESH_SERVICE_DEST" "$REFRESH_SERVICE_SOURCE_SHA256" 644
  atomic_install_refresh_artifact "$REFRESH_TIMER_SNAPSHOT" "$REFRESH_TIMER_DEST" "$REFRESH_TIMER_SOURCE_SHA256" 644
  atomic_pin_refresh_caddyfile_sha "$expected_pin"
  verify_installed_refresh_support "$expected_pin"
  systemctl daemon-reload
  systemctl reset-failed "$REFRESH_SERVICE_UNIT" >/dev/null 2>&1 || true
  "$REFRESH_HELPER_DEST" --audit
  systemctl enable "$REFRESH_TIMER_UNIT"
  [[ $(systemctl is-enabled "$REFRESH_TIMER_UNIT") == enabled ]] || die 'certificate-refresh timer is not enabled'
  verify_installed_refresh_support "$expected_pin"
  {
    printf '%s  %s\n' "$REFRESH_HELPER_SOURCE_SHA256" "$REFRESH_HELPER_DEST"
    printf '%s  %s\n' "$REFRESH_SERVICE_SOURCE_SHA256" "$REFRESH_SERVICE_DEST"
    printf '%s  %s\n' "$REFRESH_TIMER_SOURCE_SHA256" "$REFRESH_TIMER_DEST"
    printf '%s  %s\n' "$expected_pin" "$REFRESH_PIN_FILE"
  } >"$EVIDENCE_DIR/refresh-support-installed.sha256"
}

start_and_quiesce_refresh_timer() {
  systemctl start "$REFRESH_TIMER_UNIT"
  systemctl is-active --quiet "$REFRESH_TIMER_UNIT" || die 'certificate-refresh timer is not active'
  # Persistent timers may immediately enqueue their oneshot on first start.
  # Keep rollback armed and require an inactive/dead service with no queued
  # transition for a continuous five-second window before committing success.
  local deadline=$((SECONDS + REFRESH_SERVICE_QUIESCE_TIMEOUT_SECONDS))
  local quiet_since=-1 active sub job result exec_status
  while :; do
    active=$(systemctl show "$REFRESH_SERVICE_UNIT" -p ActiveState --value)
    sub=$(systemctl show "$REFRESH_SERVICE_UNIT" -p SubState --value)
    job=$(systemctl show "$REFRESH_SERVICE_UNIT" -p Job --value)
    result=$(systemctl show "$REFRESH_SERVICE_UNIT" -p Result --value)
    exec_status=$(systemctl show "$REFRESH_SERVICE_UNIT" -p ExecMainStatus --value)
    [[ $active != failed && $result != failed ]] || die 'certificate-refresh oneshot failed during timer activation'
    if [[ $active == inactive && $sub == dead && -z $job ]]; then
      ((quiet_since >= 0)) || quiet_since=$SECONDS
      if ((SECONDS - quiet_since >= 5)); then
        [[ $exec_status == 0 ]] || die "certificate-refresh oneshot has ExecMainStatus=$exec_status"
        break
      fi
    else
      quiet_since=-1
    fi
    ((SECONDS < deadline)) || die 'certificate-refresh oneshot did not quiesce after timer activation'
    sleep 0.2
  done
  systemctl is-active --quiet "$REFRESH_TIMER_UNIT" || die 'certificate-refresh timer stopped during activation gate'
}

stage_site_limit() {
  case "$1" in
    canary) printf '1\n' ;;
    wave1) printf '10\n' ;;
    wave2) printf '19\n' ;;
    wave3|final) printf '28\n' ;;
    *) die "unknown stage: $1" ;;
  esac
}

stage_transitioned_csv() {
  local stage=$1
  local limit
  limit=$(stage_site_limit "$stage")
  local csv=''
  local i
  for ((i = 0; i < limit; i++)); do
    if [[ -n $csv ]]; then
      csv+=','
    fi
    csv+="${CF_ROLLOUT_ORDER[$i]}"
  done
  printf '%s\n' "$csv"
}

stage_contains_apex() {
  local stage=$1
  local wanted=$2
  local limit
  limit=$(stage_site_limit "$stage")
  local i
  for ((i = 0; i < limit; i++)); do
    [[ ${CF_ROLLOUT_ORDER[$i]} == "$wanted" ]] && return 0
  done
  return 1
}

emit_expected_subjects() {
  local apex
  for apex in "${CF_ROLLOUT_ORDER[@]}" "$PAYROLL_APEX"; do
    printf '%s\nwww.%s\n' "$apex" "$apex"
  done | LC_ALL=C sort
}

emit_cf_subjects() {
  local apex
  for apex in "${CF_ROLLOUT_ORDER[@]}"; do
    printf '%s\nwww.%s\n' "$apex" "$apex"
  done | LC_ALL=C sort
}

emit_payroll_subjects() {
  printf '%s\nwww.%s\n' "$PAYROLL_APEX" "$PAYROLL_APEX" | LC_ALL=C sort
}

assert_expected_subject_file() {
  local actual=$1
  local expected
  expected=$(mktemp "$WORK_DIR/expected-subjects.XXXXXX")
  emit_expected_subjects >"$expected"
  LC_ALL=C sort -u "$actual" -o "$actual"
  [[ $(wc -l <"$actual") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    die "expected $EXPECTED_SUBJECT_COUNT unique subjects in $actual"
  cmp -s "$expected" "$actual" || {
    diff -u "$expected" "$actual" >&2 || true
    die 'effective subjects do not match the reviewed 58-name allowlist'
  }
}

render_candidate() {
  local source_file=$1
  local output_file=$2
  local stage=$3
  local transitioned_csv
  transitioned_csv=$(stage_transitioned_csv "$stage")

  awk \
    -v stage="$stage" \
    -v transitioned_csv="$transitioned_csv" \
    -v astro_ca="$ASTRO_CA_ID" \
    -v payroll_ca="$PAYROLL_CA_ID" \
    -v payroll_apex="$PAYROLL_APEX" \
    -v data_root="$CADDY_DATA_ROOT" \
    -v astro_lifetime="$ASTRO_LEAF_LIFETIME" \
    -v payroll_lifetime="$PAYROLL_LEAF_LIFETIME" \
    -v schema_marker="$( [[ $stage == final ]] && printf 'named-internal-manual-v1' || printf 'rotation-in-progress-v1' )" \
    '
    function emit_pki() {
      print "\tauto_https ignore_loaded_certs"
      print "\tpki {"
      print "\t\tca " astro_ca " {"
      print "\t\t\tname \"Astro Origin Authority 2026\""
      print "\t\t\troot_cn \"Astro Origin Authority 2026 ECC Root\""
      print "\t\t\tintermediate_cn \"Astro Origin Authority 2026 ECC Intermediate\""
      print "\t\t}"
      print "\t\tca " payroll_ca " {"
      print "\t\t\tname \"Payroll Origin Isolated Authority 2026\""
      print "\t\t\troot_cn \"Payroll Origin Isolated Authority 2026 ECC Root\""
      print "\t\t\tintermediate_cn \"Payroll Origin Isolated Authority 2026 ECC Intermediate\""
      print "\t\t}"
      print "\t}"
    }
    function emit_manual_pair(cert_path, key_path) {
      print "\ttls " cert_path " " key_path
    }
    function emit_named_internal(apex, ca_id, lifetime, host, cert_base) {
      print "\ttls force_automate {"
      print "\t\tissuer internal {"
      print "\t\t\tca " ca_id
      print "\t\t\tlifetime " lifetime
      print "\t\t}"
      print "\t}"
      host = apex
      cert_base = data_root "/certificates/" ca_id "/" host "/" host
      emit_manual_pair(cert_base ".crt", cert_base ".key")
      host = "www." apex
      cert_base = data_root "/certificates/" ca_id "/" host "/" host
      emit_manual_pair(cert_base ".crt", cert_base ".key")
    }
    BEGIN {
      print "# C-01-REFRESH-SCHEMA: " schema_marker
      n = split(transitioned_csv, transitioned, ",")
      for (i = 1; i <= n; i++) selected[transitioned[i]] = 1
      global_started = 0
      global_depth = 0
      injected = 0
      site_count = 0
      replacement_count = 0
      current_apex = ""
    }
    {
      line = $0
      if (!global_started && line == "{") {
        global_started = 1
        global_depth = 1
        print line
        next
      }
      if (global_started && !injected) {
        opens = gsub(/{/, "{", line)
        closes = gsub(/}/, "}", line)
        if ((global_depth + opens - closes) == 0) {
          emit_pki()
          injected = 1
        }
        global_depth += opens - closes
      }
      if (line ~ /^[^#[:space:]][^[:space:]]*,[[:space:]][^[:space:]]+[[:space:]]+\{$/ && line !~ /^http:/) {
        split(line, header_parts, ",")
        current_apex = header_parts[1]
        site_count++
      }
      if (line ~ /^[[:space:]]*tls[[:space:]]+internal[[:space:]]*$/) {
        replacement_count++
        if (current_apex == payroll_apex) {
          if (stage == "final") emit_named_internal(payroll_apex, payroll_ca, payroll_lifetime)
          else print line
        } else if (current_apex in selected) {
          emit_named_internal(current_apex, astro_ca, astro_lifetime)
        } else {
          print line
        }
        next
      }
      print line
    }
    END {
      if (injected != 1 || site_count != 29 || replacement_count != 29) {
        print "unsafe transform counts: injected=" injected ", sites=" site_count ", tls=" replacement_count > "/dev/stderr"
        exit 42
      }
    }
  ' "$source_file" >"$output_file"
}

render_rollback_bridge() {
  local source_file=$1
  local output_file=$2
  awk -v data_root="$CADDY_DATA_ROOT" '
    function emit_local_bridge(apex, host, cert_base) {
      print "\ttls force_automate {"
      print "\t\trenewal_window_ratio 0.99"
      print "\t\tissuer internal {"
      print "\t\t\tca local"
      print "\t\t\tlifetime 120h"
      print "\t\t}"
      print "\t}"
      host = apex
      cert_base = data_root "/certificates/local/" host "/" host
      print "\ttls " cert_base ".crt " cert_base ".key"
      host = "www." apex
      cert_base = data_root "/certificates/local/" host "/" host
      print "\ttls " cert_base ".crt " cert_base ".key"
    }
    BEGIN {
      print "# C-01-REFRESH-SCHEMA: rollback-local-manual-v1"
      global_started = 0
      global_depth = 0
      injected = 0
      site_count = 0
      replacement_count = 0
      current_apex = ""
    }
    {
      line = $0
      if (!global_started && line == "{") {
        global_started = 1
        global_depth = 1
        print line
        next
      }
      if (global_started && !injected) {
        opens = gsub(/{/, "{", line)
        closes = gsub(/}/, "}", line)
        if ((global_depth + opens - closes) == 0) {
          print "\tauto_https ignore_loaded_certs"
          injected = 1
        }
        global_depth += opens - closes
      }
      if (line ~ /^[^#[:space:]][^[:space:]]*,[[:space:]][^[:space:]]+[[:space:]]+\{$/ && line !~ /^http:/) {
        split(line, header_parts, ",")
        current_apex = header_parts[1]
        site_count++
      }
      if (line ~ /^[[:space:]]*tls[[:space:]]+internal[[:space:]]*$/) {
        replacement_count++
        emit_local_bridge(current_apex)
        next
      }
      print line
    }
    END {
      if (injected != 1 || site_count != 29 || replacement_count != 29) {
        print "unsafe rollback transform counts: injected=" injected ", sites=" site_count ", tls=" replacement_count > "/dev/stderr"
        exit 43
      }
    }
  ' "$source_file" >"$output_file"
}

validate_rollback_bridge_shape() {
  local config_file=$1
  local json_file=$2
  adapt_config "$config_file" "$json_file"
  grep -Fxq '# C-01-REFRESH-SCHEMA: rollback-local-manual-v1' "$config_file" || die 'rollback bridge schema marker missing'
  local subjects_file
  subjects_file=$(mktemp "$WORK_DIR/rollback-subjects.XXXXXX")
  jq -r '.apps.tls.automation.policies[]?.subjects[]?' "$json_file" >"$subjects_file"
  assert_expected_subject_file "$subjects_file"
  [[ $(jq '[.apps.tls.automation.policies[] | select((.subjects | length) == 58 and (.issuers | length) == 1 and .issuers[0].module == "internal" and .issuers[0].ca == "local" and .issuers[0].lifetime == 432000000000000)] | length' "$json_file") -eq 1 ]] ||
    die 'rollback bridge does not have one bounded 58-subject local issuer policy'
  [[ $(jq '[.apps.tls.automation.policies[] | select(.renewal_window_ratio == 0.99)] | length' "$json_file") -eq 1 ]] ||
    die 'rollback bridge does not force prompt local renewal'
  [[ $(jq '[.apps.tls.certificates.load_files[]?] | length' "$json_file") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    die 'rollback bridge does not manually load 58 local pairs'
  [[ $(jq '[.apps.tls.certificates.automate[]?] | length' "$json_file") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    die 'rollback bridge does not automate 58 local subjects'
  jq -e --arg prefix "$CADDY_DATA_ROOT/certificates/local/" '
    all(.apps.tls.certificates.load_files[];
      (.certificate | startswith($prefix)) and (.key | startswith($prefix)))
  ' "$json_file" >/dev/null || die 'rollback bridge loads a non-local certificate path'
}

render_prewarm_config() {
  local output_file=$1
  local cf_labels=''
  local payroll_labels=''
  local host
  while IFS= read -r host; do
    [[ -n $cf_labels ]] && cf_labels+=', '
    cf_labels+="https://${host}:${PREWARM_HTTPS_PORT}"
  done < <(emit_cf_subjects)
  while IFS= read -r host; do
    [[ -n $payroll_labels ]] && payroll_labels+=', '
    payroll_labels+="https://${host}:${PREWARM_HTTPS_PORT}"
  done < <(emit_payroll_subjects)

  {
    printf '{\n'
    printf '\tadmin 127.0.0.1:%s\n' "$PREWARM_ADMIN_PORT"
    printf '\tauto_https disable_redirects\n'
    printf '\tskip_install_trust\n'
    printf '\tservers {\n\t\tprotocols h1 h2\n\t}\n'
    printf '\tpki {\n'
    printf '\t\tca %s {\n' "$ASTRO_CA_ID"
    printf '\t\t\tname "Astro Origin Authority 2026"\n'
    printf '\t\t\troot_cn "Astro Origin Authority 2026 ECC Root"\n'
    printf '\t\t\tintermediate_cn "Astro Origin Authority 2026 ECC Intermediate"\n'
    printf '\t\t}\n'
    printf '\t\tca %s {\n' "$PAYROLL_CA_ID"
    printf '\t\t\tname "Payroll Origin Isolated Authority 2026"\n'
    printf '\t\t\troot_cn "Payroll Origin Isolated Authority 2026 ECC Root"\n'
    printf '\t\t\tintermediate_cn "Payroll Origin Isolated Authority 2026 ECC Intermediate"\n'
    printf '\t\t}\n\t}\n}\n\n'
    printf '%s {\n' "$cf_labels"
    printf '\tbind 127.0.0.1\n'
    printf '\ttls {\n\t\tissuer internal {\n\t\t\tca %s\n\t\t\tlifetime %s\n\t\t}\n\t}\n' "$ASTRO_CA_ID" "$ASTRO_LEAF_LIFETIME"
    printf '\trespond 204\n}\n\n'
    printf '%s {\n' "$payroll_labels"
    printf '\tbind 127.0.0.1\n'
    printf '\ttls {\n\t\tissuer internal {\n\t\t\tca %s\n\t\t\tlifetime %s\n\t\t}\n\t}\n' "$PAYROLL_CA_ID" "$PAYROLL_LEAF_LIFETIME"
    printf '\trespond 204\n}\n'
  } >"$output_file"
}

adapt_config() {
  local config_file=$1
  local output_json=$2
  "$CADDY_BINARY" adapt --adapter caddyfile --config "$config_file" >"$output_json" 2>"${output_json}.stderr"
  jq -e . "$output_json" >/dev/null
}

validate_candidate_shape() {
  local config_file=$1
  local stage=$2
  local json_file=$3
  adapt_config "$config_file" "$json_file"

  local subjects_file
  subjects_file=$(mktemp "$WORK_DIR/candidate-subjects.XXXXXX")
  jq -r '.apps.tls.automation.policies[]?.subjects[]?' "$json_file" >"$subjects_file"
  assert_expected_subject_file "$subjects_file"

  local expected_transition_count
  expected_transition_count=$(stage_site_limit "$stage")
  local apex host policy_count issuer_count first_module ca lifetime
  for apex in "${CF_ROLLOUT_ORDER[@]}"; do
    for host in "$apex" "www.$apex"; do
      policy_count=$(jq --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))] | length' "$json_file")
      [[ $policy_count -eq 1 ]] || die "$stage candidate has $policy_count policies for $host"
      issuer_count=$(jq --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers | length' "$json_file")
      first_module=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].module' "$json_file")
      if stage_contains_apex "$stage" "$apex"; then
        ca=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].ca' "$json_file")
        lifetime=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].lifetime' "$json_file")
        [[ $issuer_count -eq 1 && $first_module == internal && $ca == "$ASTRO_CA_ID" && $lifetime == 432000000000000 ]] ||
          die "$stage candidate Astro issuer is wrong for $host"
      else
        [[ $issuer_count -eq 1 && $first_module == internal ]] || die "$stage candidate unexpectedly changes $host"
        ca=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].ca // "local"' "$json_file")
        [[ $ca == local ]] || die "$stage candidate unexpectedly changes $host from local"
      fi
    done
  done

  for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
    issuer_count=$(jq --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers | length' "$json_file")
    first_module=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].module' "$json_file")
    ca=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].ca // "local"' "$json_file")
    [[ $issuer_count -eq 1 && $first_module == internal ]] || die "$stage candidate has unsafe Payroll issuers"
    if [[ $stage == final ]]; then
      lifetime=$(jq -r --arg host "$host" '[.apps.tls.automation.policies[] | select((.subjects // []) | index($host))][0].issuers[0].lifetime' "$json_file")
      [[ $ca == "$PAYROLL_CA_ID" && $lifetime == 432000000000000 ]] || die "$stage candidate does not isolate Payroll safely"
    else
      [[ $ca == local ]] || die "$stage candidate changes Payroll before the final gate"
    fi
  done

  jq -e --arg id "$ASTRO_CA_ID" '.apps.pki.certificate_authorities[$id] != null' "$json_file" >/dev/null ||
    die "$stage candidate does not provision the Astro CA"
  jq -e --arg id "$PAYROLL_CA_ID" '.apps.pki.certificate_authorities[$id] != null' "$json_file" >/dev/null ||
    die "$stage candidate does not provision the Payroll CA"

  local expected_loaders actual_loaders expected_automate_count cert_base
  expected_loaders=$(mktemp "$WORK_DIR/$stage.expected-loaders.XXXXXX")
  actual_loaders=$(mktemp "$WORK_DIR/$stage.actual-loaders.XXXXXX")
  local limit i
  limit=$(stage_site_limit "$stage")
  : >"$expected_loaders"
  for ((i = 0; i < limit; i++)); do
    apex=${CF_ROLLOUT_ORDER[$i]}
    for host in "$apex" "www.$apex"; do
      cert_base="$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID/$host/$host"
      printf '%s.crt|%s.key\n' "$cert_base" "$cert_base" >>"$expected_loaders"
    done
  done
  if [[ $stage == final ]]; then
    for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
      cert_base="$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID/$host/$host"
      printf '%s.crt|%s.key\n' "$cert_base" "$cert_base" >>"$expected_loaders"
    done
  fi
  jq -r '.apps.tls.certificates.load_files[]? | "\(.certificate)|\(.key)"' "$json_file" | LC_ALL=C sort >"$actual_loaders"
  LC_ALL=C sort -o "$expected_loaders" "$expected_loaders"
  cmp -s "$expected_loaders" "$actual_loaders" || {
    diff -u "$expected_loaders" "$actual_loaders" >&2 || true
    die "$stage candidate manual certificate loader set is wrong"
  }
  expected_automate_count=$((limit * 2))
  if [[ $stage == final ]]; then
    expected_automate_count=$((expected_automate_count + 2))
  fi
  [[ $(jq '[.apps.tls.certificates.automate[]?] | length' "$json_file") -eq $expected_automate_count ]] ||
    die "$stage candidate force_automate subject count is wrong"
  [[ $(jq '[.apps.http.servers[].automatic_https.ignore_loaded_certificates | select(. == true)] | length' "$json_file") -ge 1 ]] ||
    die "$stage candidate does not enable automation for manually loaded certificates"
  if [[ $stage == final ]]; then
    [[ $(jq '.apps.tls.automation.policies | length' "$json_file") -eq 2 ]] ||
      die 'final candidate does not have exactly two grouped automation policies'
    jq -e --arg astro "$ASTRO_CA_ID" --arg payroll "$PAYROLL_CA_ID" '
      (.apps.pki.certificate_authorities | keys | sort) == ([$astro, $payroll] | sort)
    ' "$json_file" >/dev/null || die 'final candidate PKI app is not limited to the two new named authorities'
  fi
  [[ $expected_transition_count -ge 1 ]] || die 'invalid empty transition wave'
}

preflight_live_file() {
  assert_root_owned_ancestry / /etc /etc/caddy
  [[ -f $LIVE_CADDYFILE && ! -L $LIVE_CADDYFILE ]] || die "$LIVE_CADDYFILE must be a non-symlink regular file"
  local metadata
  metadata=$(stat -c '%U:%G:%a:%h' "$LIVE_CADDYFILE")
  [[ $metadata == 'root:caddy:640:1' ]] || die "unsafe live Caddyfile metadata: $metadata"
  local actual_sha
  actual_sha=$(sha256_file "$LIVE_CADDYFILE")
  [[ $actual_sha == "$REVIEWED_CADDYFILE_SHA256" ]] ||
    die "live Caddyfile drifted: expected $REVIEWED_CADDYFILE_SHA256, got $actual_sha"
  [[ $(grep -Ec '^[[:space:]]*tls[[:space:]]+internal[[:space:]]*$' "$LIVE_CADDYFILE") -eq $EXPECTED_SITE_COUNT ]] ||
    die 'live Caddyfile does not contain exactly 29 reviewed tls internal directives'
  ! grep -Fq "$ASTRO_CA_ID" "$LIVE_CADDYFILE" || die 'Astro CA already appears in live Caddyfile'
  ! grep -Fq "$PAYROLL_CA_ID" "$LIVE_CADDYFILE" || die 'Payroll CA already appears in live Caddyfile'
  ! grep -Eq '^[[:space:]]*auto_https[[:space:]]' "$LIVE_CADDYFILE" || die 'live Caddyfile already has an auto_https setting; manual review required'
}

capture_and_compare_live_config() {
  local source_file=$1
  local adapted_json=$2
  local live_json=$3
  adapt_config "$source_file" "$adapted_json"
  curl -fsS --max-time 5 "$CADDY_ADMIN_URL/config/" >"$live_json"
  local adapted_sha live_sha
  adapted_sha=$(canonical_json_sha256 "$adapted_json")
  live_sha=$(canonical_json_sha256 "$live_json")
  [[ $adapted_sha == "$live_sha" ]] || die "effective Caddy JSON does not match the live file ($live_sha != $adapted_sha)"
  local subjects_file
  subjects_file=$(mktemp "$WORK_DIR/live-subjects.XXXXXX")
  jq -r '.apps.tls.automation.policies[]?.subjects[]?' "$live_json" >"$subjects_file"
  assert_expected_subject_file "$subjects_file"
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

capture_service_baseline() {
  systemctl is-active --quiet "$CADDY_SERVICE" || die 'Caddy is not active'
  BASELINE_MAIN_PID=$(systemctl show "$CADDY_SERVICE" -p MainPID --value)
  BASELINE_NRESTARTS=$(systemctl show "$CADDY_SERVICE" -p NRestarts --value)
  [[ $BASELINE_MAIN_PID =~ ^[1-9][0-9]*$ ]] || die 'Caddy MainPID is invalid'
  [[ $BASELINE_NRESTARTS == 0 ]] || die "Caddy already has NRestarts=$BASELINE_NRESTARTS"
  verify_running_caddy_binary "$BASELINE_MAIN_PID"
  local port line
  for port in 80 443 2019; do
    line=$(ss -H -lntp "sport = :$port")
    [[ $line == *"pid=$BASELINE_MAIN_PID,"* ]] || die "Caddy MainPID does not own port $port"
  done
}

verify_service_invariants() {
  local current_pid current_restarts active sub exec_status
  current_pid=$(systemctl show "$CADDY_SERVICE" -p MainPID --value)
  current_restarts=$(systemctl show "$CADDY_SERVICE" -p NRestarts --value)
  active=$(systemctl show "$CADDY_SERVICE" -p ActiveState --value)
  sub=$(systemctl show "$CADDY_SERVICE" -p SubState --value)
  exec_status=$(systemctl show "$CADDY_SERVICE" -p ExecMainStatus --value)
  [[ $current_pid == "$BASELINE_MAIN_PID" ]] || die "Caddy PID changed: $BASELINE_MAIN_PID -> $current_pid"
  [[ $current_restarts == "$BASELINE_NRESTARTS" ]] || die "Caddy NRestarts changed: $BASELINE_NRESTARTS -> $current_restarts"
  [[ $active == active && $sub == running && $exec_status == 0 ]] ||
    die "Caddy state is $active/$sub with ExecMainStatus=$exec_status"
  verify_running_caddy_binary "$current_pid"
  local port line
  for port in 80 443 2019; do
    line=$(ss -H -lntp "sport = :$port")
    [[ $line == *"pid=$BASELINE_MAIN_PID,"* ]] || die "Caddy MainPID no longer owns port $port"
  done
}

extract_chain_cert() {
  local raw_file=$1
  local ordinal=$2
  local output_file=$3
  awk -v wanted="$ordinal" '
    /-----BEGIN CERTIFICATE-----/ { n++; if (n == wanted) printing = 1 }
    printing { print }
    /-----END CERTIFICATE-----/ { if (printing) exit }
  ' "$raw_file" >"$output_file"
}

public_spki_sha256_from_cert() {
  openssl x509 -in "$1" -noout -pubkey |
    openssl pkey -pubin -outform DER 2>/dev/null |
    sha256sum | awk '{print $1}'
}

public_spki_sha256_from_key() {
  openssl pkey -in "$1" -pubout 2>/dev/null |
    openssl pkey -pubin -outform DER 2>/dev/null |
    sha256sum | awk '{print $1}'
}

assert_spki_not_historically_exposed() {
  local spki=$1
  local label=$2
  [[ $spki =~ ^[0-9a-f]{64}$ ]] || die "$label has an invalid SPKI SHA-256"
  [[ $spki != "$COMPROMISED_ROOT_SPKI_SHA256" && \
     $spki != "$COMPROMISED_INTERMEDIATE_SPKI_SHA256" ]] ||
    die "$label reused historically exposed CA key material"
}

assert_four_ca_spkis_pairwise_unique() {
  [[ $# -eq 4 ]] || die 'exactly four new CA SPKIs are required'
  [[ $(printf '%s\n' "$@" | LC_ALL=C sort -u | wc -l) -eq 4 ]] ||
    die 'Astro and Payroll root/intermediate keys are not pairwise unique'
}

assert_ca_material() {
  local ca_id=$1
  local ca_dir="$CADDY_DATA_ROOT/pki/authorities/$ca_id"
  assert_exact_caddy_directory "$ca_dir" 700
  local name metadata
  for name in root.crt root.key intermediate.crt intermediate.key; do
    [[ -f "$ca_dir/$name" && ! -L "$ca_dir/$name" ]] || die "missing CA material: $ca_dir/$name"
    metadata=$(stat -c '%U:%G:%a:%h' "$ca_dir/$name")
    [[ $metadata == 'caddy:caddy:600:1' ]] || die "unsafe CA material metadata $metadata for $ca_dir/$name"
  done
  local cert_spki key_spki
  cert_spki=$(public_spki_sha256_from_cert "$ca_dir/root.crt")
  key_spki=$(public_spki_sha256_from_key "$ca_dir/root.key")
  [[ $cert_spki == "$key_spki" ]] || die "$ca_id root certificate/key mismatch"
  assert_spki_not_historically_exposed "$cert_spki" "$ca_id root"
  cert_spki=$(public_spki_sha256_from_cert "$ca_dir/intermediate.crt")
  key_spki=$(public_spki_sha256_from_key "$ca_dir/intermediate.key")
  [[ $cert_spki == "$key_spki" ]] || die "$ca_id intermediate certificate/key mismatch"
  assert_spki_not_historically_exposed "$cert_spki" "$ca_id intermediate"
}

assert_distinct_new_ca_keys() {
  local astro_root="$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/root.crt"
  local payroll_root="$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/root.crt"
  local astro_intermediate="$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID/intermediate.crt"
  local payroll_intermediate="$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID/intermediate.crt"
  local astro_spki payroll_spki astro_intermediate_spki payroll_intermediate_spki
  astro_spki=$(public_spki_sha256_from_cert "$astro_root")
  payroll_spki=$(public_spki_sha256_from_cert "$payroll_root")
  [[ $astro_spki != "$payroll_spki" ]] || die 'Astro and Payroll CAs unexpectedly share a root key'
  astro_intermediate_spki=$(public_spki_sha256_from_cert "$astro_intermediate")
  payroll_intermediate_spki=$(public_spki_sha256_from_cert "$payroll_intermediate")
  assert_four_ca_spkis_pairwise_unique \
    "$astro_spki" "$payroll_spki" "$astro_intermediate_spki" "$payroll_intermediate_spki"
  printf 'astro_root_spki_sha256=%s\npayroll_root_spki_sha256=%s\nastro_intermediate_spki_sha256=%s\npayroll_intermediate_spki_sha256=%s\n' \
    "$astro_spki" "$payroll_spki" "$astro_intermediate_spki" "$payroll_intermediate_spki" \
    >"$EVIDENCE_DIR/new-ca-spki-sha256.txt"
}

verify_internal_sni() {
  local host=$1
  local port=$2
  local ca_id=$3
  local record_file=$4
  local ca_dir="$CADDY_DATA_ROOT/pki/authorities/$ca_id"
  local raw leaf served_intermediate
  raw=$(mktemp "$WORK_DIR/sclient-raw.XXXXXX")
  leaf=$(mktemp "$WORK_DIR/sclient-leaf.XXXXXX")
  served_intermediate=$(mktemp "$WORK_DIR/sclient-intermediate.XXXXXX")
  timeout 8 openssl s_client -connect "127.0.0.1:$port" -servername "$host" -showcerts </dev/null >"$raw" 2>"${raw}.stderr" || return 1
  [[ $(grep -c -- '-----BEGIN CERTIFICATE-----' "$raw") -eq 2 ]] || return 1
  extract_chain_cert "$raw" 1 "$leaf" || return 1
  extract_chain_cert "$raw" 2 "$served_intermediate" || return 1
  openssl x509 -in "$leaf" -noout -checkhost "$host" >/dev/null 2>&1 || return 1
  openssl verify -CAfile "$ca_dir/root.crt" -untrusted "$ca_dir/intermediate.crt" "$leaf" >/dev/null 2>&1 || return 1
  local served_fp stored_intermediate_fp leaf_fp storage_cert storage_key storage_dir
  served_fp=$(openssl x509 -in "$served_intermediate" -noout -fingerprint -sha256)
  stored_intermediate_fp=$(openssl x509 -in "$ca_dir/intermediate.crt" -noout -fingerprint -sha256)
  [[ $served_fp == "$stored_intermediate_fp" ]] || return 1
  storage_dir="$CADDY_DATA_ROOT/certificates/$ca_id/$host"
  assert_exact_caddy_directory "$CADDY_DATA_ROOT/certificates/$ca_id" 700 || return 1
  assert_exact_caddy_directory "$storage_dir" 700 || return 1
  storage_cert="$storage_dir/$host.crt"
  storage_key="$storage_dir/$host.key"
  [[ -f $storage_cert && ! -L $storage_cert ]] || return 1
  [[ -f $storage_key && ! -L $storage_key ]] || return 1
  [[ $(stat -c '%U:%G:%a:%h' "$storage_cert") == 'caddy:caddy:600:1' ]] || return 1
  [[ $(stat -c '%U:%G:%a:%h' "$storage_key") == 'caddy:caddy:600:1' ]] || return 1
  [[ $(public_spki_sha256_from_cert "$storage_cert") == "$(public_spki_sha256_from_key "$storage_key")" ]] || return 1
  leaf_fp=$(openssl x509 -in "$leaf" -noout -fingerprint -sha256)
  [[ $leaf_fp == "$(openssl x509 -in "$storage_cert" -noout -fingerprint -sha256)" ]] || return 1
  printf '%s|internal|%s|%s\n' "$host" "$ca_id" "$leaf_fp" >>"$record_file" || return 1
}

verify_prewarm_chains() {
  local record_file=$1
  : >"$record_file"
  local host
  while IFS= read -r host; do
    verify_internal_sni "$host" "$PREWARM_HTTPS_PORT" "$ASTRO_CA_ID" "$record_file"
  done < <(emit_cf_subjects)
  while IFS= read -r host; do
    verify_internal_sni "$host" "$PREWARM_HTTPS_PORT" "$PAYROLL_CA_ID" "$record_file"
  done < <(emit_payroll_subjects)
  [[ $(wc -l <"$record_file") -eq $EXPECTED_SUBJECT_COUNT ]] || die 'prewarm did not verify all 58 subjects'
}

all_local_storage_long_lived() {
  local record_file=$1
  : >"$record_file"
  local host storage_dir cert key
  while IFS= read -r host; do
    storage_dir="$CADDY_DATA_ROOT/certificates/local/$host"
    cert="$storage_dir/$host.crt"
    key="$storage_dir/$host.key"
    assert_exact_caddy_directory "$CADDY_DATA_ROOT/certificates/local" 700 || return 1
    assert_exact_caddy_directory "$storage_dir" 700 || return 1
    [[ -f $cert && ! -L $cert && -f $key && ! -L $key ]] || return 1
    [[ $(stat -c '%U:%G:%a:%h' "$cert") == 'caddy:caddy:600:1' ]] || return 1
    [[ $(stat -c '%U:%G:%a:%h' "$key") == 'caddy:caddy:600:1' ]] || return 1
    [[ $(public_spki_sha256_from_cert "$cert") == "$(public_spki_sha256_from_key "$key")" ]] || return 1
    openssl x509 -in "$cert" -noout -checkhost "$host" >/dev/null 2>&1 || return 1
    openssl x509 -in "$cert" -noout -checkend 345600 >/dev/null 2>&1 || return 1
    printf '%s|local-storage-renewed|%s\n' "$host" "$(openssl x509 -in "$cert" -noout -enddate)" >>"$record_file"
  done < <(emit_expected_subjects)
  [[ $(wc -l <"$record_file") -eq $EXPECTED_SUBJECT_COUNT ]]
}

wait_for_local_storage_renewal() {
  local record_file=$1
  local scratch="$WORK_DIR/rollback-local-storage-poll"
  local deadline=$((SECONDS + LOCAL_ROLLBACK_RENEWAL_TIMEOUT_SECONDS))
  while ((SECONDS < deadline)); do
    if all_local_storage_long_lived "$scratch"; then
      cp -- "$scratch" "$record_file"
      return 0
    fi
    sleep 3
  done
  return 1
}

verify_live_stage_chains() {
  local stage=$1
  local record_file=$2
  : >"$record_file"
  local apex host i limit
  if [[ $stage == rollback-local ]]; then
    for apex in "${CF_ROLLOUT_ORDER[@]}"; do
      for host in "$apex" "www.$apex"; do
        verify_internal_sni "$host" 443 local "$record_file"
      done
    done
    for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
      verify_internal_sni "$host" 443 local "$record_file"
    done
    [[ $(wc -l <"$record_file") -eq $EXPECTED_SUBJECT_COUNT ]] || die 'rollback did not verify all 58 live SNI chains'
    return 0
  fi
  limit=$(stage_site_limit "$stage")
  for ((i = 0; i < ${#CF_ROLLOUT_ORDER[@]}; i++)); do
    apex=${CF_ROLLOUT_ORDER[$i]}
    for host in "$apex" "www.$apex"; do
      if ((i < limit)); then
        verify_internal_sni "$host" 443 "$ASTRO_CA_ID" "$record_file"
      else
        verify_internal_sni "$host" 443 local "$record_file"
      fi
    done
  done
  for host in "$PAYROLL_APEX" "www.$PAYROLL_APEX"; do
    if [[ $stage == final ]]; then
      verify_internal_sni "$host" 443 "$PAYROLL_CA_ID" "$record_file"
    else
      verify_internal_sni "$host" 443 local "$record_file"
    fi
  done
  [[ $(wc -l <"$record_file") -eq $EXPECTED_SUBJECT_COUNT ]] || die "$stage did not verify all 58 live SNI chains"
}

wait_for_live_stage_chains() {
  local stage=$1
  local record_file=$2
  local deadline=$((SECONDS + CHAIN_CONVERGENCE_TIMEOUT_SECONDS))
  local scratch="$WORK_DIR/$stage-chain-poll"
  while ((SECONDS < deadline)); do
    if verify_live_stage_chains "$stage" "$scratch"; then
      cp -- "$scratch" "$record_file"
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_for_http() {
  local url=$1
  local timeout_seconds=$2
  local deadline=$((SECONDS + timeout_seconds))
  until curl -fsS --max-time 2 "$url" >/dev/null 2>&1; do
    ((SECONDS < deadline)) || return 1
    sleep 1
  done
}

http_status_is_healthy() {
  local code=$1
  [[ $code =~ ^[1-4][0-9][0-9]$ ]]
}

cf_edge_remote_ip_is_external() {
  # libcurl returns inet_ntop-form addresses here.  Reject the complete IPv4
  # loopback block, IPv4-mapped loopback (dotted or hexadecimal), IPv4/IPv6
  # unspecified addresses, and IPv6 loopback before accepting edge evidence.
  local ip=${1,,}
  [[ -n $ip ]] || return 1
  case $ip in
    0.0.0.0|::|0:0:0:0:0:0:0:0|::1|0:0:0:0:0:0:0:1|\
    127.*|::ffff:127.*|0:0:0:0:0:ffff:127.*|\
    ::ffff:0.0.0.0|0:0:0:0:0:ffff:0.0.0.0|::ffff:0:0|0:0:0:0:0:ffff:0:0)
      return 1
      ;;
  esac
  [[ ! $ip =~ ^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$ ]] || return 1
  [[ ! $ip =~ ^0:0:0:0:0:ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$ ]] || return 1
}

verify_local_http_health() {
  local record_file=$1
  : >"$record_file"
  local apex code
  for apex in "${CF_ROLLOUT_ORDER[@]}" "$PAYROLL_APEX"; do
    code=$(curl --noproxy '*' -sS --connect-timeout 3 --max-time 8 \
      --resolve "$apex:80:127.0.0.1" -o /dev/null -w '%{http_code}' "http://$apex/" 2>/dev/null) || return 1
    http_status_is_healthy "$code" || return 1
    printf '%s|local-http|%s\n' "$apex" "$code" >>"$record_file"
  done
  [[ $(wc -l <"$record_file") -eq $EXPECTED_SITE_COUNT ]]
}

verify_cf_edge_health() {
  local record_file=$1
  : >"$record_file"
  local apex response code remote_ip ray header_file attempt validated
  for apex in "${CF_ROLLOUT_ORDER[@]}"; do
    header_file="$WORK_DIR/cf-edge-${apex//[^a-zA-Z0-9]/_}.headers"
    validated=0
    for ((attempt = 1; attempt <= 3; attempt++)); do
      : >"$header_file"
      response=''
      code=''
      remote_ip=''
      ray=''
      if response=$(curl --noproxy '*' -sS --connect-timeout 5 --max-time 15 \
          -D "$header_file" -o /dev/null -w '%{http_code}|%{remote_ip}' "https://$apex/" 2>/dev/null); then
        IFS='|' read -r code remote_ip <<<"$response"
        ray=$(awk 'tolower($1) == "cf-ray:" {gsub(/\r/, "", $2); print $2; exit}' "$header_file")
        if http_status_is_healthy "$code" && \
           cf_edge_remote_ip_is_external "$remote_ip" && \
           [[ $ray =~ ^[0-9A-Fa-f]+-[A-Za-z0-9]+$ ]]; then
          validated=1
          break
        fi
      fi
      ((attempt < 3)) && sleep 1
    done
    [[ $validated -eq 1 ]] || return 1
    printf '%s|cf-edge-https|%s|%s|cf-ray=%s\n' "$apex" "$code" "$remote_ip" "$ray" >>"$record_file"
  done
  [[ $(wc -l <"$record_file") -eq $EXPECTED_CF_APEX_COUNT ]]
}

direct_health_sampler_loop() {
  local output_file=$1
  trap - ERR
  trap 'exit 0' INT TERM HUP
  set +e
  local host code rc status
  while :; do
    for host in c-uae.com "$PAYROLL_APEX"; do
      code=$(curl --noproxy '*' -k -sS --connect-timeout 1 --max-time 3 \
        --resolve "$host:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$host/" 2>/dev/null)
      rc=$?
      status=OK
      if [[ $rc -ne 0 ]] || ! http_status_is_healthy "$code"; then
        status=FAIL
      fi
      printf '%s|%s|%s|rc=%s|http=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%S.%3NZ')" "$status" "$host" "$rc" "${code:-000}" >>"$output_file"
    done
    sleep 0.2
  done
}

start_direct_health_sampler() {
  local stage_label=$1
  [[ -z $HEALTH_SAMPLER_PID ]] || die 'direct health sampler is already running'
  HEALTH_SAMPLER_FILE="$EVIDENCE_DIR/$stage_label-continuous-direct-health.txt"
  install -o root -g root -m 0600 /dev/null "$HEALTH_SAMPLER_FILE"
  direct_health_sampler_loop "$HEALTH_SAMPLER_FILE" &
  HEALTH_SAMPLER_PID=$!
  local deadline=$((SECONDS + 8))
  while [[ $(wc -l <"$HEALTH_SAMPLER_FILE") -lt 4 ]]; do
    kill -0 "$HEALTH_SAMPLER_PID" 2>/dev/null || die 'direct health sampler exited before reload'
    ((SECONDS < deadline)) || die 'direct health sampler did not become ready'
    sleep 0.2
  done
  ! grep -Fq '|FAIL|' "$HEALTH_SAMPLER_FILE" || die 'direct health sampler failed before reload'
}

stop_and_verify_direct_health_sampler() {
  [[ -n $HEALTH_SAMPLER_PID ]] || return 0
  local pid=$HEALTH_SAMPLER_PID
  kill -TERM "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  HEALTH_SAMPLER_PID=''
  [[ -s $HEALTH_SAMPLER_FILE ]] || die 'direct health sampler produced no evidence'
  ! grep -Fq '|FAIL|' "$HEALTH_SAMPLER_FILE" || die "direct TLS/application health failed; see $HEALTH_SAMPLER_FILE"
}

stop_direct_health_sampler_best_effort() {
  if [[ -n $HEALTH_SAMPLER_PID ]]; then
    kill -TERM "$HEALTH_SAMPLER_PID" 2>/dev/null || true
    wait "$HEALTH_SAMPLER_PID" 2>/dev/null || true
    HEALTH_SAMPLER_PID=''
  fi
}

stop_prewarm() {
  [[ -n $PREWARM_UNIT ]] || return 0
  systemctl stop "$PREWARM_UNIT" >/dev/null 2>&1 || true
  local deadline=$((SECONDS + PREWARM_STOP_TIMEOUT_SECONDS))
  while :; do
    local active=0 https_listener admin_listener
    systemctl is-active --quiet "$PREWARM_UNIT" 2>/dev/null && active=1
    https_listener=$(ss -H -lntp "sport = :$PREWARM_HTTPS_PORT")
    admin_listener=$(ss -H -lntp "sport = :$PREWARM_ADMIN_PORT")
    if [[ $active -eq 0 && -z $https_listener && -z $admin_listener ]]; then
      return 0
    fi
    ((SECONDS < deadline)) || {
      die "prewarm unit/listeners did not stop within ${PREWARM_STOP_TIMEOUT_SECONDS}s"
      return 1
    }
    sleep 1
  done
}

start_and_verify_prewarm() {
  local prewarm_config=$1
  local runtime_config="$WORK_DIR/prewarm.runtime.Caddyfile"
  install -o root -g caddy -m 0640 "$prewarm_config" "$runtime_config"
  sudo -u caddy -H "$CADDY_BINARY" validate --adapter caddyfile --config "$runtime_config"

  [[ -z $(ss -H -lntp "sport = :$PREWARM_HTTPS_PORT") ]] || die "port $PREWARM_HTTPS_PORT is already in use"
  [[ -z $(ss -H -lntp "sport = :$PREWARM_ADMIN_PORT") ]] || die "port $PREWARM_ADMIN_PORT is already in use"

  PREWARM_UNIT="astro-caddy-ca-prewarm-${RUN_ID//[^a-zA-Z0-9]/}-$RANDOM.service"
  systemd-run \
    --quiet \
    --collect \
    --unit "$PREWARM_UNIT" \
    --service-type=notify \
    --property=User=caddy \
    --property=Group=caddy \
    --property=Environment=HOME=/var/lib/caddy \
    --property=NoNewPrivileges=yes \
    --property=PrivateTmp=yes \
    --property=ProtectSystem=full \
    --property=ProtectHome=yes \
    --property='RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX' \
    /usr/bin/caddy run --adapter caddyfile --config "$runtime_config"
  wait_for_http "http://127.0.0.1:$PREWARM_ADMIN_PORT/config/" "$PREWARM_TIMEOUT_SECONDS" ||
    die 'prewarm admin endpoint did not become ready'

  local pid listeners
  pid=$(systemctl show "$PREWARM_UNIT" -p MainPID --value)
  [[ $pid =~ ^[1-9][0-9]*$ ]] || die 'prewarm MainPID is invalid'
  listeners=$(ss -H -lntp | awk -v token="pid=$pid," 'index($0, token) {print}')
  [[ $(wc -l <<<"$listeners") -eq 2 ]] || die 'prewarm process owns an unexpected number of listeners'
  [[ $listeners == *"127.0.0.1:$PREWARM_HTTPS_PORT"* && $listeners == *"127.0.0.1:$PREWARM_ADMIN_PORT"* ]] ||
    die 'prewarm listeners are not restricted to the two reviewed loopback ports'

  assert_ca_material "$ASTRO_CA_ID"
  assert_ca_material "$PAYROLL_CA_ID"
  assert_distinct_new_ca_keys
  verify_prewarm_chains "$EVIDENCE_DIR/prewarm-chains.txt"
  stop_prewarm
  [[ -z $(ss -H -lntp "sport = :$PREWARM_HTTPS_PORT") ]] || die 'prewarm HTTPS listener remained after stop'
  [[ -z $(ss -H -lntp "sport = :$PREWARM_ADMIN_PORT") ]] || die 'prewarm admin listener remained after stop'
}

atomic_install_live_caddyfile() {
  local source_file=$1
  local expected_current_sha=$2
  local current_sha target_sha
  current_sha=$(sha256_file "$LIVE_CADDYFILE")
  if [[ $current_sha != "$expected_current_sha" ]]; then
    die "concurrent Caddyfile change detected: expected $expected_current_sha, got $current_sha"
    return 1
  fi
  target_sha=$(sha256_file "$source_file")
  PUBLISH_IN_PROGRESS_SHA256=$target_sha
  local temp_file="/etc/caddy/.Caddyfile.c01.$$.tmp"
  [[ ! -e $temp_file && ! -L $temp_file ]] || {
    die "staged Caddyfile path unexpectedly exists: $temp_file"
    return 1
  }
  install -o root -g caddy -m 0640 "$source_file" "$temp_file" || return 1
  if [[ $(stat -c '%U:%G:%a:%h' "$temp_file") != 'root:caddy:640:1' ]]; then
    die 'staged live Caddyfile metadata is unsafe'
    return 1
  fi
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$expected_current_sha" ]] || {
    die 'live Caddyfile changed while staging publication'
    return 1
  }
  mv -T -- "$temp_file" "$LIVE_CADDYFILE" || return 1
  if [[ $(sha256_file "$LIVE_CADDYFILE") != "$target_sha" ]]; then
    die 'atomic Caddyfile publication hash mismatch'
    return 1
  fi
  KNOWN_LIVE_SHA256[$target_sha]=1
  PUBLISH_IN_PROGRESS_SHA256=''
}

wait_for_live_config_sha() {
  local expected_sha=$1
  local deadline=$((SECONDS + 20))
  local live_json="$WORK_DIR/live-after-reload.json"
  while ((SECONDS < deadline)); do
    if curl -fsS --max-time 3 "$CADDY_ADMIN_URL/config/" >"$live_json" 2>/dev/null; then
      [[ $(canonical_json_sha256 "$live_json") == "$expected_sha" ]] && return 0
    fi
    sleep 1
  done
  return 1
}

reload_exact_json() {
  local expected_live_sha=$1
  local adapted_json=$2
  [[ -f $adapted_json && ! -L $adapted_json ]] || die "reload JSON must be a non-symlink regular file: $adapted_json"
  jq -e . "$adapted_json" >/dev/null || die "reload JSON is invalid: $adapted_json"
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$expected_live_sha" ]] ||
    die 'live Caddyfile changed after publication; refusing to reload'
  "$CADDY_BINARY" reload --force --config "$adapted_json" --address "$CADDY_ADMIN_ADDRESS"
}

publish_stage() {
  local label=$1
  local stage=$2
  local candidate=$3
  local expected_current_sha=$4
  local candidate_json="$EVIDENCE_DIR/$label.adapted.json"
  local runtime_candidate="$WORK_DIR/$label.Caddyfile"
  install -o root -g caddy -m 0640 "$candidate" "$runtime_candidate"
  sudo -u caddy -H "$CADDY_BINARY" validate --adapter caddyfile --config "$runtime_candidate"
  local candidate_json_sha
  candidate_json_sha=$(canonical_json_sha256 "$candidate_json")
  local candidate_sha
  candidate_sha=$(sha256_file "$candidate")
  start_direct_health_sampler "$label"
  atomic_install_live_caddyfile "$candidate" "$expected_current_sha"
  reload_exact_json "$candidate_sha" "$candidate_json"
  wait_for_live_config_sha "$candidate_json_sha" || die "$label effective JSON did not converge"
  sleep 2
  stop_and_verify_direct_health_sampler
  verify_service_invariants
  wait_for_live_stage_chains "$stage" "$EVIDENCE_DIR/$label-chains.txt" ||
    die "$label SNI chains did not converge"
  verify_local_http_health "$EVIDENCE_DIR/$label-local-http.txt" || die "$label failed local HTTP application health"
  verify_cf_edge_health "$EVIDENCE_DIR/$label-cf-edge.txt" || die "$label failed Cloudflare edge health"
  verify_service_invariants
  sha256_file "$LIVE_CADDYFILE" >"$EVIDENCE_DIR/$label.live-caddyfile.sha256"
  log "$label passed config, continuous/direct, chain, application, edge, PID, listener, and restart gates"
}

live_safe_for_named_quarantine() {
  [[ -n $ORIGINAL_CADDYFILE_SHA256 && -n $ORIGINAL_CONFIG_SHA256 ]] || return 1
  local file_sha expected_config_sha
  file_sha=$(sha256_file "$LIVE_CADDYFILE")
  if [[ $file_sha == "$ORIGINAL_CADDYFILE_SHA256" ]]; then
    expected_config_sha=$ORIGINAL_CONFIG_SHA256
  elif [[ -n $ROLLBACK_BRIDGE_CADDYFILE_SHA256 && $file_sha == "$ROLLBACK_BRIDGE_CADDYFILE_SHA256" ]]; then
    expected_config_sha=$ROLLBACK_BRIDGE_CONFIG_SHA256
  else
    return 1
  fi
  local current="$WORK_DIR/original-state-check.json"
  curl -fsS --max-time 5 "$CADDY_ADMIN_URL/config/" >"$current" 2>/dev/null || return 1
  [[ $(canonical_json_sha256 "$current") == "$expected_config_sha" ]]
}

quarantine_one_failed_path() {
  local source=$1
  local label=$2
  local destination_root="$EVIDENCE_DIR/failed-new-storage"
  [[ -e $source || -L $source ]] || return 0
  assert_exact_caddy_directory "$source" 700
  local source_inode
  source_inode=$(stat -c '%d:%i' -- "$source")
  install -d -o root -g root -m 0700 "$destination_root"
  assert_exact_root_directory "$destination_root" 700
  local destination="$destination_root/$label"
  assert_path_absent_including_symlink "$destination"
  mv -T -- "$source" "$destination"
  if [[ ! -d $destination || -L $destination || \
        $(readlink -e -- "$destination") != "$destination" || \
        $(stat -c '%d:%i' -- "$destination" 2>/dev/null) != "$source_inode" ]]; then
    # Rename the untrusted directory entry back without dereferencing it.  Do
    # not chmod/chown anything unless the moved inode is proven to be the same
    # canonical directory validated above.
    if [[ ! -e $source && ! -L $source && ( -e $destination || -L $destination ) ]]; then
      mv -T -- "$destination" "$source" || true
    fi
    die "failed new-storage quarantine inode/type check for $label"
    return 1
  fi
  assert_exact_caddy_directory "$destination" 700
  chmod 0700 -- "$destination"
  [[ $(stat -c '%d:%i' -- "$destination") == "$source_inode" ]] ||
    die "failed new-storage quarantine inode changed for $label"
  printf '%s|%s\n' "$label" "$destination" >>"$EVIDENCE_DIR/failed-new-storage/manifest.txt"
}

quarantine_failed_new_storage() {
  if ! live_safe_for_named_quarantine; then
    log 'CRITICAL: live config is neither verified original nor rollback bridge; leaving named namespaces in place for availability' >&2
    return 1
  fi
  local quarantine_rc
  set +e
  (
    set -Eeuo pipefail
    quarantine_one_failed_path "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID" astro-authority
    quarantine_one_failed_path "$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID" astro-certificates
    quarantine_one_failed_path "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID" payroll-authority
    quarantine_one_failed_path "$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID" payroll-certificates
  )
  quarantine_rc=$?
  if [[ $quarantine_rc -ne 0 ]]; then
    log "CRITICAL: failed-run named PKI quarantine failed (rc=$quarantine_rc); inspect evidence and storage" >&2
    return "$quarantine_rc"
  fi
  log 'Failed-run named PKI storage quarantined for a clean rerun.'
}

rollback_live() {
  [[ $ROLLBACK_ARMED -eq 1 && $ROLLBACK_RUNNING -eq 0 ]] || return 0
  ROLLBACK_RUNNING=1
  set +e
  trap - ERR INT TERM HUP
  stop_direct_health_sampler_best_effort
  stop_prewarm || true
  log 'ROLLBACK: publishing the synchronous local-certificate failsafe bridge'
  (
    set -Eeuo pipefail
    quiesce_refresh_support_if_present
    local current_sha
    current_sha=$(sha256_file "$LIVE_CADDYFILE")
    if [[ $current_sha != "$ORIGINAL_CADDYFILE_SHA256" ]]; then
      if [[ -z ${KNOWN_LIVE_SHA256[$current_sha]+known} && $current_sha != "$PUBLISH_IN_PROGRESS_SHA256" ]]; then
        printf 'unknown_live_sha256=%s\n' "$current_sha" >"$EVIDENCE_DIR/ROLLBACK.REFUSED.CONCURRENT-CHANGE"
        die "rollback refused to overwrite unknown concurrent Caddyfile SHA $current_sha"
      fi
      local rollback_runtime="$WORK_DIR/rollback-bridge.runtime.Caddyfile"
      install -o root -g caddy -m 0640 "$ROLLBACK_BRIDGE_CADDYFILE" "$rollback_runtime"
      sudo -u caddy -H "$CADDY_BINARY" validate --adapter caddyfile --config "$rollback_runtime"
      atomic_install_live_caddyfile "$ROLLBACK_BRIDGE_CADDYFILE" "$current_sha"
      start_direct_health_sampler rollback-bridge
      reload_exact_json "$ROLLBACK_BRIDGE_CADDYFILE_SHA256" "$EVIDENCE_DIR/rollback-bridge.adapted.json"
      wait_for_live_config_sha "$ROLLBACK_BRIDGE_CONFIG_SHA256"
      sleep 2
      stop_and_verify_direct_health_sampler
      verify_service_invariants
      wait_for_live_stage_chains rollback-local "$EVIDENCE_DIR/rollback-initial-chains.txt"
      verify_local_http_health "$EVIDENCE_DIR/rollback-initial-local-http.txt"
      verify_cf_edge_health "$EVIDENCE_DIR/rollback-initial-cf-edge.txt"
      wait_for_local_storage_renewal "$EVIDENCE_DIR/rollback-renewed-local-storage.txt"
      start_direct_health_sampler rollback-refresh
      reload_exact_json "$ROLLBACK_BRIDGE_CADDYFILE_SHA256" "$EVIDENCE_DIR/rollback-bridge.adapted.json"
      wait_for_live_config_sha "$ROLLBACK_BRIDGE_CONFIG_SHA256"
      sleep 2
      stop_and_verify_direct_health_sampler
      verify_service_invariants
      wait_for_live_stage_chains rollback-local "$EVIDENCE_DIR/rollback-refreshed-chains.txt"
      verify_local_http_health "$EVIDENCE_DIR/rollback-refreshed-local-http.txt"
      verify_cf_edge_health "$EVIDENCE_DIR/rollback-refreshed-cf-edge.txt"
      install_and_enable_refresh_support "$ROLLBACK_BRIDGE_CADDYFILE_SHA256"
      start_and_quiesce_refresh_timer
    else
      live_safe_for_named_quarantine || die 'original Caddyfile bytes are not the active effective config'
    fi
  )
  local rollback_rc=$?
  if [[ $rollback_rc -eq 0 ]]; then
    if [[ -f "$EVIDENCE_DIR/ROTATION.SUCCESS" ]]; then
      mv -T -- "$EVIDENCE_DIR/ROTATION.SUCCESS" "$EVIDENCE_DIR/ROTATION.SUCCESS.REVOKED-BY-ROLLBACK"
    fi
    printf '%s\n' "rollback_utc=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >"$EVIDENCE_DIR/ROLLBACK.SUCCESS"
    log 'ROLLBACK VERIFIED: synchronous local-certificate failsafe is live; exact original bytes remain in evidence for manual recovery'
  else
    printf '%s\n' "rollback_failed_utc=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >"$EVIDENCE_DIR/ROLLBACK.FAILED"
    log 'CRITICAL: rollback verification failed; inspect evidence immediately' >&2
  fi
  ROLLBACK_ARMED=0
  ROLLBACK_RUNNING=0
  [[ $rollback_rc -eq 0 ]]
}

handle_failure() {
  local rc=$1
  local reason=$2
  set +e
  log "Failure handler invoked ($reason, rc=$rc)"
  stop_direct_health_sampler_best_effort
  stop_prewarm || true
  if [[ $MODE == apply && -n $EVIDENCE_DIR ]]; then
    local rollback_rc quarantine_rc
    rollback_live
    rollback_rc=$?
    quarantine_failed_new_storage
    quarantine_rc=$?
    [[ $rollback_rc -eq 0 ]] || log "CRITICAL: automatic rollback returned rc=$rollback_rc" >&2
    [[ $quarantine_rc -eq 0 ]] || log "CRITICAL: failed-run namespace quarantine returned rc=$quarantine_rc" >&2
  fi
  exit "$rc"
}

cleanup_exit() {
  local rc=$?
  set +e
  stop_direct_health_sampler_best_effort
  stop_prewarm || true
  if [[ -n $WORK_DIR && -d $WORK_DIR ]]; then
    case "$WORK_DIR" in
      /run/astro-caddy-ca-rotation-work.*) rm -r -- "$WORK_DIR" ;;
      *) log "refusing unsafe work-directory cleanup path: $WORK_DIR" ;;
    esac
  fi
  return "$rc"
}

create_evidence_dir() {
  local stamp
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  assert_root_owned_ancestry / /opt /opt/deploy-backups
  [[ ! -L $EVIDENCE_BASE ]] || die "$EVIDENCE_BASE must not be a symlink"
  install -d -o root -g root -m 0700 "$EVIDENCE_BASE"
  assert_exact_root_directory "$EVIDENCE_BASE" 700
  EVIDENCE_DIR=$(mktemp -d "$EVIDENCE_BASE/rotation-$stamp.XXXXXXXX")
  chown root:root "$EVIDENCE_DIR"
  chmod 0700 "$EVIDENCE_DIR"
  assert_exact_root_directory "$EVIDENCE_DIR" 700
  RUN_ID=${EVIDENCE_DIR##*/}
  EVIDENCE_LOG="$EVIDENCE_DIR/run.log"
  install -o root -g root -m 0600 /dev/null "$EVIDENCE_LOG"
  exec > >(tee -a "$EVIDENCE_LOG") 2>&1
}

render_all_candidates() {
  local source_file=$1
  local destination_dir=$2
  local stage candidate json_file
  local prewarm="$destination_dir/prewarm.Caddyfile"
  render_prewarm_config "$prewarm"
  adapt_config "$prewarm" "$destination_dir/prewarm.adapted.json"
  local prewarm_subjects="$destination_dir/prewarm.subjects"
  jq -r '.apps.tls.automation.policies[]?.subjects[]?' "$destination_dir/prewarm.adapted.json" >"$prewarm_subjects"
  assert_expected_subject_file "$prewarm_subjects"
  for stage in "${APPLY_STAGES[@]}"; do
    candidate="$destination_dir/$stage.Caddyfile"
    json_file="$destination_dir/$stage.adapted.json"
    render_candidate "$source_file" "$candidate" "$stage"
    validate_candidate_shape "$candidate" "$stage" "$json_file"
  done
  ROLLBACK_BRIDGE_CADDYFILE="$destination_dir/rollback-bridge.Caddyfile"
  render_rollback_bridge "$source_file" "$ROLLBACK_BRIDGE_CADDYFILE"
  validate_rollback_bridge_shape "$ROLLBACK_BRIDGE_CADDYFILE" "$destination_dir/rollback-bridge.adapted.json"
  ROLLBACK_BRIDGE_CADDYFILE_SHA256=$(sha256_file "$ROLLBACK_BRIDGE_CADDYFILE")
  ROLLBACK_BRIDGE_CONFIG_SHA256=$(canonical_json_sha256 "$destination_dir/rollback-bridge.adapted.json")
  if [[ $(sha256_file "$source_file") == "$REVIEWED_CADDYFILE_SHA256" ]]; then
    [[ $(sha256_file "$destination_dir/final.Caddyfile") == "$REVIEWED_FINAL_CADDYFILE_SHA256" ]] ||
      die 'exact-live final candidate differs from the independently reviewed SHA'
    [[ $ROLLBACK_BRIDGE_CADDYFILE_SHA256 == "$REVIEWED_ROLLBACK_CADDYFILE_SHA256" ]] ||
      die 'exact-live rollback bridge differs from the independently reviewed SHA'
  fi
  KNOWN_LIVE_SHA256[$ROLLBACK_BRIDGE_CADDYFILE_SHA256]=1
}

snapshot_exact_live_caddyfile() {
  local destination=$1
  local before snapshot after
  before=$(sha256_file "$LIVE_CADDYFILE")
  [[ $before == "$REVIEWED_CADDYFILE_SHA256" ]] || die 'live Caddyfile drifted before snapshot'
  install -o root -g root -m 0600 "$LIVE_CADDYFILE" "$destination"
  snapshot=$(sha256_file "$destination")
  after=$(sha256_file "$LIVE_CADDYFILE")
  [[ $snapshot == "$before" && $after == "$before" ]] || die 'live Caddyfile changed during exact snapshot capture'
  ORIGINAL_CADDYFILE_SHA256=$snapshot
  KNOWN_LIVE_SHA256[$snapshot]=1
}

run_audit() {
  verify_refresh_source_artifacts
  preflight_live_file
  capture_service_baseline
  local audit_snapshot="$WORK_DIR/audit-original.Caddyfile"
  snapshot_exact_live_caddyfile "$audit_snapshot"
  capture_and_compare_live_config "$audit_snapshot" "$WORK_DIR/live.adapted.json" "$WORK_DIR/live.effective.json"
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$ORIGINAL_CADDYFILE_SHA256" ]] || die 'live Caddyfile drifted during audit'
  render_all_candidates "$audit_snapshot" "$WORK_DIR"
  log "AUDIT PASS: exact live SHA $REVIEWED_CADDYFILE_SHA256"
  log 'AUDIT PASS: 29 exact site blocks / 58 exact subjects'
  log 'AUDIT PASS: prewarm, synchronous named-CA canary/waves/final, and local rollback bridge adapt safely'
  log 'AUDIT PASS: reviewed manual-certificate refresh helper/service/timer hashes match'
  log 'No service, Caddyfile, certificate storage, Cloudflare setting, or Git history was changed.'
}

run_apply() {
  [[ $EXPECTED_CADDYFILE_SHA256 == "$REVIEWED_CADDYFILE_SHA256" ]] ||
    die "--apply requires --expected-caddyfile-sha256 $REVIEWED_CADDYFILE_SHA256"
  verify_refresh_source_artifacts
  preflight_refresh_destinations
  preflight_live_file
  assert_storage_ancestry
  local new_path
  for new_path in \
    "$CADDY_DATA_ROOT/pki/authorities/$ASTRO_CA_ID" \
    "$CADDY_DATA_ROOT/pki/authorities/$PAYROLL_CA_ID" \
    "$CADDY_DATA_ROOT/certificates/$ASTRO_CA_ID" \
    "$CADDY_DATA_ROOT/certificates/$PAYROLL_CA_ID"; do
    assert_path_absent_including_symlink "$new_path"
  done

  capture_service_baseline
  create_evidence_dir
  ORIGINAL_CADDYFILE="$EVIDENCE_DIR/original.Caddyfile"
  snapshot_exact_live_caddyfile "$ORIGINAL_CADDYFILE"
  snapshot_refresh_artifacts
  capture_and_compare_live_config "$ORIGINAL_CADDYFILE" "$EVIDENCE_DIR/original.adapted.json" "$EVIDENCE_DIR/original.effective.json"
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$ORIGINAL_CADDYFILE_SHA256" ]] || die 'live Caddyfile drifted after snapshot/effective capture'
  ORIGINAL_CONFIG_SHA256=$(canonical_json_sha256 "$EVIDENCE_DIR/original.adapted.json")
  render_all_candidates "$ORIGINAL_CADDYFILE" "$EVIDENCE_DIR"
  wait_for_live_stage_chains rollback-local "$EVIDENCE_DIR/baseline-chains.txt" || die 'baseline local SNI chains failed'
  verify_local_http_health "$EVIDENCE_DIR/baseline-local-http.txt" || die 'baseline local HTTP application health failed'
  verify_cf_edge_health "$EVIDENCE_DIR/baseline-cf-edge.txt" || die 'baseline Cloudflare edge health failed'

  {
    printf 'reviewed_live_sha256=%s\n' "$REVIEWED_CADDYFILE_SHA256"
    printf 'original_effective_json_sha256=%s\n' "$ORIGINAL_CONFIG_SHA256"
    printf 'baseline_main_pid=%s\n' "$BASELINE_MAIN_PID"
    printf 'baseline_nrestarts=%s\n' "$BASELINE_NRESTARTS"
    printf 'astro_ca_id=%s\n' "$ASTRO_CA_ID"
    printf 'payroll_ca_id=%s\n' "$PAYROLL_CA_ID"
  } >"$EVIDENCE_DIR/manifest.txt"

  start_and_verify_prewarm "$EVIDENCE_DIR/prewarm.Caddyfile"
  assert_ca_material "$ASTRO_CA_ID"
  assert_ca_material "$PAYROLL_CA_ID"

  ROLLBACK_ARMED=1
  local expected_current_sha=$ORIGINAL_CADDYFILE_SHA256
  local stage candidate
  for stage in "${APPLY_STAGES[@]}"; do
    candidate="$EVIDENCE_DIR/$stage.Caddyfile"
    publish_stage "$stage" "$stage" "$candidate" "$expected_current_sha"
    expected_current_sha=$(sha256_file "$candidate")
  done

  # Final hard gates: zero local issuers; 56 Astro subjects and two Payroll
  # subjects use disjoint named authorities and stable manual storage pairs.
  local final_live="$EVIDENCE_DIR/final.effective.json"
  curl -fsS --max-time 5 "$CADDY_ADMIN_URL/config/" >"$final_live"
  ! jq -e '.apps.tls.automation.policies[].issuers[]? | select(.module == "internal" and ((.ca // "local") == "local"))' "$final_live" >/dev/null ||
    die 'final effective config still contains the old local issuer'
  [[ $(jq --arg id "$ASTRO_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].module == "internal" and .issuers[0].ca == $id) | .subjects[]] | length' "$final_live") -eq $EXPECTED_CF_SUBJECT_COUNT ]] ||
    die 'final effective config does not isolate all 56 Cloudflare subjects on the Astro CA'
  [[ $(jq --arg id "$PAYROLL_CA_ID" '[.apps.tls.automation.policies[] | select(.issuers[0].module == "internal" and .issuers[0].ca == $id) | .subjects[]] | length' "$final_live") -eq 2 ]] ||
    die 'final effective config does not isolate both Payroll subjects'
  [[ $(jq '[.apps.tls.certificates.load_files[]?] | length' "$final_live") -eq $EXPECTED_SUBJECT_COUNT ]] ||
    die 'final effective config does not synchronously load all 58 named-CA pairs'
  [[ $(sha256_file "$LIVE_CADDYFILE") == "$expected_current_sha" ]] ||
    die 'final live Caddyfile changed after the final publication'
  grep -Fxq '# C-01-REFRESH-SCHEMA: named-internal-manual-v1' "$LIVE_CADDYFILE" || die 'final refresh schema marker missing'
  wait_for_live_stage_chains final "$EVIDENCE_DIR/final-hard-gate-chains.txt"
  verify_local_http_health "$EVIDENCE_DIR/final-hard-gate-local-http.txt"
  verify_cf_edge_health "$EVIDENCE_DIR/final-hard-gate-cf-edge.txt"
  verify_service_invariants
  install_and_enable_refresh_support "$expected_current_sha"
  start_and_quiesce_refresh_timer
  verify_service_invariants
  local success_tmp="$EVIDENCE_DIR/.ROTATION.SUCCESS.tmp"
  printf '%s\n' "completed_utc=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >"$success_tmp"
  chmod 0600 "$success_tmp"
  mv -T -- "$success_tmp" "$EVIDENCE_DIR/ROTATION.SUCCESS"
  ROLLBACK_ARMED=0
  log "ROTATION COMPLETE: evidence retained root-private at $EVIDENCE_DIR"
  log 'Old local namespace retained; Cloudflare settings and Git history untouched.'
}

parse_args() {
  while (($#)); do
    case "$1" in
      --audit)
        MODE='audit'
        shift
        ;;
      --apply)
        MODE='apply'
        shift
        ;;
      --expected-caddyfile-sha256)
        (($# >= 2)) || die '--expected-caddyfile-sha256 requires a value'
        EXPECTED_CADDYFILE_SHA256=$2
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
  if [[ $MODE == audit && -n $EXPECTED_CADDYFILE_SHA256 ]]; then
    die '--expected-caddyfile-sha256 is only valid with --apply'
  fi
  if [[ $MODE == apply && -z $EXPECTED_CADDYFILE_SHA256 ]]; then
    die '--apply requires an explicit --expected-caddyfile-sha256'
  fi
}

prepare_lock() {
  assert_root_owned_ancestry / /run
  [[ ! -L $LOCK_DIR ]] || die "$LOCK_DIR must not be a symlink"
  install -d -o root -g root -m 0700 "$LOCK_DIR"
  assert_exact_root_directory "$LOCK_DIR" 700
  if [[ ! -e $LOCK_FILE && ! -L $LOCK_FILE ]]; then
    install -o root -g root -m 0600 /dev/null "$LOCK_FILE"
  fi
  [[ -f $LOCK_FILE && ! -L $LOCK_FILE ]] || die "$LOCK_FILE must be a non-symlink regular file"
  [[ $(readlink -e -- "$LOCK_FILE") == "$LOCK_FILE" ]] || die "$LOCK_FILE is not canonical"
  [[ $(stat -c '%u:%g:%a:%h' "$LOCK_FILE") == '0:0:600:1' ]] || die "$LOCK_FILE has unsafe metadata"
  exec 9<>"$LOCK_FILE"
  flock -n 9 || die 'another Caddy CA rotation process holds the lock'
}

main() {
  parse_args "$@"
  [[ $EUID -eq 0 ]] || die 'must run as root'
  local command
  for command in awk bash caddy chmod chown cmp cp curl date diff flock grep id install jq mktemp mv openssl readlink rm sha256sum sleep sort ss stat sudo systemctl systemd-analyze systemd-run tee timeout wc; do
    require_command "$command"
  done
  CADDY_UID=$(id -u caddy)
  CADDY_GID=$(id -g caddy)
  [[ $CADDY_UID =~ ^[1-9][0-9]*$ && $CADDY_GID =~ ^[1-9][0-9]*$ ]] || die 'invalid caddy uid/gid'
  preflight_caddy_binary
  prepare_lock
  WORK_DIR=$(mktemp -d /run/astro-caddy-ca-rotation-work.XXXXXXXX)
  chown root:caddy "$WORK_DIR"
  chmod 0750 "$WORK_DIR"
  trap cleanup_exit EXIT
  trap 'handle_failure $? ERR' ERR
  trap 'handle_failure 130 INT' INT
  trap 'handle_failure 143 TERM' TERM
  trap 'handle_failure 129 HUP' HUP

  if [[ $MODE == apply ]]; then
    run_apply
  else
    run_audit
  fi
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main "$@"
fi
