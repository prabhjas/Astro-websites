#!/usr/bin/env bash
# Fixture coverage for exact manifests, traversal defense, durable ACLs, and rollback.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
TARGET=$SCRIPT_DIR/01-sensitive-modes-and-lead-pii.sh
TMP_ROOT=$(mktemp -d /tmp/astro-modes-fixture.XXXXXX)

[[ "$(id -u)" -eq 0 ]] || {
  printf 'SKIP: apply/rollback fixture requires root\n'
  exit 0
}
command -v getfacl >/dev/null 2>&1 || { printf 'SKIP: getfacl unavailable\n'; exit 0; }
command -v setfacl >/dev/null 2>&1 || { printf 'SKIP: setfacl unavailable\n'; exit 0; }
command -v node >/dev/null 2>&1 || { printf 'SKIP: Node.js unavailable for runtime creation fixture\n'; exit 0; }

cleanup() {
  if [[ "${ASTRO_KEEP_FIXTURE:-0}" == 1 ]]; then
    printf 'KEPT FIXTURE: %s\n' "$TMP_ROOT" >&2
    return
  fi
  case "$TMP_ROOT" in
    /tmp/astro-modes-fixture.*) rm -rf -- "$TMP_ROOT" ;;
    *) printf 'Refusing unsafe cleanup path: %s\n' "$TMP_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

FLEET=$TMP_ROOT/Astro-production
UNITS=$TMP_ROOT/systemd
BACKUP=$TMP_ROOT/rollback
BIN=$TMP_ROOT/bin
mkdir -p -- "$FLEET" "$UNITS" "$BIN"
chmod 0755 "$FLEET" "$UNITS"

cat >"$BIN/systemctl" <<'SYSTEMCTL'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  show) printf 'loaded\n' ;;
  is-active) exit 3 ;;
  *) exit 64 ;;
esac
SYSTEMCTL
chmod 0755 "$BIN/systemctl"
export ASTRO_SYSTEMCTL=$BIN/systemctl

readonly SECRET_MARKER='DO_NOT_PRINT_FIXTURE_SECRET_7fdd90d9'
readonly TRAVERSAL_MARKER='DO_NOT_PRINT_TRAVERSAL_VALUE_81ee4bca'

exposed_sites=(
  spheavyrental.ae
  connectfreelance.ae
  emiratiguard.com
  emiratisationgate.org
  emiratisationgateway.com
  kpmpro.ae
  ngmanpower.com
  peomiddleast.com
  thefreelancergate.com
)

lead_sites=(
  connectfm.ae connectfreelance.ae connectfz.com connecthr.ae
  connectresources.ae connectresources.sa emiratisationgate.org
  emiratisationgateway.com freelancerdxb.com iberiaeor.com kpmpro.ae
  ngmanpower.com payrollmiddleast.org peomiddleast.com pittant.com redo.ae
  royalvisa.ae
)

ownership_transition_supported=1
ownership_probe=$TMP_ROOT/ownership-probe
: >"$ownership_probe"
if ! chown 65534:65534 "$ownership_probe" 2>/dev/null; then
  ownership_transition_supported=0
fi
rm -f -- "$ownership_probe"

for site in "${exposed_sites[@]}"; do
  mkdir -p -- "$FLEET/$site"
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  printf 'INTERNAL_JOB_SECRET=%s\n' "$SECRET_MARKER" >"$env_path"
  chmod 0644 "$env_path"
done

# Looks vulnerable but is deliberately outside the immutable nine-path manifest.
extra_backup=$FLEET/connectfreelance.ae/.env.env.bak-20260807-185317
printf 'INTERNAL_JOB_SECRET=%s\n' "$SECRET_MARKER" >"$extra_backup"
chmod 0644 "$extra_backup"
mkdir -p -- "$FLEET/benign-build.test"
printf 'PUBLIC_SITE_NAME=fixture\n' >"$FLEET/benign-build.test/.env.local"
chmod 0644 "$FLEET/benign-build.test/.env.local"

group_layout_site=connectfm.ae
for site in "${lead_sites[@]}"; do
  site_dir=$FLEET/$site
  mkdir -p -- "$site_dir/.data/leads"
  printf 'LEAD_STORE_DIR=.data/leads\n' >"$site_dir/.env.prod"
  chmod 0644 "$site_dir/.env.prod"
  chmod 0755 "$site_dir/.data" "$site_dir/.data/leads"
  if [[ "$site" == connecthr.ae || "$site" == "$group_layout_site" ]]; then
    printf '{"fixture":true}\n' >"$site_dir/.data/leads/lead.json"
    chmod 0644 "$site_dir/.data/leads/lead.json"
  fi

  if ((ownership_transition_supported == 1)); then
    service_user=nobody
    service_group=nogroup
    if [[ "$site" == "$group_layout_site" ]]; then
      chown -R 0:65534 "$site_dir/.data"
      chown 0:65534 "$site_dir/.env.prod"
    else
      chown -R 65534:65534 "$site_dir/.data"
      chown 65534:65534 "$site_dir/.env.prod"
    fi
  else
    service_user=root
    service_group=root
  fi

  cat >"$UNITS/$site.service" <<UNIT
