#!/usr/bin/env bash
# C-02/H-01/M-03/M-04: verify the reviewed application fixes and, on request,
# run tests/builds in a constrained transient service. This helper never
# deploys a build, changes a live site, or restarts a service.

set -euo pipefail
IFS=$'\n\t'
# This script intentionally reads rotated values for equality/HMAC checks.
# Disable caller-requested xtrace before the first value is read so shell debug
# logs cannot disclose them.
if [[ $- == *x* ]]; then set +x; fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=dry-run
SOURCE_ROOT=$(repo_root_from_script "$SCRIPT_DIR")
FLEET_ROOT=
SYSTEMD_DIR=/etc/systemd/system
EXPECTED_COMMIT=
CONFIRMED_COMMIT=
ROTATION_MANIFEST=
SIGNER_READINESS=
BUILD_USER=astro-security-build
PNPM_STORE_SOURCE=/opt/.pnpm-store
CONFIRM_BUILD_ONLY=0
EARLIEST_APPLY_DATE_UTC=2026-08-10
BUILD_STAGE_PARENT=/var/lib/astro-security-builds
EXPECTED_PNPM_VERSION=9.15.9

ISSUES=0
SITE_COUNT=0
GTM_SITE_COUNT=0
ROTATION_EPOCH_SECONDS=0
ACCESS_REVOKED_SECONDS=0
ROTATION_EPOCH=
declare -A EXPECTED_SITES=()
declare -A EXPECTED_UNITS=()
declare -A EXPECTED_GTM_SITES=()
declare -A SITE_SERVICE_USER=()
declare -A SITE_SERVICE_GROUP=()
declare -A ROTATION_SECRET=()
declare -A SECRET_SITE_BY_HASH=()

# Affected site | package | unit | loopback port | configureSiteCms siteId |
# signed GTM-writer consumer.
FLEET_MANIFEST=(
  'c-uae.com|cuae-astro|cuae|5092|cuae|yes'
  'cbss.ae|astro-cbss|cbss|5081|cbss|no'
  'connectfm.ae|connectfm-astro|connectfm|5087|connectfm|yes'
  'connectfreelance.ae|connectfreelance-ae-astro|connectfreelance|5094|connectfreelance|yes'
  'connectfz.com|connectfz-astro|connectfz|5096|connectfz|yes'
  'connectgroup.co|connectgroup-astro|connectgroup|5085|connectgroup|yes'
  'connecthr.ae|connecthr-astro|connecthr|5084|connecthr|yes'
  'connectresources.ae|connectresources-astro|connectresources|5086|connectresources|yes'
  'connectresources.sa|connectresources-sa-astro|connectresources-sa|5088|connectresources-sa|yes'
  'connectstaff.ae|connectstaff-astro|connectstaff|5091|connectstaff|yes'
  'emiratiguard.com|emiratiguard-astro|emiratiguard|5103|emiratiguard|yes'
  'emiratisationgate.org|emiratisationgate-astro|emiratisationgate|5105|emiratisationgate|yes'
  'emiratisationgateway.com|emiratisationgateway-astro|emiratisationgateway|5106|emiratisationgateway|yes'
  'eormiddleast.com|eormiddleast-astro|eormiddleast|5090|eormiddleast|yes'
  'evolutionmiddleast.com|evolutionmiddleast-astro|evolutionmiddleast|5080|evolutionmiddleast|yes'
  'freelancerdxb.com|freelancerdxb-com-astro|freelancerdxb|5109|freelancerdxb|yes'
  'iberiaeor.com|iberiaeor-astro|iberiaeor|5089|iberiaeor|yes'
  'iberiaworkforce.com|iberiaworkforce-astro|iberiaworkforce|5083|iberiaworkforce|no'
  'kinzahr.com|kinzahr-astro|kinzahr|5093|kinzahr|yes'
  'kpmpro.ae|kpmpro-ae-astro|kpmpro|5124|kpmpro|yes'
  'ngmanpower.com|ngmanpower-astro|ngmanpower|5102|ngmanpower|yes'
  'payrollmiddleast.org|payrollmiddleast-org-astro|payrollmiddleast|5110|payrollmiddleast|yes'
  'peomiddleast.com|peomiddleast-com-astro|peomiddleeast|5118|peomiddleeast|yes'
  'pittant.com|pittant-astro|pittant|5111|pittant|yes'
  'redo.ae|redo-ae-astro|redo|5095|redo|yes'
  'royalvisa.ae|royalvisa-ae-astro|royalvisa|5097|royalvisa|yes'
  'spheavyrental.ae|spheavy-rental|spheavyrental|5082|spheavyrental|yes'
  'thefreelancergate.com|thefreelancergate-astro|thefreelancergate|5100|thefreelancergate|yes'
)

# This 29th active Astro service is deliberately outside this rollout because
# it neither consumes @connect/site-cms nor exposes the affected contact route.
EXCLUDED_ACTIVE_MANIFEST=(
  'connectresourcesint.com|connectresourcesint-astro|connectresourcesint|5098|no-site-cms-or-contact-route'
)

PACKAGE_SECURITY_PATHS=(
  packages/site-cms/README.md
  packages/site-cms/package.json
  packages/site-cms/src/auth/internal-job.ts
  packages/site-cms/src/astro/gtm/index.ts
  packages/site-cms/src/astro/gtm/save.ts
  packages/site-cms/src/gtm/store.ts
  packages/site-cms/src/http/rate-limit.ts
  packages/site-cms/src/http/request-body.ts
  packages/site-cms/src/leads/public-id.ts
  packages/site-cms/src/leads/file-store.ts
  packages/site-cms/src/astro/leads/publicId.ts
  packages/site-cms/src/astro/retry-lead.ts
  packages/site-cms/src/index.ts
  packages/site-cms/test/contact-route-body-limits.test.mjs
  packages/site-cms/test/lead-store-security.test.mjs
  packages/site-cms/test/rate-limit-security.test.mjs
  packages/site-cms/test/request-body-security.test.mjs
  packages/site-cms/tests/gtm-store.test.ts
  packages/site-cms/tests/internal-job.test.ts
  Astro-production/connectgroup.co/src/lib/leads/file-store.ts
  Astro-production/redo.ae/public/js/astro-mirror-fixes.js
  Astro-production/redo.ae/src/pages/api/contact.ts
  Astro-production/redo.ae/src/utils/form/persist-attachments.ts
  Astro-production/redo.ae/tests/persist-attachments-security.test.mjs
  pnpm-lock.yaml
)

