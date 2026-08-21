#!/usr/bin/env bash
# M-06: evidence-only developer access audit and private owner response plan.
# This helper deliberately cannot modify keys, accounts, groups, sudo or sessions.

set -euo pipefail
IFS=$'\n\t'
umask 0077

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=audit
OUTPUT_DIR=
TARGET_USER=webdev
SSH_CONTEXTS=($'127.0.0.1\tlocalhost\t127.0.0.1\t22')

usage() {
  cat <<'USAGE'
Usage: 09-developer-access.sh [options]

Default: read-only audit of effective SSH policy (including key commands, CA,
principals and token-expanded key paths), account/groups, effective sudo, the
site-ctl trust boundary, and current session/process evidence. Public-key
fingerprints are shown; key contents, private keys and secret values are not.

Options:
  --connection-context ADDR HOST LADDR LPORT
                         Evaluate one complete sshd Match context. Repeat for
                         every observed remote/local address, host and port.
  --source-address ADDR  Compatibility shorthand using localhost/127.0.0.1/22;
                         prefer the complete context option above.
  --apply                Generate a private owner-reviewed response plan only.
                         This DOES NOT revoke or change any live access.
  --output-dir PATH      New canonical root-private plan directory.
  --backup-dir PATH      Deprecated alias for --output-dir.
  -h, --help             Show help.

No mode edits authorized_keys, principals, sshd, Unix accounts, groups, sudoers,
site-ctl, processes, sessions, firewall, services, or credentials. Account-level
revocation spans too many provider and host channels to automate safely here.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=plan ;;
    --connection-context)
      (($# >= 5)) || die "--connection-context requires ADDR HOST LADDR LPORT"
      SSH_CONTEXTS+=("$2"$'\t'"$3"$'\t'"$4"$'\t'"$5")
      shift 4
      ;;
    --source-address)
      (($# >= 2)) || die "--source-address requires an address"
      SSH_CONTEXTS+=("$2"$'\tlocalhost\t127.0.0.1\t22')
      shift
      ;;
    --output-dir|--backup-dir) (($# >= 2)) || die "$1 requires a path"; OUTPUT_DIR=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

require_root
require_command sshd
require_command ssh-keygen
require_command getent
require_command id
require_command sha256sum
require_command sudo
require_command visudo
sshd -t
getent passwd "$TARGET_USER" >/dev/null || die "User not found: $TARGET_USER"
passwd_row=$(getent passwd "$TARGET_USER")
target_uid=$(cut -d: -f3 <<<"$passwd_row")
home_dir=$(cut -d: -f6 <<<"$passwd_row")
login_shell=$(cut -d: -f7 <<<"$passwd_row")

# Validate and deduplicate requested Match Address contexts before invoking sshd.
declare -A seen_contexts=()
contexts=()
for context in "${SSH_CONTEXTS[@]}"; do
  IFS=$'\t' read -r address context_host local_address local_port extra <<<"$context"
  [[ -z "${extra:-}" ]] || die "Malformed SSH connection context"
  [[ "$address" =~ ^[0-9A-Fa-f:.]+$ ]] || die "Invalid source address syntax: $address"
  [[ "$local_address" =~ ^[0-9A-Fa-f:.]+$ ]] || die "Invalid local address syntax: $local_address"
  [[ "$context_host" =~ ^[A-Za-z0-9._-]+$ ]] || die "Invalid connection host syntax: $context_host"
  [[ "$local_port" =~ ^[0-9]+$ ]] && ((local_port >= 1 && local_port <= 65535)) || die "Invalid local port: $local_port"
  normalized="$address"$'\t'"$context_host"$'\t'"$local_address"$'\t'"$local_port"
  [[ -z "${seen_contexts[$normalized]+x}" ]] || continue
  seen_contexts[$normalized]=1
  contexts+=("$normalized")
done

AUDIT_TMP=$(mktemp -d /tmp/astro-webdev-audit.XXXXXX)
cleanup() {
  case "$AUDIT_TMP" in /tmp/astro-webdev-audit.*) rm -rf -- "$AUDIT_TMP" ;; esac
}
trap cleanup EXIT HUP INT TERM
chown 0:0 -- "$AUDIT_TMP"
chmod 0700 -- "$AUDIT_TMP"
EVIDENCE_TMP=$AUDIT_TMP/EVIDENCE.txt
: >"$EVIDENCE_TMP"
chmod 0600 -- "$EVIDENCE_TMP"

expand_ssh_path() {
  local spec=$1 expanded sentinel=__ASTRO_LITERAL_PERCENT__
  expanded=${spec//%%/$sentinel}
  expanded=${expanded//%h/$home_dir}
  expanded=${expanded//%u/$TARGET_USER}
  expanded=${expanded//%U/$target_uid}
  expanded=${expanded//$sentinel/%}
  [[ "$expanded" != *%* ]] || return 1
  [[ "$expanded" == /* ]] || expanded=$home_dir/$expanded
  realpath -m -- "$expanded"
}

print_fingerprints() {
  local path=$1
  if [[ -r "$path" && -f "$path" && ! -L "$path" ]]; then
    # Suppress comments (which may contain personal email addresses); print only
    # size, cryptographic fingerprint and key type from public material.
    ssh-keygen -lf "$path" 2>/dev/null | awk '{print "      bits=" $1 " fingerprint=" $2 " type=" $NF}' || \
      printf '      no parseable public keys\n'
  else
    printf '      absent, unreadable, non-regular, or symlinked\n'
  fi
}

print_path_metadata() {
  local label=$1 path=$2
  printf '    %s path=%s\n' "$label" "$path"
  if [[ -e "$path" || -L "$path" ]]; then
    printf '      metadata=%s sha256=' "$(stat -Lc '%u:%g:%a:%h:%F' -- "$path" 2>/dev/null || printf unavailable)"
    if [[ -f "$path" && ! -L "$path" && -r "$path" ]]; then
      sha256sum "$path" | awk '{print $1}'
    else
      printf 'not-read\n'
    fi
  else
    printf '      absent\n'
  fi
}

collect_evidence() {
  local index=0 context address context_host local_address local_port effective auth_specs principal_spec ca_spec spec path
  local key_cmd key_cmd_user principal_cmd principal_cmd_user
  local sudo_result stat_tail
  local -A key_paths=() principal_paths=() ca_paths=()
  printf 'M-06 WEBDEV ACCESS EVIDENCE (READ-ONLY)\n'
  printf 'collected_utc=%s\nuser=%s uid=%s home=%s shell=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TARGET_USER" "$target_uid" "$home_dir" "$login_shell"
  printf 'NOTICE: no key contents, private keys, cmdlines, environment values, or secret values are collected.\n\n'

  printf 'Effective sshd Match contexts:\n'
  for context in "${contexts[@]}"; do
    IFS=$'\t' read -r address context_host local_address local_port <<<"$context"
    index=$((index + 1))
    effective=$AUDIT_TMP/effective-$index.txt
    if ! sshd -T -C "user=$TARGET_USER,host=$context_host,addr=$address,laddr=$local_address,lport=$local_port" >"$effective" 2>"$AUDIT_TMP/sshd-$index.err"; then
      printf '  addr=%s host=%s laddr=%s lport=%s ERROR: sshd effective-policy evaluation failed\n' \
        "$address" "$context_host" "$local_address" "$local_port"
      sed -n '1,10p' "$AUDIT_TMP/sshd-$index.err"
      return 1
    fi
    printf '  addr=%s host=%s laddr=%s lport=%s\n' "$address" "$context_host" "$local_address" "$local_port"
    grep -E '^(authorizedkeysfile|authorizedkeyscommanduser|trustedusercakeys|authorizedprincipalsfile|authorizedprincipalscommanduser|pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|authenticationmethods|permitrootlogin|allowtcpforwarding|allowagentforwarding|x11forwarding|permitopen|permitlisten|gatewayports|disableforwarding|allowusers|denyusers|allowgroups|denygroups) ' "$effective" | sed 's/^/    /' || true

    auth_specs=$(sed -n 's/^authorizedkeysfile //p' "$effective")
    while IFS= read -r spec; do
      [[ -n "$spec" && "$spec" != none ]] || continue
      if path=$(expand_ssh_path "$spec"); then key_paths[$path]=1
      else printf '    unresolved AuthorizedKeysFile token path=%s\n' "$spec"; fi
    done < <(tr ' ' '\n' <<<"$auth_specs")

    principal_spec=$(sed -n 's/^authorizedprincipalsfile //p' "$effective")
    if [[ -n "$principal_spec" && "$principal_spec" != none ]]; then
      if path=$(expand_ssh_path "$principal_spec"); then principal_paths[$path]=1
      else printf '    unresolved AuthorizedPrincipalsFile token path=%s\n' "$principal_spec"; fi
    fi
    ca_spec=$(sed -n 's/^trustedusercakeys //p' "$effective")
    [[ -z "$ca_spec" || "$ca_spec" == none ]] || ca_paths[$ca_spec]=1

    key_cmd=$(sed -n 's/^authorizedkeyscommand //p' "$effective")
    key_cmd_user=$(sed -n 's/^authorizedkeyscommanduser //p' "$effective")
    principal_cmd=$(sed -n 's/^authorizedprincipalscommand //p' "$effective")
    principal_cmd_user=$(sed -n 's/^authorizedprincipalscommanduser //p' "$effective")
    printf '    dynamic-key-backend executable=%s configured=%s user=%s (arguments suppressed)\n' \
      "${key_cmd%% *}" "$([[ -n "$key_cmd" && "$key_cmd" != none ]] && printf yes || printf no)" "${key_cmd_user:-none}"
    printf '    dynamic-principals-backend executable=%s configured=%s user=%s (arguments suppressed)\n' \
      "${principal_cmd%% *}" "$([[ -n "$principal_cmd" && "$principal_cmd" != none ]] && printf yes || printf no)" "${principal_cmd_user:-none}"
  done
  printf '  Context limitation: repeat --connection-context for every observed remote/local address, host and port; the default loopback tuple cannot prove other Match conditions.\n\n'

  printf 'Resolved AuthorizedKeysFile metadata and public fingerprints:\n'
  if ((${#key_paths[@]} == 0)); then printf '    none resolved\n'; fi
  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    print_path_metadata authorized-keys "$path"
    print_fingerprints "$path"
  done < <(printf '%s\n' "${!key_paths[@]}" | LC_ALL=C sort)

  printf '\nAuthorizedPrincipalsFile metadata (contents suppressed):\n'
  if ((${#principal_paths[@]} == 0)); then printf '    none resolved\n'; fi
  while IFS= read -r path; do [[ -n "$path" ]] && print_path_metadata principals "$path"; done \
    < <(printf '%s\n' "${!principal_paths[@]}" | LC_ALL=C sort)

  printf '\nTrustedUserCAKeys metadata and public fingerprints:\n'
  if ((${#ca_paths[@]} == 0)); then printf '    none configured\n'; fi
  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    print_path_metadata trusted-ca "$path"
    print_fingerprints "$path"
  done < <(printf '%s\n' "${!ca_paths[@]}" | LC_ALL=C sort)

  printf '\nSSH configuration channel inventory (selected directives only):\n'
  while IFS= read -r config; do
    [[ -f "$config" && ! -L "$config" ]] || continue
    printf '  file=%s metadata=%s sha256=%s\n' "$config" \
      "$(stat -Lc '%u:%g:%a:%h' -- "$config")" "$(sha256sum "$config" | awk '{print $1}')"
    awk 'BEGIN {IGNORECASE=1}
      /^[[:space:]]*(Include|Match|AuthorizedKeysFile|AuthorizedKeysCommand|AuthorizedKeysCommandUser|TrustedUserCAKeys|AuthorizedPrincipalsFile|AuthorizedPrincipalsCommand|AuthorizedPrincipalsCommandUser|AllowUsers|DenyUsers|AllowGroups|DenyGroups)[[:space:]]/ {
        line=$0; sub(/^[[:space:]]*/, "", line); split(line, field, /[[:space:]]+/);
        printf "    selected-directive-line=%d name=%s value-suppressed\n", NR, field[1]
      }' "$config"
  done < <(find /etc/ssh -maxdepth 2 -type f \( -name sshd_config -o -name '*.conf' \) -print 2>/dev/null | LC_ALL=C sort)

  printf '\nAccount/group/password state:\n'
  id "$TARGET_USER" | sed 's/^/  /'
  passwd -S "$TARGET_USER" 2>/dev/null | awk '{print "  password-status=" $2 " last-change=" $3 " min=" $4 " max=" $5 " warn=" $6 " inactive=" $7}' || printf '  password-status=unavailable\n'

  printf '\nEffective sudo policy visibility (rules/arguments suppressed):\n'
  sudo_result=$AUDIT_TMP/sudo-effective.txt
  if ! sudo -n -l -U "$TARGET_USER" >"$sudo_result" 2>"$AUDIT_TMP/sudo-effective.err"; then
    printf '  ERROR: effective sudo policy query failed; audit is incomplete\n'
    sed -n '1,5p' "$AUDIT_TMP/sudo-effective.err" | sed 's/^/  sudo-error=/'
    return 1
  fi
  printf '  visible=yes bytes=%s lines=%s sha256=%s nopasswd-token=%s (rule text suppressed)\n' \
    "$(wc -c <"$sudo_result")" "$(wc -l <"$sudo_result")" \
    "$(sha256sum "$sudo_result" | awk '{print $1}')" \
    "$(grep -q 'NOPASSWD' "$sudo_result" && printf present || printf absent)"
  if ! visudo -c >"$AUDIT_TMP/visudo.out" 2>"$AUDIT_TMP/visudo.err"; then
    printf '  ERROR: visudo validation failed; audit is incomplete\n'
    sed -n '1,5p' "$AUDIT_TMP/visudo.err" | sed 's/^/  visudo-error=/'
    return 1
  fi
  printf '  visudo-validation=pass output-suppressed\n'
  printf 'Sudo policy file hashes/metadata:\n'
  while IFS= read -r sudo_file; do
    [[ -f "$sudo_file" && ! -L "$sudo_file" ]] || continue
    printf '  path=%s metadata=%s sha256=%s\n' "$sudo_file" \
      "$(stat -Lc '%u:%g:%a:%h' -- "$sudo_file")" "$(sha256sum "$sudo_file" | awk '{print $1}')"
  done < <(find /etc/sudoers /etc/sudoers.d -maxdepth 1 -type f -print 2>/dev/null | LC_ALL=C sort)

  printf '\nsite-ctl trust-boundary metadata:\n'
  if [[ -f /usr/local/sbin/site-ctl && ! -L /usr/local/sbin/site-ctl ]]; then
    printf '  path=/usr/local/sbin/site-ctl metadata=%s sha256=%s\n' \
      "$(stat -Lc '%u:%g:%a:%h' /usr/local/sbin/site-ctl)" \
      "$(sha256sum /usr/local/sbin/site-ctl | awk '{print $1}')"
  else
    printf '  absent or unsafe\n'
  fi

  printf '\nCurrent login/session evidence:\n'
  who 2>/dev/null | awk -v user="$TARGET_USER" '$1 == user {print "  who=" $0}' || true
  if command -v loginctl >/dev/null 2>&1; then
    loginctl list-sessions --no-legend --no-pager 2>/dev/null | awk -v user="$TARGET_USER" '$3 == user {print "  loginctl-session=" $1 " seat=" $4 " tty=" $5}' || true
  fi
  printf 'Current process identity evidence (no command lines):\n'
  if command -v pgrep >/dev/null 2>&1; then
    while IFS= read -r pid; do
      [[ "$pid" =~ ^[0-9]+$ && -r "/proc/$pid/comm" && -r "/proc/$pid/stat" ]] || continue
      stat_tail=$(sed 's/^.*) //' "/proc/$pid/stat")
      printf '  pid=%s comm=%s start_ticks=%s cgroups=' "$pid" "$(tr -d '\n' <"/proc/$pid/comm")" "$(awk '{print $20}' <<<"$stat_tail")"
      if [[ -r "/proc/$pid/cgroup" ]]; then cut -d: -f3 "/proc/$pid/cgroup" | paste -sd, -; else printf 'unavailable\n'; fi
    done < <(pgrep -u "$target_uid" 2>/dev/null | sort -n || true)
  fi
  printf '\nAudit limitations: provider-console keys, cloud-init/vendor injection, external AuthorizedKeysCommand/CA backends, deploy tokens, CI credentials, API sessions and unprovided Match Address contexts require owner/provider review.\n'
}

collect_evidence 2>&1 | tee "$EVIDENCE_TMP"
chown 0:0 -- "$EVIDENCE_TMP"
chmod 0600 -- "$EVIDENCE_TMP"

if [[ "$MODE" == audit ]]; then
  info "Audit only. No access, session, process, policy, service, or credential was changed."
  exit 0
fi

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR=$(default_backup_dir "webdev-owner-plan")
fi
assert_new_directory_target "$OUTPUT_DIR"
OUTPUT_DIR=$(prepare_marked_private_dir "$OUTPUT_DIR" .astro-webdev-owner-plan)
install -o 0 -g 0 -m 0600 -- "$EVIDENCE_TMP" "$OUTPUT_DIR/EVIDENCE.txt"

cat >"$OUTPUT_DIR/OWNER-REVOCATION-PLAN.md" <<'PLAN'
# Owner-reviewed developer access response plan

This is a checklist, not an executable rollback or revocation script. Its
generator changed no live access. Treat `EVIDENCE.txt` as security-sensitive
metadata even though it contains no private keys, key bodies, command lines,
environment values, or application secret values.

## 1. Establish owner control before developer exclusion

- Use the provider console/recovery channel and two independently tested owner
  sessions that do not depend on `webdev`, its groups, its keys, its CA, or its
  sudo policy. Confirm a current provider snapshot and off-host backup.
- Attribute every observed connection tuple and rerun the audit with one
  `--connection-context ADDR HOST LADDR LPORT` per tuple. Review every
  `Match Address/Host/LocalAddress/LocalPort/User/Group` result.
- Inventory provider-injected/cloud-init keys, SSH certificates and CA/principal
  backends, `AuthorizedKeysCommand`, PAM/password paths, CI/deploy keys, API
  tokens, Git credentials, scheduled jobs and external control panels. The host
  filesystem alone cannot prove those channels revoked.
- Decide the incident window, evidence retention, notification and rollback
  authority. Preserve authentication and sudo logs before ending sessions.

## 2. Exclude all developer write/authentication paths in one window

- From the recovery session, freeze the account at the account/provider level;
  do not assume emptying one `authorized_keys` file is sufficient. Review local
  password lock, shell, expiry, all supplementary groups, ACLs and file ownership.
- Revoke keys from every token-expanded `AuthorizedKeysFile` in every applicable
  address context. Revoke or disable dynamic key-command backends, provider keys,
  trusted CA certificates/principals, CI/deploy credentials and control-panel
  sessions that can recreate a local key.
- Remove effective sudo through a reviewed `visudo` transaction, including group
  and included-file grants—not only `/etc/sudoers.d/webdev`. Preserve the narrow
  root-owned `site-ctl` wrapper; verify its reviewed hash and allowlist separately.
- Enumerate `webdev` processes, SSH multiplexers, agents, user services, cron,
  lingering login sessions and open file descriptors. End sessions/processes only
  as a separately approved incident action after owner access is proven. A killed
  shell is not a rollback mechanism.
- Re-run `sshd -t`, effective `sshd -T -C` for every source context, `sudo -l -U`,
  account/group inspection and session/process inventory before leaving the window.

## 3. Rotate trust after exclusion

- Only after developer write/authentication exclusion, rotate every host and
  application secret the developer could read: internal signing secrets, third-
  party API tokens, session/dashboard secrets, repository/deploy credentials and
  backup credentials. Generate unique values, escrow them in the owner vault, and
  revoke old values after one-service-at-a-time validation.
- Review source, built artifacts, systemd units, Caddy, timers/cron, package hooks,
  containers and recent privileged changes for persistence. Deploy reviewed code
  from a clean release boundary; do not trust existing mutable build output.

## 4. Acceptance and recovery

- Test rejected authentication from each former developer channel and confirm
  accepted owner access. Review authentication/sudo logs for unexpected retries.
- Verify services and forms, Restic coverage/restore, firewall/origin controls and
  monitoring. Keep the provider snapshot until the incident owner signs off.
- Recovery restores owner service availability from known-good configuration or
  snapshot. Do not restore developer keys/sudo as a generic rollback; any temporary
  reauthorization requires a new, scoped owner decision and fresh credentials.
PLAN
chown 0:0 -- "$OUTPUT_DIR/OWNER-REVOCATION-PLAN.md"
chmod 0600 -- "$OUTPUT_DIR/OWNER-REVOCATION-PLAN.md"

info "Private owner response plan generated: $OUTPUT_DIR"
warn "PLAN ONLY: no SSH key, account, group, sudo rule, session, process, service, firewall, or credential was changed."