[Service]
User=$service_user
Group=$service_group
WorkingDirectory=$site_dir
EnvironmentFile=$site_dir/.env.prod
UNIT
done

# Seed a concrete named access/default ACL that must be removed by exact apply
# and faithfully restored. group:root is usable even when this sandbox cannot
# map arbitrary non-root IDs.
named_acl_dir=$FLEET/connecthr.ae/.data/leads
setfacl -m g:root:rwx -- "$named_acl_dir"
setfacl -d -m g:root:rwx -- "$named_acl_dir"
getfacl -cp "$named_acl_dir" | grep -q '^group:root:' || exit 1
getfacl -cp "$named_acl_dir" | grep -q '^default:group:root:' || exit 1

# Mirror the live H-02 writable-parent condition where the namespace permits it.
if ((ownership_transition_supported == 1)); then
  for site in "${exposed_sites[@]}"; do
    chown 65534:65534 "$FLEET/$site"
    chmod 0755 "$FLEET/$site"
    if [[ "$site" == spheavyrental.ae ]]; then
      chown 0:65534 "$FLEET/$site/.env"
    else
      chown 65534:65534 "$FLEET/$site/.env.env.bak-20260807-185316"
    fi
  done
  chown 65534:65534 "$extra_backup"
fi

h02_metadata_before=$TMP_ROOT/h02-before.tsv
h02_parents_before=$TMP_ROOT/h02-parents-before.tsv
for site in "${exposed_sites[@]}"; do
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  stat -c '%n\t%d:%i\t%u:%g:%a' "$env_path" >>"$h02_metadata_before"
  stat -c '%n\t%d:%i\t%u:%g:%a' "$FLEET/$site" >>"$h02_parents_before"
done

lead_acl_before=$TMP_ROOT/leads-before.acl
for site in "${lead_sites[@]}"; do
  getfacl -R -p -- "$FLEET/$site/.data/leads" >>"$lead_acl_before"
done

run_expect_reject() {
  local output=$1
  shift
  if bash "$TARGET" --root "$FLEET" --systemd-dir "$UNITS" >"$output" 2>&1; then
    printf 'Expected dry-run rejection but command succeeded\n' >&2
    exit 1
  fi
  grep -q 'BLOCKED:' "$output" || { printf 'Rejection lacked BLOCKED evidence\n' >&2; exit 1; }
  if grep -qE "$SECRET_MARKER|$TRAVERSAL_MARKER" "$output"; then
    printf 'Sensitive fixture value appeared in output\n' >&2
    exit 1
  fi
}

# Canonical traversal rejection.
printf 'LEAD_STORE_DIR=../../%s\n' "$TRAVERSAL_MARKER" >"$FLEET/connecthr.ae/.env.prod"
run_expect_reject "$TMP_ROOT/traversal.out"
printf 'LEAD_STORE_DIR=.data/leads\n' >"$FLEET/connecthr.ae/.env.prod"

# Existing intermediate symlink rejection.
mkdir -p -- "$TMP_ROOT/outside/leads"
ln -s "$TMP_ROOT/outside" "$FLEET/connectfz.com/.data/runtime-link"
printf 'LEAD_STORE_DIR=.data/runtime-link/leads\n' >"$FLEET/connectfz.com/.env.prod"
run_expect_reject "$TMP_ROOT/symlink.out"
rm -f -- "$FLEET/connectfz.com/.data/runtime-link"
printf 'LEAD_STORE_DIR=.data/leads\n' >"$FLEET/connectfz.com/.env.prod"

dry_output=$TMP_ROOT/dry-run.txt
bash "$TARGET" --root "$FLEET" --systemd-dir "$UNITS" >"$dry_output" 2>&1
[[ "$(grep -c '^H-02 ' "$dry_output")" -eq 9 ]] || exit 1
[[ "$(grep -c '^H-03 ' "$dry_output")" -eq 17 ]] || exit 1
grep -q 'Dry-run PASS: exact H-02 files=9 H-03 roots=17' "$dry_output" || exit 1
if grep -qE "$SECRET_MARKER|$TRAVERSAL_MARKER" "$dry_output"; then
  printf 'Sensitive fixture value appeared in dry-run output\n' >&2
  exit 1
