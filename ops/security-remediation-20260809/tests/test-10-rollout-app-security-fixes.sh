#!/usr/bin/env bash
# Root-only fixture for the exact app-remediation readiness preflight.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
TARGET=$SCRIPT_DIR/10-rollout-app-security-fixes.sh
TMP_ROOT=$(mktemp -d /tmp/astro-rollout-fixture.XXXXXX)

[[ "$(id -u)" -eq 0 ]] || { printf 'SKIP: root is required for private rotation fixtures\n'; exit 0; }

cleanup() {
  case "$TMP_ROOT" in /tmp/astro-rollout-fixture.*) rm -rf -- "$TMP_ROOT" ;; *) exit 1 ;; esac
}
trap cleanup EXIT

if grep -Eq '^[[:space:]]*systemctl[[:space:]]+(start|stop|restart)|REVIEWED-MANUAL-ROLLOUT|live-dist-backups' "$TARGET"; then
  printf 'Build-verification helper must not contain live deployment actions\n' >&2
  exit 1
fi
grep -Fq -- '--ignore-pnpmfile' "$TARGET"
grep -Fq -- '/usr/bin/env -i' "$TARGET"
grep -Fq -- '--uid="$BUILD_USER"' "$TARGET"
grep -Fq -- 'TemporaryFileSystem=/opt:ro' "$TARGET"
grep -Fq -- 'Build-stage parent must itself be a mountpoint' "$TARGET"
grep -Fq -- 'Build user needs its same-name dedicated primary group' "$TARGET"
grep -Fq -- 'Dedicated service group lists supplementary members' "$TARGET"
grep -Fq -- 'persist-attachments-security.test.mjs' "$TARGET"
grep -Fq -- 'BUILD VERIFICATION ONLY — NOT A DEPLOYABLE RELEASE' "$TARGET"

generated_runner=$TMP_ROOT/generated-run-build.sh
generated_manifest=$TMP_ROOT/generated-build-manifest.tsv
(
  set --
  # shellcheck source=/dev/null
  source "$TARGET"
  write_build_runner "$generated_runner" "$generated_manifest"
)
bash -n "$generated_runner"
grep -Fq -- 'pnpm install --offline --frozen-lockfile --ignore-scripts --ignore-pnpmfile' "$generated_runner"
grep -Fq -- 'pnpm --dir packages/site-cms test' "$generated_runner"
grep -Fq -- 'persist-attachments-security.test.mjs' "$generated_runner"
[[ "$(wc -l <"$generated_manifest")" -eq 28 ]]

# Exercise the apply-only NSS identity gate directly: correct file ownership is
# insufficient when a developer remains a member of the numeric service group.
member_rejection=$(
  (
    # shellcheck source=/dev/null
    source "$TARGET"
    issue() { printf 'ISSUE: %s\n' "$*"; ISSUES=$((ISSUES + 1)); }
    id() {
      case "$1" in
        -u) printf '4242\n' ;;
        -g) printf '4243\n' ;;
        -G) printf '4243\n' ;;
        *) return 2 ;;
      esac
    }
    getent() {
      case "$1:$#" in
        group:2) printf 'site-fixture:x:4243:webdev\n' ;;
        group:1) printf 'site-fixture:x:4243:webdev\n' ;;
        passwd:1) printf 'site-fixture:x:4242:4243::/nonexistent:/usr/sbin/nologin\n' ;;
        *) return 2 ;;
      esac
    }
    validate_dedicated_service_identity site-fixture site-fixture fixture
    ((ISSUES > 0))
  )
)
grep -Fq 'Dedicated service group lists supplementary members for fixture' <<<"$member_rejection"

SOURCE=$TMP_ROOT/source
FLEET=$SOURCE/Astro-production
UNITS=$TMP_ROOT/systemd
ROTATION=$TMP_ROOT/rotation
MANIFEST=$ROTATION/MANIFEST.tsv
READINESS=$ROTATION/signer-readiness.tsv
mkdir -m 0700 -p "$SOURCE" "$UNITS" "$ROTATION"