usage() {
  cat <<'USAGE'
Usage: 10-rollout-app-security-fixes.sh [options]

Default: static/read-only rollout-readiness preflight. Effective running-unit
identity/state is additionally verified by --apply. No build, directory,
service, environment, secret, or live application state is changed by default.

Required for a complete preflight:
  --expected-commit SHA       Full reviewed commit at clean named-branch HEAD.
  --rotation-manifest FILE    Root-private MANIFEST.tsv produced by script 02;
                              all 28 rows must be installed=YES and equal the
                              active root/service-private environment values.
  --signer-readiness FILE     Root-private, secret-bound 26-writer attestation.

Optional paths:
  --source-root PATH          Reviewed repository worktree.
  --fleet-root PATH           Fleet root (default SOURCE/Astro-production).
  --systemd-dir PATH          Static unit directory.

Build verification only:
  --apply                     Run offline tests/builds; never deploy.
  --confirm-commit SHA        Exact repeat of --expected-commit.
  --build-user USER           Dedicated locked account (default astro-security-build).
  --pnpm-store-source PATH    Existing offline store (default /opt/.pnpm-store).
  --confirm-build-verification-only

Apply requires /var/lib/astro-security-builds to be an already mounted,
root-private, size/inode-bounded filesystem on a different device from /var.
It creates only that mount's FULL_COMMIT child. It runs pnpm as
the locked non-root build account in a systemd sandbox with a clean environment,
no network, hidden /opt and /var host content, resource limits, and lifecycle /
pnpmfile hooks disabled. It runs shared and Redo security tests plus all 28
affected builds. Output is BUILD EVIDENCE ONLY: dist still has external runtime
dependencies and is not packaged or presented as deployable. No live command or
rollback command is generated.

Signer-readiness TSV (tabs, no secret values):
  expected_commit<TAB>FULL_SHA
  developer_access_revoked_at<TAB>YYYY-MM-DDTHH:MM:SSZ
  rotation_epoch<TAB>YYYY-MM-DDTHH:MM:SSZ
  SITE_NAME<TAB>SITE_ID<TAB>site-v1<TAB>gtm:write<TAB>/api/internal/gtm/save<TAB>READY<TAB>HMAC_HEX

HMAC_HEX is HMAC-SHA256 with that site's new active INTERNAL_JOB_SECRET over
the canonical message documented in this script's README. This proves the
attested writer and live service use the same post-revocation secret version.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --source-root) (($# >= 2)) || die "--source-root requires a path"; SOURCE_ROOT=$2; shift ;;
    --fleet-root) (($# >= 2)) || die "--fleet-root requires a path"; FLEET_ROOT=$2; shift ;;
    --systemd-dir) (($# >= 2)) || die "--systemd-dir requires a path"; SYSTEMD_DIR=$2; shift ;;
    --expected-commit) (($# >= 2)) || die "--expected-commit requires a SHA"; EXPECTED_COMMIT=$2; shift ;;
    --rotation-manifest) (($# >= 2)) || die "--rotation-manifest requires a path"; ROTATION_MANIFEST=$2; shift ;;
    --signer-readiness) (($# >= 2)) || die "--signer-readiness requires a path"; SIGNER_READINESS=$2; shift ;;
    --confirm-commit) (($# >= 2)) || die "--confirm-commit requires a SHA"; CONFIRMED_COMMIT=$2; shift ;;
    --build-user) (($# >= 2)) || die "--build-user requires a name"; BUILD_USER=$2; shift ;;
    --pnpm-store-source) (($# >= 2)) || die "--pnpm-store-source requires a path"; PNPM_STORE_SOURCE=$2; shift ;;
    --confirm-build-verification-only) CONFIRM_BUILD_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

[[ -n "$FLEET_ROOT" ]] || FLEET_ROOT=$SOURCE_ROOT/Astro-production

issue() {
  blocked "$*"
  ISSUES=$((ISSUES + 1))
}

require_plain_directory() {
  local path=$1 label=$2
  [[ -d "$path" && ! -L "$path" ]] || die "$label must be a non-symlink directory: $path"
}

canonicalize_roots() {
  [[ "$SOURCE_ROOT" == /* && "$SOURCE_ROOT" != / && "$SOURCE_ROOT" != /root ]] || \
    die "source root must be an absolute repository path other than / or /root"
  require_absolute_path "$FLEET_ROOT" "fleet root"
  require_absolute_path "$SYSTEMD_DIR" "systemd directory"
  require_plain_directory "$SOURCE_ROOT" "source root"
  require_plain_directory "$FLEET_ROOT" "fleet root"
  require_plain_directory "$SYSTEMD_DIR" "systemd directory"
  SOURCE_ROOT=$(realpath -e -- "$SOURCE_ROOT")
  FLEET_ROOT=$(realpath -e -- "$FLEET_ROOT")
  SYSTEMD_DIR=$(realpath -e -- "$SYSTEMD_DIR")
  [[ "$FLEET_ROOT" == "$SOURCE_ROOT/Astro-production" ]] || \
    die "fleet root must be the source root's exact Astro-production directory"
}

prepare_expected_maps() {
  local row site package unit port site_id gtm extra
  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    [[ -n "$site" && -n "$package" && -n "$unit" && "$port" =~ ^[0-9]+$ && \
       -n "$site_id" && "$gtm" =~ ^(yes|no)$ && -z "$extra" ]] || die "Invalid affected manifest row"
    [[ -z "${EXPECTED_SITES[$site]:-}" ]] || die "Duplicate affected site: $site"
    EXPECTED_SITES["$site"]=$package
    EXPECTED_UNITS["$site"]=$unit
    SITE_COUNT=$((SITE_COUNT + 1))
    if [[ "$gtm" == yes ]]; then
      EXPECTED_GTM_SITES["$site"]=$site_id
      GTM_SITE_COUNT=$((GTM_SITE_COUNT + 1))
    fi
  done
  [[ "$SITE_COUNT" -eq 28 && "$GTM_SITE_COUNT" -eq 26 ]] || die "Built-in affected inventory must be 28/26"
  for row in "${EXCLUDED_ACTIVE_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id extra <<<"$row"
    [[ -n "$site" && -n "$package" && -n "$unit" && "$port" =~ ^[0-9]+$ && \
       "$site_id" == no-site-cms-or-contact-route && -z "$extra" ]] || die "Invalid exclusion row"
    [[ -z "${EXPECTED_SITES[$site]:-}" ]] || die "Duplicate excluded site: $site"
    EXPECTED_SITES["$site"]=$package
    EXPECTED_UNITS["$site"]=$unit
  done
  [[ "${#EXPECTED_SITES[@]}" -eq 29 ]] || die "Built-in active Astro inventory must contain 29 sites"
}

resolve_expected_commit() {
  local resolved head branch status state_path
  if [[ -z "$EXPECTED_COMMIT" ]]; then
    issue "--expected-commit FULL_SHA is required"
    EXPECTED_COMMIT=$(git -C "$SOURCE_ROOT" rev-parse HEAD 2>/dev/null || true)
  fi
  if [[ ! "$EXPECTED_COMMIT" =~ ^[0-9A-Fa-f]{40,64}$ ]]; then
    issue "Expected commit must be a full hexadecimal object ID"
    return
  fi
  resolved=$(git -C "$SOURCE_ROOT" rev-parse --verify "$EXPECTED_COMMIT^{commit}" 2>/dev/null || true)
  if [[ -z "$resolved" || "${resolved,,}" != "${EXPECTED_COMMIT,,}" ]]; then
    issue "Expected commit is not an exact local commit object"
    return
  fi
  EXPECTED_COMMIT=${resolved,,}
  head=$(git -C "$SOURCE_ROOT" rev-parse HEAD 2>/dev/null || true)
  [[ "$head" == "$EXPECTED_COMMIT" ]] || issue "Source HEAD is not the expected commit"
  branch=$(git -C "$SOURCE_ROOT" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  [[ -n "$branch" ]] || issue "Source must be on a named branch"
  status=$(GIT_OPTIONAL_LOCKS=0 git -C "$SOURCE_ROOT" status --porcelain=v1 --untracked-files=all)
  [[ -z "$status" ]] || issue "Source branch is dirty"
  for state_path in MERGE_HEAD REBASE_HEAD CHERRY_PICK_HEAD; do
    state_path=$(git -C "$SOURCE_ROOT" rev-parse --git-path "$state_path")
    [[ ! -e "$state_path" ]] || issue "Source repository has an unfinished git operation"
  done
}

verify_commit_file() {
  local path=$1 expected_blob actual_blob
  if ! git -C "$SOURCE_ROOT" cat-file -e "$EXPECTED_COMMIT:$path" 2>/dev/null; then
    issue "Expected commit lacks required security path: $path"
    return
  fi
  [[ -f "$SOURCE_ROOT/$path" && ! -L "$SOURCE_ROOT/$path" ]] || {
    issue "Working security path is not a plain file: $path"
    return
  }
  expected_blob=$(git -C "$SOURCE_ROOT" rev-parse "$EXPECTED_COMMIT:$path")
  actual_blob=$(git -C "$SOURCE_ROOT" hash-object -- "$SOURCE_ROOT/$path")
  [[ "$actual_blob" == "$expected_blob" ]] || issue "Security path differs from expected commit: $path"
}

commit_has_marker() {
  local path=$1 marker=$2
  git -C "$SOURCE_ROOT" grep -F -- "$marker" "$EXPECTED_COMMIT" -- "$path" >/dev/null 2>&1 || \
    issue "Expected security marker is absent from $path"
}

verify_security_commit() {
  local path row site package unit port site_id gtm extra contact rate body mount
  [[ "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40,64}$ ]] || return
  for path in "${PACKAGE_SECURITY_PATHS[@]}"; do verify_commit_file "$path"; done
  commit_has_marker packages/site-cms/src/auth/internal-job.ts requireSiteScopedInternalJobAuth
  commit_has_marker packages/site-cms/src/auth/internal-job.ts 'Preserve the exact media type and parameter values'
  commit_has_marker packages/site-cms/src/astro/gtm/save.ts "requireSiteScopedInternalJobAuth(request, 'gtm:write')"
  commit_has_marker packages/site-cms/src/gtm/store.ts GTM_ID_PATTERN
  commit_has_marker packages/site-cms/src/http/request-body.ts requestWithLimitedBody
  commit_has_marker packages/site-cms/src/http/request-body.ts readRequestBodyLimited
  commit_has_marker packages/site-cms/src/http/rate-limit.ts 'MAX_KEYS = 10_000'
  commit_has_marker packages/site-cms/src/http/rate-limit.ts 'hits.keys().next()'
  commit_has_marker packages/site-cms/src/leads/public-id.ts resolveContainedPath
  commit_has_marker packages/site-cms/src/leads/file-store.ts O_NOFOLLOW
  commit_has_marker packages/site-cms/src/leads/file-store.ts 'mode: 0o640'
  commit_has_marker Astro-production/connectgroup.co/src/lib/leads/file-store.ts "export { FileLeadStore } from '@connect/site-cms'"
  commit_has_marker Astro-production/redo.ae/src/pages/api/contact.ts "mediaType === 'application/json'"
  commit_has_marker Astro-production/redo.ae/src/pages/api/contact.ts 'MAX_JSON_BODY_BYTES = 1 * 1024 * 1024'
  commit_has_marker Astro-production/redo.ae/src/pages/api/contact.ts 'MAX_MULTIPART_BODY_BYTES = 10 * 1024 * 1024'

  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    contact="Astro-production/$site/src/pages/api/contact.ts"
    rate="Astro-production/$site/src/utils/form/rate-limit.ts"
    verify_commit_file "$contact"
    verify_commit_file "$rate"
    commit_has_marker "$contact" isRateLimited
    if ! git -C "$SOURCE_ROOT" grep -Eq 'readRequestBodyLimited|requestWithLimitedBody' \
      "$EXPECTED_COMMIT" -- "$contact" >/dev/null 2>&1; then
      issue "Contact route lacks streaming body limiter: $site"
    fi
    commit_has_marker "$rate" '@connect/site-cms/http/rate-limit'
    body="Astro-production/$site/src/utils/form/read-body-limited.ts"
    if git -C "$SOURCE_ROOT" cat-file -e "$EXPECTED_COMMIT:$body" 2>/dev/null; then
      verify_commit_file "$body"
      commit_has_marker "$body" '@connect/site-cms/http/request-body'
      if git -C "$SOURCE_ROOT" grep -F 'request.arrayBuffer()' "$EXPECTED_COMMIT" -- "$body" >/dev/null 2>&1; then
        issue "Unsafe full-buffer helper remains in $site"
      fi
    fi
    mount="Astro-production/$site/src/pages/api/internal/gtm/save.ts"
    if [[ "$gtm" == yes ]]; then
      verify_commit_file "$mount"
      commit_has_marker "$mount" '@connect/site-cms/astro/gtm/save'
    elif git -C "$SOURCE_ROOT" cat-file -e "$EXPECTED_COMMIT:$mount" 2>/dev/null; then
      issue "Non-GTM site unexpectedly has a GTM write mount: $site"
    fi
  done
}

validate_static_unit() {
  local site=$1 unit=$2 port=$3 unit_file=$SYSTEMD_DIR/$unit.service user group
  [[ -f "$unit_file" && ! -L "$unit_file" ]] || { issue "Missing/non-plain unit for $site: $unit_file"; return; }
  [[ "$(grep -Fxc -- "WorkingDirectory=$FLEET_ROOT/$site" "$unit_file")" -eq 1 ]] || issue "WorkingDirectory mismatch for $unit"
  if [[ "$site" != connectresourcesint.com ]]; then
    if [[ "$(grep -Fxc -- "EnvironmentFile=$FLEET_ROOT/$site/.env.prod" "$unit_file")" -ne 1 && \
          "$(grep -Fxc -- "EnvironmentFile=-$FLEET_ROOT/$site/.env.prod" "$unit_file")" -ne 1 ]]; then
      issue "EnvironmentFile mismatch for $unit"
    fi
  fi
  grep -Eq '^ExecStart=.*([[:space:]]|^)HOST=127\.0\.0\.1([[:space:]]|$)' "$unit_file" || issue "Unit $unit is not explicitly loopback-bound"
  grep -Eq "^ExecStart=.*([[:space:]]|^)PORT=$port([[:space:]]|$)" "$unit_file" || issue "Port mismatch for $unit"
  grep -Eq '^ExecStart=.*dist/server/entry\.mjs([[:space:]]|$)' "$unit_file" || issue "SSR entry mismatch for $unit"
  user=$(sed -n 's/^User=//p' "$unit_file" | head -n1)
  group=$(sed -n 's/^Group=//p' "$unit_file" | head -n1)
  [[ -n "$user" && -n "$group" ]] || issue "Unit $unit needs explicit User= and Group="
  SITE_SERVICE_USER["$site"]=$user
  SITE_SERVICE_GROUP["$site"]=$group
}

validate_dedicated_service_identity() {
  # A root:service-group 0640 environment file is private only if that numeric
  # group belongs solely to the one service account.  Prove this from NSS at
  # apply time so a leftover developer membership cannot silently retain read
  # access to the newly rotated HMAC secret.
  local user=$1 group=$2 unit=$3 uid gid primary supplementary
  local group_entry group_name group_gid group_members same_gid_groups primary_users
  [[ "$user" == "$group" ]] || { issue "Service user/group must be the same dedicated identity for $unit"; return; }
  uid=$(id -u "$user" 2>/dev/null || true)
  gid=$(id -g "$user" 2>/dev/null || true)
  [[ "$uid" =~ ^[0-9]+$ && "$uid" -ne 0 && "$gid" =~ ^[0-9]+$ && "$gid" -ne 0 ]] || {
    issue "Dedicated service identity is missing or privileged for $unit"
    return
  }
  group_entry=$(getent group "$group" 2>/dev/null || true)
  [[ -n "$group_entry" && "$group_entry" != *$'\n'* ]] || {
    issue "Dedicated service group is missing or ambiguous for $unit"
    return
  }
  IFS=: read -r group_name _ group_gid group_members <<<"$group_entry"
  [[ "$group_name" == "$group" && "$group_gid" == "$gid" ]] || issue "Dedicated service group identity mismatch for $unit"
  [[ -z "$group_members" ]] || issue "Dedicated service group lists supplementary members for $unit"
  same_gid_groups=$(getent group | awk -F: -v gid="$gid" '$3 == gid {print $1}')
  [[ "$same_gid_groups" == "$group" ]] || issue "Service GID is shared or ambiguous for $unit"
  primary_users=$(getent passwd | awk -F: -v gid="$gid" '$4 == gid {print $1}')
  [[ "$primary_users" == "$user" ]] || issue "Service group has another primary user for $unit"
  primary=$(id -g "$user" 2>/dev/null || true)
  supplementary=$(id -G "$user" 2>/dev/null || true)
  [[ "$primary" == "$gid" && "$supplementary" == "$gid" ]] || issue "Service account has supplementary groups for $unit"
}

validate_effective_unit() {
  local site=$1 unit=$2 port=$3 working environment_files exec_start active user group env_file service_uid service_gid
  env_file=$FLEET_ROOT/$site/.env.prod
  working=$(systemctl show "$unit.service" -p WorkingDirectory --value)
  environment_files=$(systemctl show "$unit.service" -p EnvironmentFiles --value)
  exec_start=$(systemctl show "$unit.service" -p ExecStart --value)
  active=$(systemctl show "$unit.service" -p ActiveState --value)
  user=$(systemctl show "$unit.service" -p User --value)
  group=$(systemctl show "$unit.service" -p Group --value)
  [[ "$working" == "$FLEET_ROOT/$site" ]] || issue "Effective WorkingDirectory mismatch for $unit"
  [[ "$exec_start" == *" HOST=127.0.0.1 "* && "$exec_start" == *" PORT=$port "* && "$exec_start" == *dist/server/entry.mjs* ]] || issue "Effective ExecStart mismatch for $unit"
  [[ "$active" == active ]] || issue "Service is not active: $unit"
  [[ "$user" == "${SITE_SERVICE_USER[$site]:-}" && "$group" == "${SITE_SERVICE_GROUP[$site]:-}" ]] || issue "Effective service identity mismatch for $unit"
  service_uid=$(id -u "$user" 2>/dev/null || true)
  service_gid=$(getent group "$group" 2>/dev/null | awk -F: '{print $3}' || true)
  [[ "$service_uid" =~ ^[0-9]+$ && "$service_uid" -ne 0 ]] || issue "Effective service user is missing or privileged for $unit"
  [[ "$service_gid" =~ ^[0-9]+$ && "$service_gid" -ne 0 ]] || issue "Effective service group is missing or privileged for $unit"
  validate_dedicated_service_identity "$user" "$group" "$unit"
  if [[ -n "${EXPECTED_GTM_SITES[$site]:-}" || "$site" == cbss.ae || "$site" == iberiaworkforce.com ]]; then
    [[ "$environment_files" == "$env_file (ignore_errors=no)" ]] || issue "Effective EnvironmentFiles mismatch for $unit"
  fi
}

validate_exact_active_inventory() {
  local service site seen_count=0
  declare -A seen=()
  shopt -s nullglob
  for service in "$SYSTEMD_DIR"/*.service; do
    while IFS= read -r site; do
      site=${site#WorkingDirectory="$FLEET_ROOT/"}
      site=${site#WorkingDirectory=$FLEET_ROOT/}
      site=${site%\"}
      [[ "$site" != */* && "$site" =~ ^[A-Za-z0-9._-]+$ ]] || { issue "Unsafe production WorkingDirectory in $service"; continue; }
      [[ -z "${seen[$site]:-}" ]] || { issue "Multiple units map to active Astro site $site"; continue; }
      seen["$site"]=$(basename "$service" .service)
      seen_count=$((seen_count + 1))
    done < <(grep -E "^WorkingDirectory=\"?$FLEET_ROOT/[A-Za-z0-9._-]+\"?$" "$service" || true)
  done
  shopt -u nullglob
  [[ "$seen_count" -eq 29 ]] || issue "Static production-unit inventory is $seen_count, expected exact 29"
  for site in "${!EXPECTED_SITES[@]}"; do
    [[ "${seen[$site]:-}" == "${EXPECTED_UNITS[$site]}" ]] || issue "Active-unit inventory mismatch for $site"
  done
  for site in "${!seen[@]}"; do
    [[ -n "${EXPECTED_SITES[$site]:-}" ]] || issue "Unreviewed active Astro site: $site"
  done
}

validate_site_source() {
  local site=$1 package=$2 site_id=$3 gtm=$4 site_dir=$SOURCE_ROOT/Astro-production/$site package_json runtime_path
  [[ -d "$site_dir" && ! -L "$site_dir" ]] || { issue "Missing source site: $site"; return; }
  package_json=$site_dir/package.json
  [[ -f "$package_json" && ! -L "$package_json" ]] || { issue "Missing package.json for $site"; return; }
  grep -Eq '"@connect/site-cms"[[:space:]]*:[[:space:]]*"workspace:' "$package_json" || issue "$site is not an @connect/site-cms consumer"
  grep -Eq "\"name\"[[:space:]]*:[[:space:]]*\"$package\"" "$package_json" || issue "Package mapping mismatch for $site"
  grep -Eq "siteId:[[:space:]]*'$site_id'" "$site_dir/src/cms.ts" || issue "siteId mismatch for $site"
  for runtime_path in .env .env.prod .env.production .data dist node_modules; do
    if git -C "$SOURCE_ROOT" cat-file -e "$EXPECTED_COMMIT:Astro-production/$site/$runtime_path" 2>/dev/null; then
      issue "Runtime/build state is tracked in expected commit: $site/$runtime_path"
    fi
  done
  [[ "$gtm" =~ ^(yes|no)$ ]] || issue "Invalid GTM flag for $site"
}

validate_explicit_exclusion() {
  local row site package unit port reason extra site_dir package_json
  for row in "${EXCLUDED_ACTIVE_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port reason extra <<<"$row"
    site_dir=$SOURCE_ROOT/Astro-production/$site
    package_json=$site_dir/package.json
    [[ -f "$package_json" && ! -L "$package_json" ]] || { issue "Excluded site's package.json is missing"; continue; }
    grep -Eq "\"name\"[[:space:]]*:[[:space:]]*\"$package\"" "$package_json" || issue "Excluded package mapping mismatch: $site"
    if grep -Eq '"@connect/site-cms"[[:space:]]*:' "$package_json"; then issue "Excluded site now consumes @connect/site-cms: $site"; fi
    if [[ -e "$site_dir/src/pages/api/contact.ts" ]]; then issue "Excluded site now has affected contact route: $site"; fi
    validate_static_unit "$site" "$unit" "$port"
    [[ "$reason" == no-site-cms-or-contact-route && -z "$extra" ]] || issue "Excluded-site reason mismatch"
    if [[ "$MODE" == apply ]]; then validate_effective_unit "$site" "$unit" "$port"; fi
  done
}

validate_private_metadata_file() {
  local file=$1 label=$2 canonical parent uid mode links parent_state
  require_absolute_path "$file" "$label"
  [[ -f "$file" && ! -L "$file" ]] || { issue "$label is not a plain file"; return 1; }
  canonical=$(realpath -e -- "$file")
  [[ "$canonical" == "$file" ]] || { issue "$label path is noncanonical"; return 1; }
  uid=$(file_uid "$file"); mode=$(file_mode "$file"); links=$(stat -Lc '%h' -- "$file")
  [[ "$uid" == 0 && "$mode" == 600 && "$links" == 1 ]] || { issue "$label must be root-owned mode 0600 with one link"; return 1; }
  parent=$(dirname "$file")
  # Reuse the pack's full ancestor walk (including its narrow root-owned sticky
  # /tmp fixture allowance) so a writable ancestor cannot swap the checked
  # private directory between metadata validation and use.
  canonical_private_output_path "$parent/.astro-private-metadata-path-check" >/dev/null
  parent_state=$(stat -Lc '%u:%a' -- "$parent")
  [[ "$parent_state" == 0:700 ]] || { issue "$label parent must be root-owned mode 0700"; return 1; }
  return 0
}

validate_rotation_manifest() {
  local site fragment key installed extra header secret state digest previous
  declare -A seen=()
  if [[ -z "$ROTATION_MANIFEST" ]]; then issue "--rotation-manifest is required"; return; fi
  validate_private_metadata_file "$ROTATION_MANIFEST" "rotation manifest" || return
  IFS= read -r header <"$ROTATION_MANIFEST" || true
  [[ "$header" == $'site\tfragment\tkey_name\tinstalled' ]] || { issue "Rotation manifest header is invalid"; return; }
  while IFS=$'\t' read -r site fragment key installed extra || [[ -n "$site" ]]; do
    [[ -n "$site" ]] || continue
    [[ -n "${EXPECTED_SITES[$site]:-}" && "$site" != connectresourcesint.com ]] || { issue "Unexpected rotation row: $site"; continue; }
    [[ -z "$extra" && "$key" == INTERNAL_JOB_SECRET && "$installed" == YES ]] || { issue "Rotation row is not installed/valid for $site"; continue; }
    [[ -z "${seen[$site]:-}" ]] || { issue "Duplicate rotation row: $site"; continue; }
    [[ "$fragment" == "$(dirname "$ROTATION_MANIFEST")/$site.env.fragment" ]] || { issue "Rotation fragment path mismatch for $site"; continue; }
    validate_private_metadata_file "$fragment" "rotation fragment for $site" || continue
    state=$(stat -Lc '%u:%g:%a:%h' -- "$fragment")
    [[ "$state" == 0:0:600:1 ]] || { issue "Unsafe rotation fragment metadata for $site"; continue; }
    secret=$(safe_env_value "$fragment" INTERNAL_JOB_SECRET || true)
    [[ "$secret" =~ ^[0-9a-f]{64}$ ]] || { issue "Rotation fragment format is invalid for $site"; unset secret; continue; }
    digest=$(printf '%s' "$secret" | sha256sum); digest=${digest%% *}
    previous=${SECRET_SITE_BY_HASH[$digest]:-}
    if [[ -n "$previous" ]]; then issue "Staged secrets are duplicated between $previous and $site"; else SECRET_SITE_BY_HASH["$digest"]=$site; fi
    ROTATION_SECRET["$site"]=$secret
    unset secret digest
    seen["$site"]=yes
  done < <(tail -n +2 -- "$ROTATION_MANIFEST")
  for site in "${!EXPECTED_SITES[@]}"; do
    [[ "$site" == connectresourcesint.com ]] && continue
    [[ "${seen[$site]:-}" == yes ]] || issue "Installed rotation row missing for $site"
  done
  [[ "${#seen[@]}" -eq 28 ]] || issue "Rotation manifest must contain exact 28 affected rows"
}

validate_basic_secret_acl() {
  local env_file=$1 site=$2 acl
  if acl=$(getfacl -cpn -- "$env_file" 2>/dev/null); then
    [[ "$acl" == $'user::rw-\ngroup::r--\nother::---' ]] || \
      issue "Active env has a named, default, or noncanonical ACL for $site"
  else
    issue "Cannot read the active env ACL for $site"
  fi
}

validate_active_secret() {
  local site=$1 env_file=$FLEET_ROOT/$site/.env.prod count active uid gid mode links service_uid service_gid mtime
  [[ -n "${ROTATION_SECRET[$site]:-}" ]] || return
  [[ -f "$env_file" && ! -L "$env_file" && "$(realpath -e -- "$env_file")" == "$env_file" ]] || { issue "Active env is unsafe for $site"; return; }
  count=$(grep -Ec '^[[:space:]]*INTERNAL_JOB_SECRET=' -- "$env_file" || true)
  [[ "$count" -eq 1 ]] || { issue "Active secret assignment count is not one for $site"; return; }
  active=$(safe_env_value "$env_file" INTERNAL_JOB_SECRET || true)
  [[ "$active" == "${ROTATION_SECRET[$site]}" ]] || issue "Active secret does not equal installed rotation fragment for $site"
  uid=$(file_uid "$env_file"); gid=$(stat -Lc '%g' -- "$env_file"); mode=$(file_mode "$env_file"); links=$(stat -Lc '%h' -- "$env_file")
  service_uid=$(id -u "${SITE_SERVICE_USER[$site]}" 2>/dev/null || true)
  service_gid=$(getent group "${SITE_SERVICE_GROUP[$site]}" 2>/dev/null | awk -F: '{print $3}' || true)
  if [[ -z "$service_uid" || -z "$service_gid" ]]; then
    issue "Cannot resolve service identity for active env: $site"
  elif [[ "$mode" != 640 || "$uid" != 0 || "$gid" != "$service_gid" ]]; then
    issue "Active env is not immutable-to-runtime root:service-group mode 0640 for $site"
  fi
  validate_basic_secret_acl "$env_file" "$site"
  [[ "$links" == 1 ]] || issue "Active env has more than one hard link for $site"
  if ((ACCESS_REVOKED_SECONDS > 0 && ROTATION_EPOCH_SECONDS > 0)); then
    mtime=$(stat -Lc '%Y' -- "$env_file")
    ((mtime >= ACCESS_REVOKED_SECONDS && mtime <= ROTATION_EPOCH_SECONDS + 300)) || issue "Active env mtime is outside the attested post-revocation rotation window for $site"
  fi
  unset active
}

hmac_sha256() {
  local key=$1 message=$2
  { printf '%s\0%s' "$key" "$message"; } | node -e \
    'const f=require("fs"),c=require("crypto"),b=f.readFileSync(0),i=b.indexOf(0);if(i<1)process.exit(2);process.stdout.write(c.createHmac("sha256",b.subarray(0,i)).update(b.subarray(i+1)).digest("hex"));'
}

readiness_message() {
  local site=$1 site_id=$2
  printf 'astro-security-readiness-v1\ncommit=%s\nrotation_epoch=%s\nsite=%s\nsite_id=%s\nscope=gtm:write\npath=/api/internal/gtm/save' \
    "$EXPECTED_COMMIT" "$ROTATION_EPOCH" "$site" "$site_id"
}

validate_signer_readiness() {
  local file=$SIGNER_READINESS first second third fourth fifth sixth seventh extra header_commit= revoked= rotation=
  local site message expected_mac file_mtime commit_time
  declare -A ready=()
  if [[ -z "$file" ]]; then issue "--signer-readiness is required"; return; fi
  validate_private_metadata_file "$file" "signer-readiness file" || return
  while IFS=$'\t' read -r first second third fourth fifth sixth seventh extra || [[ -n "$first" ]]; do
    [[ -n "$first" && "$first" != \#* ]] || continue
    case "$first" in
      expected_commit)
        [[ -z "$header_commit" && -n "$second" && -z "$third$fourth$fifth$sixth$seventh$extra" ]] || { issue "Invalid expected_commit header"; continue; }
        header_commit=${second,,}
        ;;
      developer_access_revoked_at)
        [[ -z "$revoked" && "$second" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ && -z "$third$fourth$fifth$sixth$seventh$extra" ]] || { issue "Invalid revocation header"; continue; }
        revoked=$second
        ;;
      rotation_epoch)
        [[ -z "$rotation" && "$second" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ && -z "$third$fourth$fifth$sixth$seventh$extra" ]] || { issue "Invalid rotation header"; continue; }
        rotation=$second
        ;;
      *)
        [[ -z "$extra" && "$third" == site-v1 && "$fourth" == gtm:write && "$fifth" == /api/internal/gtm/save && "$sixth" == READY && "$seventh" =~ ^[0-9a-f]{64}$ ]] || { issue "Malformed signer row for ${first:-unknown}"; continue; }
        [[ "${EXPECTED_GTM_SITES[$first]:-}" == "$second" ]] || { issue "Unexpected signer/siteId row: $first"; continue; }
        [[ -z "${ready[$first]:-}" ]] || { issue "Duplicate signer row: $first"; continue; }
        ready["$first"]=$seventh
        ;;
    esac
  done <"$file"
  [[ "$header_commit" == "$EXPECTED_COMMIT" ]] || issue "Signer expected commit mismatch"
  if [[ -n "$revoked" && -n "$rotation" ]]; then
    ACCESS_REVOKED_SECONDS=$(date -u -d "$revoked" +%s 2>/dev/null || printf 0)
    ROTATION_EPOCH_SECONDS=$(date -u -d "$rotation" +%s 2>/dev/null || printf 0)
    ROTATION_EPOCH=$rotation
    ((ACCESS_REVOKED_SECONDS > 0 && ROTATION_EPOCH_SECONDS > ACCESS_REVOKED_SECONDS)) || issue "Rotation must be after developer-access revocation"
    ((ROTATION_EPOCH_SECONDS <= $(date -u +%s) + 300)) || issue "Rotation epoch is implausibly in the future"
    commit_time=$(git -C "$SOURCE_ROOT" show -s --format=%ct "$EXPECTED_COMMIT" 2>/dev/null || printf 0)
    ((ROTATION_EPOCH_SECONDS >= commit_time)) || issue "Rotation predates the reviewed commit"
    file_mtime=$(stat -Lc '%Y' -- "$file")
    ((file_mtime >= ROTATION_EPOCH_SECONDS)) || issue "Signer-readiness file predates the rotation epoch"
  else
    issue "Signer readiness needs revocation and rotation headers"
  fi
  if [[ -n "$ROTATION_EPOCH" ]]; then
    for site in "${!EXPECTED_GTM_SITES[@]}"; do
      [[ -n "${ready[$site]:-}" ]] || { issue "Signer readiness missing for $site"; continue; }
      [[ -n "${ROTATION_SECRET[$site]:-}" ]] || continue
      message=$(readiness_message "$site" "${EXPECTED_GTM_SITES[$site]}")
      expected_mac=$(hmac_sha256 "${ROTATION_SECRET[$site]}" "$message")
      [[ "${ready[$site]}" == "$expected_mac" ]] || issue "Signer proof does not match the active rotated secret for $site"
      unset expected_mac message
    done
  fi
  [[ "${#ready[@]}" -eq 26 ]] || issue "Signer-readiness file must contain exact 26 rows"
}

run_preflight() {
  local row site package unit port site_id gtm extra
  canonicalize_roots
  prepare_expected_maps
  require_command date; require_command getent; require_command getfacl; require_command git; require_command grep
  require_command node; require_command realpath; require_command sha256sum; require_command stat
  resolve_expected_commit
  verify_security_commit
  validate_exact_active_inventory
  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    validate_site_source "$site" "$package" "$site_id" "$gtm"
    validate_static_unit "$site" "$unit" "$port"
    if [[ "$MODE" == apply ]]; then validate_effective_unit "$site" "$unit" "$port"; fi
  done
  validate_explicit_exclusion
  validate_rotation_manifest
  validate_signer_readiness
  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    validate_active_secret "$site"
  done
}

print_review_plan() {
  local row site package unit port site_id gtm extra
  info "Affected inventory (build verification only):"
  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    printf 'PLAN site=%s package=%s unit=%s port=%s action=offline-test-and-build-only\n' "$site" "$package" "$unit" "$port"
  done
  info "Explicit exclusion: connectresourcesint.com (active, but no @connect/site-cms/contact-route exposure)"
}

validate_build_user() {
  local uid shell status home primary groups group_entry group_name group_gid group_members primary_users
  [[ "$BUILD_USER" == astro-security-build ]] || die "Only the dedicated astro-security-build account is accepted"
  getent passwd "$BUILD_USER" >/dev/null || die "Create the dedicated locked astro-security-build account first"
  uid=$(id -u "$BUILD_USER"); ((uid != 0)) || die "Build user must be non-root"
  shell=$(getent passwd "$BUILD_USER" | awk -F: '{print $7}')
  home=$(getent passwd "$BUILD_USER" | awk -F: '{print $6}')
  [[ "$shell" == */nologin || "$shell" == */false ]] || die "Build user needs a nologin shell"
  [[ "$home" == /var/empty/astro-security-build || "$home" == /nonexistent ]] || die "Build user needs a non-login home"
  status=$(passwd -S "$BUILD_USER" 2>/dev/null | awk '{print $2}' || true)
  [[ "$status" == L ]] || die "Build user password must be locked"
  primary=$(id -g "$BUILD_USER")
  ((primary != 0)) || die "Build user's primary group must be non-root"
  group_entry=$(getent group "$BUILD_USER" || true)
  [[ -n "$group_entry" ]] || die "Dedicated build group is missing"
  IFS=: read -r group_name _ group_gid group_members <<<"$group_entry"
  [[ "$group_name" == "$BUILD_USER" && "$group_gid" == "$primary" ]] || die "Build user needs its same-name dedicated primary group"
  [[ -z "$group_members" ]] || die "Dedicated build group must not list supplementary members"
  primary_users=$(getent passwd | awk -F: -v gid="$primary" '$4 == gid {print $1}')
  [[ "$primary_users" == "$BUILD_USER" ]] || die "Dedicated build group must have exactly one primary user"
  groups=$(id -G "$BUILD_USER")
  [[ "$groups" == "$primary" ]] || die "Build user must have no supplementary groups"
  ! pgrep -u "$uid" >/dev/null 2>&1 || die "Build user has active processes"
}

validate_apply_gates() {
  local available_kib store_kib required_kib stage_target stage_device var_device
  local total_kib total_inodes free_inodes mount_options
  require_root
  [[ "$(date -u +%F)" < "$EARLIEST_APPLY_DATE_UTC" ]] && die "Build verification is disabled before $EARLIEST_APPLY_DATE_UTC UTC"
  [[ -n "$CONFIRMED_COMMIT" && "${CONFIRMED_COMMIT,,}" == "$EXPECTED_COMMIT" ]] || die "--confirm-commit must repeat the expected commit"
  ((CONFIRM_BUILD_ONLY == 1)) || die "--confirm-build-verification-only is required"
  require_command df; require_command du; require_command find; require_command findmnt
  require_command pgrep; require_command pnpm; require_command systemd-run
  [[ "$(pnpm --version)" == "$EXPECTED_PNPM_VERSION" ]] || die "pnpm must be exact version $EXPECTED_PNPM_VERSION"
  validate_build_user
  require_absolute_path "$PNPM_STORE_SOURCE" "pnpm store source"
  require_plain_directory "$PNPM_STORE_SOURCE" "pnpm store source"
  PNPM_STORE_SOURCE=$(realpath -e -- "$PNPM_STORE_SOURCE")
  [[ "$PNPM_STORE_SOURCE" == /opt/.pnpm-store ]] || die "Only the reviewed /opt/.pnpm-store input is accepted"
  canonical_private_output_path "$PNPM_STORE_SOURCE/.astro-store-path-check" >/dev/null
  [[ "$(stat -Lc '%u:%g' "$PNPM_STORE_SOURCE")" == 0:0 ]] || die "pnpm store must be root:root"
  [[ -z "$(find -P "$PNPM_STORE_SOURCE" -xdev ! -type d ! -type f -print -quit)" ]] || \
    die "pnpm store contains a symlink or special object"
  [[ -d "$BUILD_STAGE_PARENT" && ! -L "$BUILD_STAGE_PARENT" && \
     "$(realpath -e "$BUILD_STAGE_PARENT")" == "$BUILD_STAGE_PARENT" ]] || \
    die "Provision the fixed dedicated build filesystem at $BUILD_STAGE_PARENT first"
  [[ "$(stat -Lc '%u:%g:%a' "$BUILD_STAGE_PARENT")" == 0:0:700 ]] || die "Build-stage mount must be root:root 0700"
  canonical_private_output_path "$BUILD_STAGE_PARENT/.astro-build-mount-check" >/dev/null
  stage_target=$(findmnt -rn -o TARGET --target "$BUILD_STAGE_PARENT")
  [[ "$stage_target" == "$BUILD_STAGE_PARENT" ]] || die "Build-stage parent must itself be a mountpoint"
  stage_device=$(findmnt -rn -o MAJ:MIN --target "$BUILD_STAGE_PARENT")
  var_device=$(findmnt -rn -o MAJ:MIN --target /var)
  [[ -n "$stage_device" && "$stage_device" != "$var_device" ]] || die "Build-stage filesystem must use a different device from /var"
  mount_options=$(findmnt -rn -o OPTIONS --target "$BUILD_STAGE_PARENT")
  [[ ",$mount_options," == *,rw,* && ",$mount_options," == *,nosuid,* && ",$mount_options," == *,nodev,* ]] || \
    die "Build-stage filesystem must be mounted rw,nosuid,nodev"
  IFS=' ' read -r total_kib available_kib < <(df -Pk -- "$BUILD_STAGE_PARENT" | awk 'NR == 2 {print $2, $4}')
  IFS=' ' read -r total_inodes free_inodes < <(df -Pi -- "$BUILD_STAGE_PARENT" | awk 'NR == 2 {print $2, $4}')
  [[ "$total_kib" =~ ^[0-9]+$ && "$available_kib" =~ ^[0-9]+$ && \
     "$total_inodes" =~ ^[0-9]+$ && "$free_inodes" =~ ^[0-9]+$ ]] || die "Cannot read build-stage filesystem bounds"
  ((total_kib <= 32 * 1024 * 1024 && total_inodes <= 2000000)) || die "Build-stage filesystem exceeds the reviewed 32 GiB / 2M-inode ceiling"
  ((available_kib >= 12 * 1024 * 1024 && free_inodes >= 500000)) || die "Build-stage filesystem lacks the reviewed free-space/inode floor"
  store_kib=$(du -sk -- "$PNPM_STORE_SOURCE" | awk '{print $1}')
  required_kib=$((store_kib * 2 + 10 * 1024 * 1024))
  ((available_kib >= required_kib)) || die "Insufficient dedicated build-filesystem space"
  [[ -d /var/lib && ! -L /var/lib && "$(stat -Lc '%u:%a' /var/lib)" == 0:755 ]] || die "/var/lib must be root-owned mode 0755"
  [[ ! -e "$BUILD_STAGE_PARENT/$EXPECTED_COMMIT" && ! -L "$BUILD_STAGE_PARENT/$EXPECTED_COMMIT" ]] || die "Exact build-evidence directory already exists"
}

write_build_runner() {
  local runner=$1 manifest=$2 row site package unit port site_id gtm extra
  {
    printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail' "test \"\$(id -u)\" -ne 0" \
      'exec >>/build/build.log 2>&1' \
      "test \"\$(pnpm --version)\" = '$EXPECTED_PNPM_VERSION'" 'cd /build/source' \
      'pnpm install --offline --frozen-lockfile --ignore-scripts --ignore-pnpmfile --store-dir /build/pnpm-store' \
      'pnpm --dir packages/site-cms test' \
      'pnpm --dir Astro-production/redo.ae exec node --import tsx --test tests/persist-attachments-security.test.mjs'
    printf '%s\n' 'while IFS=$'"'"'\t'"'"' read -r site package; do' \
      '  printf '"'"'BUILD %s (%s)\n'"'"' "$site" "$package"' \
      '  pnpm --filter "$package" run build' \
      '  test -f "Astro-production/$site/dist/server/entry.mjs"' \
      'done </build/build-manifest.tsv'
  } >"$runner"
  : >"$manifest"
  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    printf '%s\t%s\n' "$site" "$package" >>"$manifest"
  done
  chown 0:0 "$runner" "$manifest"
  chmod 0555 "$runner"
  chmod 0444 "$manifest"
}

run_sandboxed_build() {
  local stage=$1 unit="astro-security-build-${EXPECTED_COMMIT:0:12}" build_gid
  build_gid=$(id -g "$BUILD_USER")
  systemd-run --quiet --wait --collect --unit="$unit" \
    --uid="$BUILD_USER" --gid="$build_gid" \
    --property=Type=exec \
    --property=WorkingDirectory=/build/source \
    --property=PrivateNetwork=yes \
    --property=PrivateTmp=yes \
    --property=PrivateDevices=yes \
    --property=PrivateIPC=yes \
    --property=ProtectSystem=strict \
    --property=ProtectHome=yes \
    --property=ProtectKernelTunables=yes \
    --property=ProtectKernelModules=yes \
    --property=ProtectKernelLogs=yes \
    --property=ProtectControlGroups=yes \
    --property=ProtectClock=yes \
    --property=ProtectHostname=yes \
    --property=ProtectProc=invisible \
    --property=ProcSubset=pid \
    --property=NoNewPrivileges=yes \
    --property=RestrictSUIDSGID=yes \
    --property=RestrictRealtime=yes \
    --property=RestrictNamespaces=yes \
    --property=LockPersonality=yes \
    --property=CapabilityBoundingSet= \
    --property=AmbientCapabilities= \
    --property=RestrictAddressFamilies=AF_UNIX \
    --property=TemporaryFileSystem=/opt:ro \
    --property=TemporaryFileSystem=/var:ro \
    --property=TemporaryFileSystem=/run:ro \
    --property="BindPaths=$stage:/build" \
    --property=InaccessiblePaths=-/etc/caddy\ -/etc/letsencrypt\ -/etc/ssh\ -/etc/restic\ -/etc/systemd/system\ -/srv\ -/mnt\ -/media \
    --property=UMask=0077 \
    --property=TasksMax=512 \
    --property=MemoryMax=4G \
    --property=CPUQuota=200% \
    --property=LimitFSIZE=512M \
    --property=Nice=10 \
    --property=IOSchedulingClass=idle \
    --property=RuntimeMaxSec=4h \
    --property=TimeoutStopSec=30s \
    --property=KillMode=control-group \
    /usr/bin/env -i \
      HOME=/build/home \
      PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
      CI=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 XDG_CACHE_HOME=/build/cache \
      /usr/bin/bash /build/run-build.sh
}

freeze_and_hash_evidence() {
  local stage=$1 evidence=$stage/BUILD-EVIDENCE-SHA256.tsv row site package unit port site_id gtm extra dist
  chown -hR 0:0 -- "$stage/source" "$stage/pnpm-store" "$stage/home" "$stage/cache"
  chown 0:0 -- "$stage/build.log"
  chmod 0600 -- "$stage/build.log"
  : >"$evidence"
  for row in "${FLEET_MANIFEST[@]}"; do
    IFS='|' read -r site package unit port site_id gtm extra <<<"$row"
    dist=$stage/source/Astro-production/$site/dist
    [[ -d "$dist" && ! -L "$dist" && -f "$dist/server/entry.mjs" ]] || die "Missing build evidence for $site"
    [[ -z "$(find -P "$dist" -xdev \( -type l -o -type p -o -type s -o -type b -o -type c \) -print -quit)" ]] || die "Special/symlink object in build evidence for $site"
    [[ -z "$(find -P "$dist" -xdev -type f -links +1 -print -quit)" ]] || die "Hard-linked file in build evidence for $site"
    find -P "$dist" -xdev -type f -print0 | sort -z | xargs -0 sha256sum >>"$evidence"
  done
  chown 0:0 "$evidence"; chmod 0600 "$evidence"
  {
    printf 'BUILD VERIFICATION ONLY — NOT A DEPLOYABLE RELEASE\n\n'
    printf 'Expected commit: %s\n' "$EXPECTED_COMMIT"
    printf 'Completed UTC: %s\n\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'The shared tests, Redo attachment test, and all 28 affected builds passed in a\n'
    printf 'networkless, clean-environment transient service. No live file or service changed.\n\n'
    printf 'Do not copy dist from this directory into production. Astro SSR output imports\n'
    printf 'external packages from node_modules, and the fleet has no reviewed immutable,\n'
    printf 'dependency-complete atomic release contract. Build that release mechanism and\n'
    printf 'review it separately before any one-site maintenance rollout.\n'
  } >"$stage/BUILD-VERIFICATION-ONLY.txt"
  chown 0:0 "$stage/BUILD-VERIFICATION-ONLY.txt"; chmod 0600 "$stage/BUILD-VERIFICATION-ONLY.txt"
  chmod 0700 "$stage"
}

stage_build_verification() {
  local stage=$BUILD_STAGE_PARENT/$EXPECTED_COMMIT build_uid build_gid stage_identity
  require_command cp; require_command flock; require_command install; require_command setpriv
  require_command sha256sum; require_command sort; require_command systemd-run; require_command tar; require_command xargs
  exec 9>/run/lock/astro-app-security-build-verification.lock
  flock -n 9 || die "Another application-security build verification holds the lock"
  [[ -d "$BUILD_STAGE_PARENT" && ! -L "$BUILD_STAGE_PARENT" && \
     "$(realpath -e "$BUILD_STAGE_PARENT")" == "$BUILD_STAGE_PARENT" && \
     "$(stat -Lc '%u:%g:%a' "$BUILD_STAGE_PARENT")" == 0:0:700 ]] || die "Build-stage mount changed after preflight"
  [[ "$(findmnt -rn -o TARGET --target "$BUILD_STAGE_PARENT")" == "$BUILD_STAGE_PARENT" ]] || die "Build-stage mount disappeared after preflight"
  [[ ! -e "$stage" && ! -L "$stage" ]] || die "Exact build-evidence target appeared before locked creation"
  mkdir -m 0711 -- "$stage"
  stage_identity=$(stat -Lc '%d:%i:%u:%g:%a' -- "$stage")
  [[ "$stage_identity" == *:0:0:711 ]] || die "Locked build-evidence directory creation failed metadata checks"
  build_uid=$(id -u "$BUILD_USER"); build_gid=$(id -g "$BUILD_USER")
  install -d -m 0700 -o "$build_uid" -g "$build_gid" "$stage/source" "$stage/pnpm-store" "$stage/home" "$stage/cache"
  install -m 0600 -o "$build_uid" -g "$build_gid" /dev/null "$stage/build.log"
  git -C "$SOURCE_ROOT" archive --format=tar "$EXPECTED_COMMIT" | \
    setpriv --reuid "$build_uid" --regid "$build_gid" --clear-groups --no-new-privs tar -xf - -C "$stage/source"
  cp -a --reflink=auto -- "$PNPM_STORE_SOURCE/." "$stage/pnpm-store/"
  chown -hR "$build_uid:$build_gid" "$stage/pnpm-store"
  write_build_runner "$stage/run-build.sh" "$stage/build-manifest.tsv"
  info "Running offline tests and 28 builds in constrained transient service; live fleet is untouched"
  run_sandboxed_build "$stage"
  ! pgrep -u "$build_uid" >/dev/null 2>&1 || die "Build user has a residual process after transient unit exit"
  freeze_and_hash_evidence "$stage"
  info "Build verification passed: $stage"
  blocked "No deployment package or live rollout command was generated; dependency-complete atomic releases require separate review"
}

# Permit the fixture to syntax-check the generated unprivileged runner without
# triggering any preflight or apply action. Executing the file never takes this
# path.
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

run_preflight
print_review_plan

if ((ISSUES > 0)); then
  die "Preflight failed with $ISSUES issue(s); no live or staging state was changed"
fi

if [[ "$MODE" == dry-run ]]; then
  info "Read-only preflight passed: 28 affected sites, 26 secret-bound signers, and one explicit active exclusion"
  info "No build, directory, secret, environment, live file, or service action occurred"
  exit 0
fi

validate_apply_gates
print_apply_banner "This creates isolated build evidence only. It cannot deploy or restart a service."
stage_build_verification