fi
grep -Fq "$extra_backup" "$dry_output" && { printf 'Non-manifest backup was targeted\n' >&2; exit 1; }
[[ "$(stat -c '%a' "$FLEET/spheavyrental.ae/.env")" == 644 ]] || exit 1

if [[ "${ASTRO_TEST_SCOPE:-combined}" == h03-only ]]; then
run_expect_apply_target_reject() {
  local target=$1 output=$2
  if bash "$TARGET" --apply --h03-only --confirm-h03-writers-stopped \
    --confirm-developer-write-exclusion --root "$FLEET" --systemd-dir "$UNITS" \
    --backup-dir "$target" >"$output" 2>&1; then
    printf 'Unsafe backup target was accepted: %s\n' "$target" >&2
    exit 1
  fi
  [[ ! -e "$target" ]] || { printf 'Rejected backup target was created\n' >&2; exit 1; }
}

# Backup writes must never enter the fleet, traverse a symlinked parent, or use
# an attacker-writable parent.
run_expect_apply_target_reject "$FLEET/benign-build.test/rollback" "$TMP_ROOT/in-tree-backup.out"
mkdir -p -- "$TMP_ROOT/safe-backup-parent" "$TMP_ROOT/writable-backup-parent"
ln -s "$TMP_ROOT/safe-backup-parent" "$TMP_ROOT/backup-parent-link"
chmod 0777 "$TMP_ROOT/writable-backup-parent"
run_expect_apply_target_reject "$TMP_ROOT/backup-parent-link/rollback" "$TMP_ROOT/symlink-backup.out"
run_expect_apply_target_reject "$TMP_ROOT/writable-backup-parent/rollback" "$TMP_ROOT/writable-backup.out"

# H-03 can be remediated independently while H-02 remains deferred for full
# developer-session/write-FD exclusion. Prove this mode never writes H-02
# metadata and leaves all nine H-02 files/parents byte-for-byte/metadata-equal.
H03_BACKUP=$TMP_ROOT/rollback-h03-only
h03_output=$TMP_ROOT/h03-only.out

# Make every H-02 target absent. H-03-only must neither require nor read them.
for site in "${exposed_sites[@]}"; do
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  mv -- "$env_path" "$env_path.temporarily-absent"
done
bash "$TARGET" --apply --h03-only --confirm-h03-writers-stopped \
  --confirm-developer-write-exclusion --root "$FLEET" --systemd-dir "$UNITS" \
  --backup-dir "$H03_BACKUP" >"$h03_output" 2>&1
grep -q 'secret-file changes=0' "$h03_output" || exit 1
if grep -q 'H-02' "$h03_output"; then
  printf 'H-03-only output unexpectedly contains H-02 audit lines\n' >&2
  exit 1
fi
[[ ! -e "$H03_BACKUP/h02-metadata.tsv" && ! -e "$H03_BACKUP/rollback-h02.sh" ]] || {
  printf 'H-03-only apply wrote H-02 rollback material\n' >&2
  exit 1
}
h03_parents_after=$TMP_ROOT/h03-only-parents-after.tsv
for site in "${exposed_sites[@]}"; do
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  [[ ! -e "$env_path" ]] || { printf 'H-03-only recreated an absent H-02 target\n' >&2; exit 1; }
  stat -c '%n\t%d:%i\t%u:%g:%a' "$FLEET/$site" >>"$h03_parents_after"
done
cmp "$h02_parents_before" "$h03_parents_after"
[[ "$(stat -c '%a' "$FLEET/connecthr.ae/.data/leads/lead.json")" == 640 ]] || exit 1
getfacl -cp "$FLEET/connecthr.ae/.data/leads" | grep -q '^default:' || exit 1
if getfacl -cp "$named_acl_dir" | grep -q '^group:root:'; then
  printf 'Named access ACL survived exact H-03 apply\n' >&2
  exit 1
fi
if getfacl -cp "$named_acl_dir" | grep -q '^default:group:root:'; then
  printf 'Named default ACL survived exact H-03 apply\n' >&2
  exit 1
fi
bash "$H03_BACKUP/rollback-modes-and-acls.sh" --confirm-h03-writers-stopped \
  --confirm-developer-write-exclusion >/dev/null
h03_acl_after_rollback=$TMP_ROOT/h03-only-after-rollback.acl
for site in "${lead_sites[@]}"; do
  getfacl -R -p -- "$FLEET/$site/.data/leads" >>"$h03_acl_after_rollback"
done
cmp "$lead_acl_before" "$h03_acl_after_rollback"
for site in "${exposed_sites[@]}"; do
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  mv -- "$env_path.temporarily-absent" "$env_path"
done
printf 'PASS: H-03-only absent-H-02 scope, exact ACL replacement, safe backup targets, identity-bound rollback\n'
exit 0
fi

