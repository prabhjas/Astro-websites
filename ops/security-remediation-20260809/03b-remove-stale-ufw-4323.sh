#!/usr/bin/env bash
# M-07: narrowly remove the stale UFW 4323/tcp allow rule after explicit review.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=dry-run
CONFIRM_RECOVERY=0
CONFIRM_UNUSED=0
BACKUP_DIR=

usage() {
  cat <<'USAGE'
Usage: 03b-remove-stale-ufw-4323.sh [options]

Default: read-only listener and UFW audit.

LIVE apply requires all of:
  --apply
  --confirm-owner-recovery-session
  --confirm-no-service-needs-4323

Optional:
  --backup-dir PATH       New backup directory.
  -h, --help              Show help.

Apply changes the live firewall immediately by deleting only `allow 4323/tcp`.
It does not change default policy, SSH, 80/443, reload services, or kill a process.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --confirm-owner-recovery-session) CONFIRM_RECOVERY=1 ;;
    --confirm-no-service-needs-4323) CONFIRM_UNUSED=1 ;;
    --backup-dir)
      (($# >= 2)) || die "--backup-dir requires a path"
      BACKUP_DIR=$2
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

require_command ufw
require_command ss

info "TCP 4323 listeners:"
ss_error=$(mktemp /tmp/astro-ufw-ss.XXXXXX)
if ! listeners=$(ss -H -ltn 'sport = :4323' 2>"$ss_error") || [[ -s "$ss_error" ]]; then
  blocked "TCP 4323 listener state is not visible; refusing audit/apply"
  sed -n '1,20p' "$ss_error" >&2
  rm -f -- "$ss_error"
  exit 2
fi
rm -f -- "$ss_error"
if [[ -n "$listeners" ]]; then
  printf '%s\n' "$listeners"
else
  printf '  none visible\n'
fi

info "UFW rules mentioning 4323:"
if ! ufw_output=$(ufw status numbered 2>&1); then
  blocked "UFW numbered status is not visible; refusing audit/apply"
  printf '%s\n' "$ufw_output" | sed -n '1,20p' >&2
  exit 2
fi
printf '%s\n' "$ufw_output" | grep -E '(^|[^0-9])4323(/tcp|[^0-9]|$)' || printf '  none\n'

if [[ "$MODE" == dry-run ]]; then
  info "Dry-run only. Live removal requires --apply and both confirmation flags."
  exit 0
fi

require_root
((CONFIRM_RECOVERY == 1)) || die "Missing --confirm-owner-recovery-session"
((CONFIRM_UNUSED == 1)) || die "Missing --confirm-no-service-needs-4323"
[[ -z "$listeners" ]] || die "TCP 4323 has a listener; refusing firewall mutation"
printf '%s\n' "$ufw_output" | grep -qi '^Status: active' || die "UFW is not confirmed active"
ss_error=$(mktemp /tmp/astro-ufw-ss-full.XXXXXX)
if ! all_listeners=$(ss -H -lntup 2>"$ss_error") || [[ -s "$ss_error" ]]; then
  sed -n '1,20p' "$ss_error" >&2
  rm -f -- "$ss_error"
  die "Full listener/process visibility is required before firewall mutation"
fi
rm -f -- "$ss_error"

if ! printf '%s\n' "$ufw_output" | grep -Eq '4323/tcp[[:space:]]+ALLOW'; then
  info "No active broad 4323/tcp ALLOW rule exists; idempotent no-op."
  exit 0
fi

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR=$(default_backup_dir "ufw-4323")
fi
assert_new_directory_target "$BACKUP_DIR"
print_apply_banner "UFW WILL CHANGE LIVE NOW. Only the `allow 4323/tcp` rule will be deleted. Keep the recovery SSH session open."

make_private_dir "$BACKUP_DIR"
cp -a -- /etc/ufw "$BACKUP_DIR/etc-ufw"
printf '%s\n' "$ufw_output" >"$BACKUP_DIR/ufw-status-before.txt"
printf '%s\n' "$all_listeners" >"$BACKUP_DIR/listeners-before.txt"
chmod -R go-rwx "$BACKUP_DIR"

cat >"$BACKUP_DIR/ROLLBACK.txt" <<'ROLLBACK'
If TCP 4323 was unexpectedly required, from the untouched owner recovery session:

    sudo ufw allow 4323/tcp
    sudo ufw status numbered

That restores the former broad exposure and is only an emergency rollback. Do
not copy the backed-up UFW directory over /etc while remote; rule files and live
state can diverge. Replace the preview workflow with an authenticated/private one.
ROLLBACK
chmod 0600 "$BACKUP_DIR/ROLLBACK.txt"

ss_error=$(mktemp /tmp/astro-ufw-ss-final.XXXXXX)
if ! listeners_before_delete=$(ss -H -ltn 'sport = :4323' 2>"$ss_error") || [[ -s "$ss_error" ]]; then
  blocked "TCP 4323 listener state changed or became unreadable after evidence capture; refusing firewall mutation"
  sed -n '1,20p' "$ss_error" >&2
  rm -f -- "$ss_error"
  exit 2
fi
rm -f -- "$ss_error"
if [[ -n "$listeners_before_delete" ]]; then
  blocked "TCP 4323 gained a listener after evidence capture; refusing firewall mutation"
  printf '%s\n' "$listeners_before_delete" >&2
  exit 2
fi
ufw --force delete allow 4323/tcp

if ! after=$(ufw status numbered 2>&1); then
  blocked "UFW changed but post-change status is not visible; use the recovery session and inspect immediately"
  exit 2
fi
printf '%s\n' "$after" >"$BACKUP_DIR/ufw-status-after.txt"
chmod 0600 "$BACKUP_DIR/ufw-status-after.txt"
if printf '%s\n' "$after" | grep -Eq '4323/tcp[[:space:]]+ALLOW'; then
  blocked "A 4323/tcp ALLOW rule remains. Review manually; no broader deletion was attempted."
  exit 2
fi

info "Removed the stale 4323/tcp allow rule. Backup and rollback notes: $BACKUP_DIR"