rows=(
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

security_files=(
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
for path in "${security_files[@]}"; do mkdir -p "$SOURCE/$(dirname "$path")"; : >"$SOURCE/$path"; done

printf '%s\n' 'requireSiteScopedInternalJobAuth' 'Preserve the exact media type and parameter values' >"$SOURCE/packages/site-cms/src/auth/internal-job.ts"
printf '%s\n' "requireSiteScopedInternalJobAuth(request, 'gtm:write')" >"$SOURCE/packages/site-cms/src/astro/gtm/save.ts"
printf '%s\n' 'GTM_ID_PATTERN' >"$SOURCE/packages/site-cms/src/gtm/store.ts"
printf '%s\n' 'requestWithLimitedBody readRequestBodyLimited' >"$SOURCE/packages/site-cms/src/http/request-body.ts"
printf '%s\n' 'MAX_KEYS = 10_000' 'hits.keys().next()' >"$SOURCE/packages/site-cms/src/http/rate-limit.ts"
printf '%s\n' 'resolveContainedPath' >"$SOURCE/packages/site-cms/src/leads/public-id.ts"
printf '%s\n' 'O_NOFOLLOW' 'mode: 0o640' >"$SOURCE/packages/site-cms/src/leads/file-store.ts"
printf '%s\n' "export { FileLeadStore } from '@connect/site-cms'" >"$SOURCE/Astro-production/connectgroup.co/src/lib/leads/file-store.ts"
printf '%s\n' "mediaType === 'application/json'" 'MAX_JSON_BODY_BYTES = 1 * 1024 * 1024' 'MAX_MULTIPART_BODY_BYTES = 10 * 1024 * 1024' >"$SOURCE/Astro-production/redo.ae/src/pages/api/contact.ts"
printf '%s\n' '{"name":"@connect/site-cms"}' >"$SOURCE/packages/site-cms/package.json"
printf '%s\n' 'lockfileVersion: 9.0' >"$SOURCE/pnpm-lock.yaml"

test_user=$(id -un)
test_group=$(id -gn)
printf 'site\tfragment\tkey_name\tinstalled\n' >"$MANIFEST"

index=0
for row in "${rows[@]}"; do
  IFS='|' read -r site package unit port site_id gtm <<<"$row"
  site_dir=$FLEET/$site
  mkdir -p "$site_dir/src/pages/api" "$site_dir/src/utils/form"
  printf '{"name":"%s","dependencies":{"@connect/site-cms":"workspace:*"}}\n' "$package" >"$site_dir/package.json"
  printf "configureSiteCms({ siteId: '%s' });\n" "$site_id" >"$site_dir/src/cms.ts"
  printf '%s\n' 'isRateLimited readRequestBodyLimited' >"$site_dir/src/pages/api/contact.ts"
  printf '%s\n' "export * from '@connect/site-cms/http/rate-limit';" >"$site_dir/src/utils/form/rate-limit.ts"
  printf '%s\n' "export * from '@connect/site-cms/http/request-body';" >"$site_dir/src/utils/form/read-body-limited.ts"
  printf '%s\n' '.env.prod' >"$site_dir/.gitignore"
  if [[ "$gtm" == yes ]]; then
    mkdir -p "$site_dir/src/pages/api/internal/gtm"
    printf '%s\n' "export { POST } from '@connect/site-cms/astro/gtm/save';" >"$site_dir/src/pages/api/internal/gtm/save.ts"
  fi
  index=$((index + 1))
  secret=$(printf '%064x' "$index")
  fragment=$ROTATION/$site.env.fragment
  printf 'INTERNAL_JOB_SECRET=%s\n' "$secret" >"$fragment"
  printf 'INTERNAL_JOB_SECRET=%s\n' "$secret" >"$site_dir/.env.prod"
  chmod 0600 "$fragment"
  chmod 0640 "$site_dir/.env.prod"
  printf '%s\t%s\tINTERNAL_JOB_SECRET\tYES\n' "$site" "$fragment" >>"$MANIFEST"
  cat >"$UNITS/$unit.service" <<UNIT
[Service]
User=$test_user
Group=$test_group
WorkingDirectory=$site_dir
EnvironmentFile=$site_dir/.env.prod
ExecStart=/usr/bin/env HOST=127.0.0.1 PORT=$port /usr/bin/node dist/server/entry.mjs
UNIT
done

# The generic route fixture above intentionally gets the additional Redo shape
# and exact media-type markers required by its larger attachment endpoint.
printf '%s\n' 'isRateLimited requestWithLimitedBody' "mediaType === 'application/json'" \
  'MAX_JSON_BODY_BYTES = 1 * 1024 * 1024' \
  'MAX_MULTIPART_BODY_BYTES = 10 * 1024 * 1024' \
  >"$FLEET/redo.ae/src/pages/api/contact.ts"

excluded=$FLEET/connectresourcesint.com
mkdir -p "$excluded/src/pages/api"
printf '%s\n' '{"name":"connectresourcesint-astro"}' >"$excluded/package.json"
printf '%s\n' 'health only' >"$excluded/src/pages/api/health.ts"
cat >"$UNITS/connectresourcesint.service" <<UNIT
[Service]
User=$test_user
Group=$test_group
WorkingDirectory=$excluded
EnvironmentFile=$excluded/.env.prod
ExecStart=/usr/bin/env HOST=127.0.0.1 PORT=5098 /usr/bin/node dist/server/entry.mjs
UNIT

chmod 0600 "$MANIFEST"
git -C "$SOURCE" init -q -b main
git -C "$SOURCE" config user.name fixture
git -C "$SOURCE" config user.email fixture@example.invalid
git -C "$SOURCE" add .
git -C "$SOURCE" commit -qm fixture
EXPECTED=$(git -C "$SOURCE" rev-parse HEAD)

now=$(date -u +%s)
revoked_seconds=$((now - 120))
revoked=$(date -u -d "@$revoked_seconds" +%Y-%m-%dT%H:%M:%SZ)
rotation=$(date -u -d "@$now" +%Y-%m-%dT%H:%M:%SZ)
printf 'expected_commit\t%s\ndeveloper_access_revoked_at\t%s\nrotation_epoch\t%s\n' "$EXPECTED" "$revoked" "$rotation" >"$READINESS"

hmac() {
  local key=$1 message=$2
  { printf '%s\0%s' "$key" "$message"; } | node -e \
    'const f=require("fs"),c=require("crypto"),b=f.readFileSync(0),i=b.indexOf(0);process.stdout.write(c.createHmac("sha256",b.subarray(0,i)).update(b.subarray(i+1)).digest("hex"));'
}

for row in "${rows[@]}"; do
  IFS='|' read -r site package unit port site_id gtm <<<"$row"
  [[ "$gtm" == yes ]] || continue
  secret=$(sed -n 's/^INTERNAL_JOB_SECRET=//p' "$ROTATION/$site.env.fragment")
  message=$(printf 'astro-security-readiness-v1\ncommit=%s\nrotation_epoch=%s\nsite=%s\nsite_id=%s\nscope=gtm:write\npath=/api/internal/gtm/save' "$EXPECTED" "$rotation" "$site" "$site_id")
  mac=$(hmac "$secret" "$message")
  printf '%s\t%s\tsite-v1\tgtm:write\t/api/internal/gtm/save\tREADY\t%s\n' "$site" "$site_id" "$mac" >>"$READINESS"
done
chmod 0600 "$READINESS"
touch -d "@$now" "$READINESS" "$FLEET"/*/.env.prod

output=$TMP_ROOT/preflight.txt
if ! bash "$TARGET" --source-root "$SOURCE" --systemd-dir "$UNITS" \
  --expected-commit "$EXPECTED" --rotation-manifest "$MANIFEST" \
  --signer-readiness "$READINESS" >"$output" 2>&1; then
  sed -n '1,240p' "$output" >&2
  exit 1
fi
grep -Fq 'Read-only preflight passed: 28 affected sites, 26 secret-bound signers, and one explicit active exclusion' "$output"
[[ "$(grep -c '^PLAN site=' "$output")" -eq 28 ]]

# stat mode 0640 does not expose a named ACL. Exercise the exact ACL parser
# directly because some test user namespaces do not permit creating POSIX ACLs.
named_acl_rejection=$(
  (
    # shellcheck source=/dev/null
    source "$TARGET"
    issue() { printf 'ISSUE: %s\n' "$*"; ISSUES=$((ISSUES + 1)); }
    getfacl() {
      printf 'user::rw-\nuser:1000:r--\ngroup::r--\nmask::r--\nother::---\n'
    }
    validate_basic_secret_acl /fixture/.env.prod c-uae.com
    ((ISSUES > 0))
  )
)
grep -Fq 'Active env has a named, default, or noncanonical ACL for c-uae.com' <<<"$named_acl_rejection"

# Prove duplicate values and stale signer proof fail closed without value output.
duplicate_secret=$(sed -n 's/^INTERNAL_JOB_SECRET=//p' "$ROTATION/c-uae.com.env.fragment")
printf 'INTERNAL_JOB_SECRET=%s\n' "$duplicate_secret" >"$ROTATION/connectfm.ae.env.fragment"
printf 'INTERNAL_JOB_SECRET=%s\n' "$duplicate_secret" >"$FLEET/connectfm.ae/.env.prod"
chmod 0600 "$ROTATION/connectfm.ae.env.fragment"
chmod 0640 "$FLEET/connectfm.ae/.env.prod"
if bash "$TARGET" --source-root "$SOURCE" --systemd-dir "$UNITS" \
  --expected-commit "$EXPECTED" --rotation-manifest "$MANIFEST" \
  --signer-readiness "$READINESS" >"$TMP_ROOT/rejected.txt" 2>&1; then
  printf 'Expected duplicated/stale secret readiness to fail\n' >&2
  exit 1
fi
grep -Fq 'Staged secrets are duplicated between c-uae.com and connectfm.ae' "$TMP_ROOT/rejected.txt"
grep -Fq 'Signer proof does not match the active rotated secret for connectfm.ae' "$TMP_ROOT/rejected.txt"
if grep -Fq -- "$duplicate_secret" "$TMP_ROOT/rejected.txt"; then
  printf 'Secret value leaked in rejected preflight output\n' >&2
  exit 1
fi

printf 'PASS: exact 29-active/28-affected inventory, full fix coverage, secret-bound readiness, redaction, and build-only isolation gates\n'