apply_output=$TMP_ROOT/apply.out
bash "$TARGET" --apply --confirm-h03-writers-stopped \
  --confirm-developer-write-exclusion --root "$FLEET" --systemd-dir "$UNITS" \
  --backup-dir "$BACKUP" >"$apply_output" 2>&1
if grep -qE "$SECRET_MARKER|$TRAVERSAL_MARKER" "$apply_output"; then
  printf 'Sensitive fixture value appeared in apply output\n' >&2
  exit 1
fi

for site in "${exposed_sites[@]}"; do
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  [[ "$(stat -c '%u:%g:%a' "$env_path")" == 0:0:600 ]] || exit 1
done
[[ "$(stat -c '%a' "$extra_backup")" == 644 ]] || exit 1
[[ "$(stat -c '%a' "$FLEET/benign-build.test/.env.local")" == 644 ]] || exit 1

h02_parents_after_apply=$TMP_ROOT/h02-parents-after-apply.tsv
for site in "${exposed_sites[@]}"; do
  stat -c '%n\t%d:%i\t%u:%g:%a' "$FLEET/$site" >>"$h02_parents_after_apply"
done
cmp "$h02_parents_before" "$h02_parents_after_apply"

for site in "${lead_sites[@]}"; do
  lead_dir=$FLEET/$site/.data/leads
  if ((ownership_transition_supported == 1)) && [[ "$site" == "$group_layout_site" ]]; then
    expected_dir=770
    expected_file=660
  else
    expected_dir=750
    expected_file=640
  fi
  [[ "$(stat -c '%a' "$lead_dir")" == "$expected_dir" ]] || exit 1
  if [[ -f "$lead_dir/lead.json" ]]; then
    [[ "$(stat -c '%a' "$lead_dir/lead.json")" == "$expected_file" ]] || exit 1
  fi
  getfacl -cp "$lead_dir" | grep -q '^default:' || exit 1

  # Prove restart-free durability with the same Node mkdir/writeFile APIs used
  # by the running services. (Coreutils mkdir deliberately adds mode flags in
  # some constrained test mounts, so it is not a faithful Node fixture.)
  if [[ "$site" == connecthr.ae || "$site" == "$group_layout_site" ]]; then
    node -e '
      const fs = require("node:fs");
      const root = process.argv[1];
      process.umask(0o022);
      fs.mkdirSync(`${root}/future-dir`);
      fs.writeFileSync(`${root}/future-file.json`, "{\"fixture\":true}\n");
    ' "$lead_dir"
    [[ "$(stat -c '%a' "$lead_dir/future-dir")" == "$expected_dir" ]] || exit 1
    [[ "$(stat -c '%a' "$lead_dir/future-file.json")" == "$expected_file" ]] || exit 1
    rm -rf -- "$lead_dir/future-dir"
    rm -f -- "$lead_dir/future-file.json"
  fi
done

rollback_output=$TMP_ROOT/rollback.out
bash "$BACKUP/rollback-modes-and-acls.sh" --confirm-h03-writers-stopped \
  --confirm-developer-write-exclusion >"$rollback_output" 2>&1
if grep -qE "$SECRET_MARKER|$TRAVERSAL_MARKER" "$rollback_output"; then
  printf 'Sensitive fixture value appeared in rollback output\n' >&2
  exit 1
fi

h02_metadata_after=$TMP_ROOT/h02-after.tsv
h02_parents_after=$TMP_ROOT/h02-parents-after.tsv
for site in "${exposed_sites[@]}"; do
  if [[ "$site" == spheavyrental.ae ]]; then
    env_path=$FLEET/$site/.env
  else
    env_path=$FLEET/$site/.env.env.bak-20260807-185316
  fi
  stat -c '%n\t%d:%i\t%u:%g:%a' "$env_path" >>"$h02_metadata_after"
  stat -c '%n\t%d:%i\t%u:%g:%a' "$FLEET/$site" >>"$h02_parents_after"
done
cmp "$h02_metadata_before" "$h02_metadata_after"
cmp "$h02_parents_before" "$h02_parents_after"

lead_acl_after=$TMP_ROOT/leads-after.acl
for site in "${lead_sites[@]}"; do
  getfacl -R -p -- "$FLEET/$site/.data/leads" >>"$lead_acl_after"
done
cmp "$lead_acl_before" "$lead_acl_after"

if ((ownership_transition_supported == 0)); then
  grep -Fq 'chown --no-dereference 0:0' "$TARGET" || exit 1
  grep -Fq 'restore_h02_parent_modes' "$TARGET" || exit 1
  printf 'SKIP: non-root UID/GID transition unavailable in this user namespace; ownership paths statically verified\n'
fi

printf 'PASS: exact 9/17 manifests, redaction, traversal/symlink defense, durable ACLs, parent restoration, and full rollback\n'
