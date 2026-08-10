#!/usr/bin/env bash
# H-07: bind Restic coverage to effective active systemd WorkingDirectories and
# atomically install only owner-reviewed, root-private sealed candidate bytes.

set -euo pipefail
IFS=$'\n\t'
umask 0077

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=verify
FLEET_ROOT=/opt/Astro-production
readonly STANDARD_INSTALLED=/usr/local/sbin/restic-astro-fleet-backup
INSTALLED=$STANDARD_INSTALLED
CANDIDATE=$SCRIPT_DIR/templates/restic-astro-fleet-backup.sh
REVIEWED_CANDIDATE_SHA256=
ALLOW_NONSTANDARD_TARGET=0
EXPECTED_ACTIVE_SITES=29
ALLOW_NONSTANDARD_SITE_COUNT=0
REPOSITORY=
PASSWORD_FILE=/etc/restic/astro-fleet.password
SYSTEMCTL=${ASTRO_SYSTEMCTL:-systemctl}
SERVICE_UNIT=restic-astro-fleet.service
TIMER_UNIT=restic-astro-fleet.timer
BACKUP_DIR=

usage() {
  cat <<'USAGE'
Usage: 06-restic-fleet-coverage.sh --reviewed-candidate-sha256 HEX [options]

Default is verification only. The reviewed SHA256 is required before any
candidate syntax check or dry-run. The source is copied into a root-private
sealed file, rehashed, and only those sealed bytes execute. Effective active
systemd WorkingDirectories under the fleet root form the authoritative site
manifest; the default expected count is exactly 29 (including the non-CMS
connectresourcesint production service).

Options:
  --apply                 Atomically install the sealed candidate and verify.
  --reviewed-candidate-sha256 HEX
                          Required in every mode; reviewed lowercase SHA256.
  --root PATH             Fleet root (default: /opt/Astro-production).
  --candidate PATH        Candidate source; never executed in place.
  --installed PATH        Nonstandard target; requires the gate below.
  --allow-nonstandard-install-target
  --expected-active-sites N
  --allow-nonstandard-site-count
                          Fixture/emergency review gates; both needed to use a
                          count other than the production invariant of 29.
  --repository PATH       Exact existing Restic repository (otherwise auto).
  --password-file PATH    Restic password file.
  --backup-dir PATH       New canonical root-private rollback directory.
  -h, --help              Show help.

Apply never starts/stops/enables a unit, reloads systemd, runs Restic, prunes a
repository, or changes credentials. The Restic service and timer must already
be loaded but inactive through a separately reviewed maintenance action.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --reviewed-candidate-sha256) (($# >= 2)) || die "--reviewed-candidate-sha256 requires a digest"; REVIEWED_CANDIDATE_SHA256=$2; shift ;;
    --root) (($# >= 2)) || die "--root requires a path"; FLEET_ROOT=$2; shift ;;
    --installed) (($# >= 2)) || die "--installed requires a path"; INSTALLED=$2; shift ;;
    --allow-nonstandard-install-target) ALLOW_NONSTANDARD_TARGET=1 ;;
    --candidate) (($# >= 2)) || die "--candidate requires a path"; CANDIDATE=$2; shift ;;
    --expected-active-sites) (($# >= 2)) || die "--expected-active-sites requires a count"; EXPECTED_ACTIVE_SITES=$2; shift ;;
    --allow-nonstandard-site-count) ALLOW_NONSTANDARD_SITE_COUNT=1 ;;
    --repository) (($# >= 2)) || die "--repository requires a path"; REPOSITORY=$2; shift ;;
    --password-file) (($# >= 2)) || die "--password-file requires a path"; PASSWORD_FILE=$2; shift ;;
    --backup-dir) (($# >= 2)) || die "--backup-dir requires a path"; BACKUP_DIR=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

require_root
require_command "$SYSTEMCTL"
require_command sha256sum
require_absolute_path "$FLEET_ROOT" "fleet root"
require_absolute_path "$INSTALLED" "installed script"
require_absolute_path "$CANDIDATE" "candidate script"
require_absolute_path "$PASSWORD_FILE" "password file"
[[ "$REVIEWED_CANDIDATE_SHA256" =~ ^[0-9a-f]{64}$ ]] || \
  die "A lowercase 64-character --reviewed-candidate-sha256 is required before candidate execution"
[[ "$EXPECTED_ACTIVE_SITES" =~ ^[1-9][0-9]*$ ]] || die "Expected active-site count must be positive"
if [[ "$EXPECTED_ACTIVE_SITES" != 29 && "$ALLOW_NONSTANDARD_SITE_COUNT" != 1 ]]; then
  die "A production count other than 29 requires --allow-nonstandard-site-count"
fi
if [[ "$INSTALLED" != "$STANDARD_INSTALLED" && "$ALLOW_NONSTANDARD_TARGET" != 1 ]]; then
  die "Nonstandard --installed requires --allow-nonstandard-install-target"
fi
[[ -d "$FLEET_ROOT" && ! -L "$FLEET_ROOT" ]] || die "Fleet root missing or symlinked: $FLEET_ROOT"
FLEET_ROOT=$(realpath -e -- "$FLEET_ROOT")
[[ -f "$CANDIDATE" && ! -L "$CANDIDATE" ]] || die "Candidate source must be a regular non-symlink file"
[[ "$(realpath -e -- "$CANDIDATE")" == "$CANDIDATE" ]] || die "Candidate path must be canonical"
[[ "$(stat -Lc '%h' -- "$CANDIDATE")" == 1 ]] || die "Candidate source must have exactly one hard link"

SEALED_DIR=$(mktemp -d /tmp/astro-restic-sealed.XXXXXX)
EXPECTED_OUTPUT=$SEALED_DIR/candidate-output.tsv
ACTUAL_OUTPUT=$SEALED_DIR/installed-output.tsv
ACTIVE_MANIFEST=$SEALED_DIR/active-sites.tsv
ACTIVE_RECHECK=$SEALED_DIR/active-sites-recheck.tsv
SEALED_CANDIDATE=$SEALED_DIR/reviewed-candidate
SEALED_INSTALLED=$SEALED_DIR/installed-copy
INSTALL_TMP=
cleanup() {
  [[ -z "$INSTALL_TMP" ]] || rm -f -- "$INSTALL_TMP"
  case "$SEALED_DIR" in /tmp/astro-restic-sealed.*) rm -rf -- "$SEALED_DIR" ;; esac
}
trap cleanup EXIT HUP INT TERM
chown 0:0 -- "$SEALED_DIR"
chmod 0700 -- "$SEALED_DIR"
: >"$EXPECTED_OUTPUT"
: >"$ACTUAL_OUTPUT"
: >"$ACTIVE_MANIFEST"
: >"$ACTIVE_RECHECK"
chown 0:0 -- "$EXPECTED_OUTPUT" "$ACTUAL_OUTPUT" "$ACTIVE_MANIFEST" "$ACTIVE_RECHECK"
chmod 0600 -- "$EXPECTED_OUTPUT" "$ACTUAL_OUTPUT" "$ACTIVE_MANIFEST" "$ACTIVE_RECHECK"

source_identity=$(stat -Lc '%d:%i:%s' -- "$CANDIDATE")
install -o 0 -g 0 -m 0500 -- "$CANDIDATE" "$SEALED_CANDIDATE"
[[ "$(stat -Lc '%d:%i:%s' -- "$CANDIDATE")" == "$source_identity" ]] || die "Candidate source changed while it was sealed"
[[ "$(sha256sum "$CANDIDATE" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || die "Candidate source differs from reviewed SHA256"
[[ "$(sha256sum "$SEALED_CANDIDATE" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || die "Sealed candidate differs from reviewed SHA256"
sealed_candidate_identity=$(stat -Lc '%d:%i' -- "$SEALED_CANDIDATE")

assert_sealed() {
  local path=$1 identity=$2
  [[ -f "$path" && ! -L "$path" ]] || die "Sealed executable disappeared"
  [[ "$(stat -Lc '%u:%g:%a:%h:%d:%i' -- "$path")" == "0:0:500:1:$identity" ]] || die "Sealed executable identity/metadata changed"
  [[ "$(sha256sum "$path" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || die "Sealed executable content changed"
}

assert_sealed "$SEALED_CANDIDATE" "$sealed_candidate_identity"
bash -n "$SEALED_CANDIDATE"
printf 'Reviewed sealed candidate SHA256: %s\n' "$REVIEWED_CANDIDATE_SHA256"

validate_repository_credentials() {
  local repo=$REPOSITORY
  local -a detected=()
  if [[ -z "$repo" ]]; then
    [[ -f /var/backups/astro-fleet/config ]] && detected+=(/var/backups/astro-fleet)
    [[ -f /var/backups/astro-fleet/restic/config ]] && detected+=(/var/backups/astro-fleet/restic)
    ((${#detected[@]} == 1)) || die "Expected exactly one Restic repository config; found ${#detected[@]}"
    repo=${detected[0]}
  fi
  require_absolute_path "$repo" "Restic repository"
  [[ -d "$repo" && ! -L "$repo" && "$(realpath -e -- "$repo")" == "$repo" ]] || die "Restic repository must be a canonical real directory"
  [[ "$(stat -Lc '%u:%g:%a' -- "$repo")" == 0:0:700 ]] || die "Restic repository must be root:root mode 0700"
  [[ -f "$repo/config" && ! -L "$repo/config" ]] || die "Restic repository config must be a regular non-symlink file"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$repo/config")" == 0:0:600:1 ]] || die "Restic repository config must be root:root mode 0600 with one link"
  [[ -f "$PASSWORD_FILE" && ! -L "$PASSWORD_FILE" && "$(realpath -e -- "$PASSWORD_FILE")" == "$PASSWORD_FILE" ]] || die "Restic password path must be canonical and regular"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$PASSWORD_FILE")" == 0:0:600:1 ]] || die "Restic password must be root:root mode 0600 with one link"
  REPOSITORY=$repo
  info "Repository/password metadata verified; no credential value was read"
}

collect_active_manifest() {
  local destination=$1 units=$SEALED_DIR/systemd-units.out errors=$SEALED_DIR/systemd.err
  local unit rest wd name canonical count rc
  : >"$units"; : >"$errors"; : >"$destination"
  if ! "$SYSTEMCTL" list-units --type=service --state=active --no-legend --no-pager --plain >"$units" 2>"$errors" || [[ -s "$errors" ]]; then
    sed -n '1,20p' "$errors" >&2
    die "Cannot obtain a complete active systemd service inventory"
  fi
  while IFS=' ' read -r unit rest; do
    [[ "$unit" == *.service ]] || continue
    : >"$errors"
    if ! wd=$("$SYSTEMCTL" show "$unit" --property=WorkingDirectory --value 2>"$errors") || [[ -s "$errors" ]]; then
      die "Cannot read effective WorkingDirectory for $unit"
    fi
    [[ "$wd" == "$FLEET_ROOT/"* ]] || continue
    canonical=$(realpath -m -- "$wd")
    [[ "$canonical" == "$wd" && -d "$wd" && ! -L "$wd" && "$(realpath -e -- "$wd")" == "$wd" ]] || die "Unsafe active fleet WorkingDirectory for $unit"
    name=${wd#"$FLEET_ROOT"/}
    [[ -n "$name" && "$name" != */* && "$name" =~ ^[A-Za-z0-9._-]+$ ]] || die "Active WorkingDirectory is not an immediate fleet child: $unit"
    if "$SYSTEMCTL" is-active --quiet "$unit"; then :; else
      rc=$?; die "Active inventory changed or is not visible for $unit (rc=$rc)"
    fi
    printf 'SITE\t%s\t%s\t%s\n' "$unit" "$name" "$wd" >>"$destination"
  done <"$units"
  LC_ALL=C sort -o "$destination" "$destination"
  count=$(wc -l <"$destination")
  [[ "$count" == "$EXPECTED_ACTIVE_SITES" ]] || die "Expected exactly $EXPECTED_ACTIVE_SITES active fleet WorkingDirectories; found $count"
  [[ -z "$(cut -f2 "$destination" | sort | uniq -d)" ]] || die "Duplicate active unit in systemd inventory"
  [[ -z "$(cut -f3 "$destination" | sort | uniq -d)" ]] || die "Multiple active units map to one site name"
  [[ -z "$(cut -f4 "$destination" | sort | uniq -d)" ]] || die "Multiple active units map to one WorkingDirectory"
  chown 0:0 -- "$destination"
  chmod 0600 -- "$destination"
}

run_sealed_dry_run() {
  local executable=$1 destination=$2
  if [[ "$EXPECTED_ACTIVE_SITES" != 29 && "$ALLOW_NONSTANDARD_SITE_COUNT" == 1 ]]; then
    env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin HOME=/root LC_ALL=C \
      RESTIC_REPOSITORY="$REPOSITORY" RESTIC_PASSWORD_FILE="$PASSWORD_FILE" \
      SITE_ROOT="$FLEET_ROOT" ACTIVE_SITE_MANIFEST="$ACTIVE_MANIFEST" \
      EXPECTED_ACTIVE_SITES="$EXPECTED_ACTIVE_SITES" \
      ALLOW_NONSTANDARD_SITE_MAP=1 EXPECTED_SITE_MAP="$ACTIVE_MANIFEST" \
      bash "$executable" --dry-run >"$destination"
  else
    env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin HOME=/root LC_ALL=C \
      RESTIC_REPOSITORY="$REPOSITORY" RESTIC_PASSWORD_FILE="$PASSWORD_FILE" \
      SITE_ROOT="$FLEET_ROOT" ACTIVE_SITE_MANIFEST="$ACTIVE_MANIFEST" \
      EXPECTED_ACTIVE_SITES="$EXPECTED_ACTIVE_SITES" \
      bash "$executable" --dry-run >"$destination"
  fi
}

validate_exact_coverage_output() {
  local output=$1 count expected_rows=$SEALED_DIR/expected-sites.rows actual_rows=$SEALED_DIR/actual-sites.rows
  count=$(awk -F '\t' '$1 == "SITES" {print $2}' "$output")
  [[ "$count" == "$EXPECTED_ACTIVE_SITES" && "$(grep -c $'^SITES\t' "$output")" == 1 ]] || die "Coverage output has an invalid site count"
  awk -F '\t' '$1 == "SITE" {print $1 "\t" $3 "\t" $4}' "$ACTIVE_MANIFEST" | LC_ALL=C sort >"$expected_rows"
  grep $'^SITE\t' "$output" | LC_ALL=C sort >"$actual_rows" || true
  cmp -s -- "$expected_rows" "$actual_rows" || die "Coverage SITE rows do not exactly match effective active WorkingDirectories"
  [[ "$(grep -c $'^PATH\t' "$output" || true)" -gt 0 ]] || die "Coverage output contains no backup paths"
  [[ "$(tail -n1 "$output")" == $'RESULT\tdry-run-ok' ]] || die "Coverage dry-run did not finish cleanly"
}

validate_repository_credentials
collect_active_manifest "$ACTIVE_MANIFEST"
assert_sealed "$SEALED_CANDIDATE" "$sealed_candidate_identity"
run_sealed_dry_run "$SEALED_CANDIDATE" "$EXPECTED_OUTPUT"
validate_exact_coverage_output "$EXPECTED_OUTPUT"
info "Reviewed sealed discovery exactly covers $EXPECTED_ACTIVE_SITES effective active WorkingDirectories"

compare_installed() {
  local installed_identity sealed_identity current_hash
  : >"$ACTUAL_OUTPUT"
  if [[ ! -f "$INSTALLED" || -L "$INSTALLED" || ! -x "$INSTALLED" ]]; then
    blocked "Installed backup script missing, symlinked, non-regular, or not executable: $INSTALLED"
    return 2
  fi
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$INSTALLED")" == 0:0:755:1 ]] || { blocked "Installed script must be root:root mode 0755 with one link"; return 2; }
  installed_identity=$(stat -Lc '%d:%i:%s' -- "$INSTALLED")
  current_hash=$(sha256sum "$INSTALLED" | awk '{print $1}')
  [[ "$current_hash" == "$REVIEWED_CANDIDATE_SHA256" ]] || { blocked "Installed script checksum differs from reviewed candidate; refusing execution"; return 2; }
  rm -f -- "$SEALED_INSTALLED"
  install -o 0 -g 0 -m 0500 -- "$INSTALLED" "$SEALED_INSTALLED"
  [[ "$(stat -Lc '%d:%i:%s' -- "$INSTALLED")" == "$installed_identity" ]] || { blocked "Installed source changed while sealing"; return 2; }
  [[ "$(sha256sum "$INSTALLED" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || { blocked "Installed source changed while sealing"; return 2; }
  [[ "$(sha256sum "$SEALED_INSTALLED" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || { blocked "Sealed installed copy hash mismatch"; return 2; }
  sealed_identity=$(stat -Lc '%d:%i' -- "$SEALED_INSTALLED")
  assert_sealed "$SEALED_INSTALLED" "$sealed_identity"
  bash -n "$SEALED_INSTALLED"
  if ! run_sealed_dry_run "$SEALED_INSTALLED" "$ACTUAL_OUTPUT" 2>"$SEALED_DIR/installed.err"; then
    blocked "Sealed installed script dry-run failed"
    sed -n '1,30p' "$SEALED_DIR/installed.err" >&2
    return 2
  fi
  validate_exact_coverage_output "$ACTUAL_OUTPUT"
  cmp -s -- "$EXPECTED_OUTPUT" "$ACTUAL_OUTPUT" || { blocked "Installed coverage output differs from reviewed sealed candidate"; return 2; }
  info "Installed sealed bytes exactly match reviewed fleet coverage"
}

if [[ "$MODE" == verify ]]; then
  if (compare_installed); then status=0; else status=$?; fi
  info "Verification only; no Restic snapshot/check/prune was run."
  exit "$status"
fi

installed_parent=$(dirname -- "$INSTALLED")
[[ -d "$installed_parent" && ! -L "$installed_parent" && "$(realpath -e -- "$installed_parent")" == "$installed_parent" ]] || die "Install parent must be a canonical real directory"
[[ "$(stat -Lc '%u:%g' -- "$installed_parent")" == 0:0 ]] || die "Install parent must be root:root"
mode_has_group_or_other_write_common "$(file_mode "$installed_parent")" && die "Install parent must not be group/other-writable"

unit_must_be_loaded_inactive() {
  local unit=$1 load rc
  load=$("$SYSTEMCTL" show "$unit" --property=LoadState --value 2>/dev/null) || die "Cannot inspect $unit LoadState"
  [[ "$load" == loaded ]] || die "$unit must be loaded before coordinated replacement (found $load)"
  if "$SYSTEMCTL" is-active --quiet "$unit"; then
    die "$unit is active; stop it separately before applying"
  else
    rc=$?
    [[ "$rc" == 3 ]] || die "Cannot prove $unit is inactive (systemctl rc=$rc)"
  fi
}

if [[ -f "$INSTALLED" && ! -L "$INSTALLED" ]] && [[ "$(sha256sum "$INSTALLED" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]]; then
  info "Reviewed candidate is already installed; idempotent no-op. Timer/service state was not changed."
  if (compare_installed); then exit 0; else exit $?; fi
fi

unit_must_be_loaded_inactive "$TIMER_UNIT"
unit_must_be_loaded_inactive "$SERVICE_UNIT"
collect_active_manifest "$ACTIVE_RECHECK"
cmp -s -- "$ACTIVE_MANIFEST" "$ACTIVE_RECHECK" || die "Active fleet inventory changed before install"

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR=$(default_backup_dir "restic-script")
fi
assert_new_directory_target "$BACKUP_DIR"
print_apply_banner "This atomically replaces only $INSTALLED from sealed reviewed bytes. Timer/service remain inactive and no backup runs."
BACKUP_DIR=$(prepare_marked_private_dir "$BACKUP_DIR" .astro-restic-script-backup)

had_installed=0
old_identity=
old_hash=
if [[ -e "$INSTALLED" || -L "$INSTALLED" ]]; then
  [[ -f "$INSTALLED" && ! -L "$INSTALLED" ]] || die "Installed target is not a regular non-symlink file"
  [[ "$(stat -Lc '%u:%g:%a:%h' -- "$INSTALLED")" == 0:0:755:1 ]] || die "Prior installed target must be root:root mode 0755 with one link"
  old_identity=$(stat -Lc '%d:%i' -- "$INSTALLED")
  old_hash=$(sha256sum "$INSTALLED" | awk '{print $1}')
  install -o 0 -g 0 -m 0600 -- "$INSTALLED" "$BACKUP_DIR/restic-astro-fleet-backup.before"
  [[ "$(sha256sum "$BACKUP_DIR/restic-astro-fleet-backup.before" | awk '{print $1}')" == "$old_hash" ]] || die "Prior-script backup hash mismatch"
  had_installed=1
fi
printf '%s\n' "$REVIEWED_CANDIDATE_SHA256" >"$BACKUP_DIR/candidate.sha256"
chown 0:0 -- "$BACKUP_DIR/candidate.sha256"
chmod 0600 -- "$BACKUP_DIR/candidate.sha256"

rollback=$BACKUP_DIR/rollback-restic-script.sh
cat >"$rollback" <<ROLLBACK_HEAD
#!/usr/bin/env bash
set -euo pipefail
[[ "\$(id -u)" -eq 0 ]] || { echo "Run as root" >&2; exit 1; }
SYSTEMCTL=$(printf '%q' "$SYSTEMCTL")
SERVICE_UNIT=$(printf '%q' "$SERVICE_UNIT")
TIMER_UNIT=$(printf '%q' "$TIMER_UNIT")
TARGET=$(printf '%q' "$INSTALLED")
EXPECTED_CURRENT=$(printf '%q' "$REVIEWED_CANDIDATE_SHA256")
PARENT=\$(dirname -- "\$TARGET")
[[ -d "\$PARENT" && ! -L "\$PARENT" && "\$(realpath -e -- "\$PARENT")" == "\$PARENT" ]] || { echo "Unsafe target parent" >&2; exit 1; }
[[ "\$(stat -Lc '%u:%g' -- "\$PARENT")" == 0:0 ]] || { echo "Target parent ownership changed" >&2; exit 1; }
parent_mode=\$(stat -Lc '%a' -- "\$PARENT")
(( (8#\$parent_mode & 0022) == 0 )) || { echo "Target parent became writable" >&2; exit 1; }
for unit in "\$TIMER_UNIT" "\$SERVICE_UNIT"; do
  if "\$SYSTEMCTL" is-active --quiet "\$unit"; then echo "Refusing rollback while \$unit is active" >&2; exit 1
  else rc=\$?; [[ "\$rc" == 3 ]] || { echo "Cannot prove \$unit inactive" >&2; exit 1; }; fi
done
[[ -f "\$TARGET" && ! -L "\$TARGET" ]] || { echo "Installed target is unsafe/absent" >&2; exit 1; }
[[ "\$(stat -Lc '%u:%g:%a:%h' -- "\$TARGET")" == 0:0:755:1 ]] || { echo "Installed metadata changed" >&2; exit 1; }
[[ "\$(sha256sum "\$TARGET" | awk '{print \$1}')" == "\$EXPECTED_CURRENT" ]] || { echo "Installed target changed" >&2; exit 1; }
ROLLBACK_HEAD
if ((had_installed == 1)); then
  cat >>"$rollback" <<ROLLBACK_PRIOR
PRIOR=$(printf '%q' "$BACKUP_DIR/restic-astro-fleet-backup.before")
PRIOR_SHA=$(printf '%q' "$old_hash")
[[ -f "\$PRIOR" && ! -L "\$PRIOR" && "\$(stat -Lc '%u:%g:%a:%h' -- "\$PRIOR")" == 0:0:600:1 ]] || { echo "Unsafe prior backup" >&2; exit 1; }
[[ "\$(sha256sum "\$PRIOR" | awk '{print \$1}')" == "\$PRIOR_SHA" ]] || { echo "Prior backup changed" >&2; exit 1; }
tmp=\$(mktemp "\$(dirname -- "\$TARGET")/.restic-rollback.XXXXXX")
trap 'rm -f -- "\$tmp"' EXIT
install -o 0 -g 0 -m 0755 -- "\$PRIOR" "\$tmp"
mv -T -- "\$tmp" "\$TARGET"
trap - EXIT
[[ "\$(sha256sum "\$TARGET" | awk '{print \$1}')" == "\$PRIOR_SHA" ]] || { echo "Restored target hash mismatch" >&2; exit 1; }
ROLLBACK_PRIOR
else
  cat >>"$rollback" <<'ROLLBACK_NEW'
unlink -- "$TARGET"
[[ ! -e "$TARGET" && ! -L "$TARGET" ]] || { echo "New target removal failed" >&2; exit 1; }
ROLLBACK_NEW
fi
chmod 0700 -- "$rollback"

if ((had_installed == 1)); then
  [[ -f "$INSTALLED" && ! -L "$INSTALLED" && "$(stat -Lc '%d:%i' -- "$INSTALLED")" == "$old_identity" ]] || die "Installed target changed after backup"
  [[ "$(sha256sum "$INSTALLED" | awk '{print $1}')" == "$old_hash" ]] || die "Installed target content changed after backup"
fi
assert_sealed "$SEALED_CANDIDATE" "$sealed_candidate_identity"

INSTALL_TMP=$(mktemp "$installed_parent/.restic-astro-fleet-backup.XXXXXX")
install -o 0 -g 0 -m 0755 -- "$SEALED_CANDIDATE" "$INSTALL_TMP"
[[ "$(sha256sum "$INSTALL_TMP" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || die "Same-directory staged candidate hash mismatch"
mv -T -- "$INSTALL_TMP" "$INSTALLED"
INSTALL_TMP=

if ! (compare_installed); then
  blocked "Post-install verification failed; automatically restoring/removing the just-installed target"
  if ((had_installed == 1)); then
    [[ "$(sha256sum "$BACKUP_DIR/restic-astro-fleet-backup.before" | awk '{print $1}')" == "$old_hash" ]] || die "Cannot restore changed prior backup"
    INSTALL_TMP=$(mktemp "$installed_parent/.restic-restore.XXXXXX")
    install -o 0 -g 0 -m 0755 -- "$BACKUP_DIR/restic-astro-fleet-backup.before" "$INSTALL_TMP"
    mv -T -- "$INSTALL_TMP" "$INSTALLED"
    INSTALL_TMP=
    [[ "$(sha256sum "$INSTALLED" | awk '{print $1}')" == "$old_hash" ]] || die "Automatic restore hash mismatch"
  else
    [[ -f "$INSTALLED" && ! -L "$INSTALLED" && "$(sha256sum "$INSTALLED" | awk '{print $1}')" == "$REVIEWED_CANDIDATE_SHA256" ]] || die "New installed target changed; refusing automatic removal"
    unlink -- "$INSTALLED"
  fi
  exit 2
fi

info "Reviewed sealed script installed atomically. Rollback: $rollback"
warn "Timer/service remain inactive and no backup ran. Start only in a separate reviewed phase, then perform an off-host restore drill."
