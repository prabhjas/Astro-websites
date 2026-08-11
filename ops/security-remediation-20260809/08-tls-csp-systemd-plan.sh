#!/usr/bin/env bash
# M-02/M-08/M-09: static audit and candidate-only hardening plan generator.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=audit
OUTPUT_DIR=
CADDYFILE=/etc/caddy/Caddyfile
SYSTEMD_DIR=/etc/systemd/system
SYSTEMCTL=${ASTRO_SYSTEMCTL:-systemctl}
EVIDENCE_ERRORS=0
declare -a OPEN_FINDINGS=()
declare -a UNIT_EVIDENCE=()

record_blocked() {
  blocked "$*"
  EVIDENCE_ERRORS=$((EVIDENCE_ERRORS + 1))
}

record_open() {
  printf 'OPEN: %s\n' "$*" >&2
  OPEN_FINDINGS+=("$*")
}

grep_count_checked() {
  local label=$1
  local pattern=$2
  local file=$3
  local destination=$4
  local stderr_file output rc

  stderr_file=$(mktemp /tmp/astro-hardening-grep.XXXXXX)
  if output=$(grep -Ec -- "$pattern" "$file" 2>"$stderr_file"); then
    rc=0
  else
    rc=$?
  fi
  if ((rc > 1)) || [[ -s "$stderr_file" ]] || [[ ! "$output" =~ ^[0-9]+$ ]]; then
    record_blocked "Cannot obtain $label from $file"
    sed -n '1,8p' "$stderr_file" >&2
    rm -f -- "$stderr_file"
    printf -v "$destination" '%s' 0
    return 1
  fi
  rm -f -- "$stderr_file"
  printf -v "$destination" '%s' "$output"
}

sha256_checked() {
  local label=$1
  local file=$2
  local destination=$3
  local stderr_file output parsed_digest rc

  stderr_file=$(mktemp /tmp/astro-hardening-sha256.XXXXXX)
  if output=$(sha256sum -- "$file" 2>"$stderr_file"); then
    rc=0
  else
    rc=$?
  fi
  parsed_digest=${output%% *}
  if ((rc != 0)) || [[ -s "$stderr_file" ]] || [[ ! "$parsed_digest" =~ ^[0-9a-fA-F]{64}$ ]]; then
    record_blocked "Cannot obtain $label from $file"
    sed -n '1,8p' "$stderr_file" >&2
    rm -f -- "$stderr_file"
    return 1
  fi
  rm -f -- "$stderr_file"
  printf -v "$destination" '%s' "$parsed_digest"
}

systemctl_value_checked() {
  local unit=$1
  local property=$2
  local destination=$3
  local stderr_file output rc

  stderr_file=$(mktemp /tmp/astro-hardening-systemctl.XXXXXX)
  if output=$("$SYSTEMCTL" show "$unit" --property="$property" --value 2>"$stderr_file"); then
    rc=0
  else
    rc=$?
  fi
  if ((rc != 0)) || [[ -s "$stderr_file" ]]; then
    record_blocked "Cannot read effective $property for $unit without command errors/stderr"
    sed -n '1,8p' "$stderr_file" >&2
    rm -f -- "$stderr_file"
    return 1
  fi
  rm -f -- "$stderr_file"
  printf -v "$destination" '%s' "$output"
}

usage() {
  cat <<'USAGE'
Usage: 08-tls-csp-systemd-plan.sh [options]

Default: static/read-only Caddy/detection audit plus effective systemd property
inspection for active Astro services.

Options:
  --apply                 Generate private candidate material only.
  --output-dir PATH       Staging directory required with --apply.
  --caddyfile PATH        Caddyfile to inspect.
  --systemd-dir PATH      Unit directory to inspect.
  -h, --help              Show help.

Apply does not copy into /etc, install packages, change Cloudflare, call an API,
daemon-reload, reload Caddy, restart a site, or enforce a generic CSP.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --output-dir) (($# >= 2)) || die "--output-dir requires a path"; OUTPUT_DIR=$2; shift ;;
    --caddyfile) (($# >= 2)) || die "--caddyfile requires a path"; CADDYFILE=$2; shift ;;
    --systemd-dir) (($# >= 2)) || die "--systemd-dir requires a path"; SYSTEMD_DIR=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

csp_enforced=0
csp_report_only=0
permissions_policy=0
tls_protocols=0
caddy_sha256=
if [[ -f "$CADDYFILE" && ! -L "$CADDYFILE" && -r "$CADDYFILE" ]]; then
  if ! sha256_checked "Caddyfile SHA256" "$CADDYFILE" caddy_sha256; then :; fi
  if ! grep_count_checked "enforced CSP count" '^[[:space:]]*[^#[:space:]].*Content-Security-Policy[[:space:]]' "$CADDYFILE" csp_enforced; then :; fi
  if ! grep_count_checked "report-only CSP count" '^[[:space:]]*[^#[:space:]].*Content-Security-Policy-Report-Only([[:space:]]|$)' "$CADDYFILE" csp_report_only; then :; fi
  if ! grep_count_checked "Permissions-Policy count" '^[[:space:]]*[^#[:space:]].*Permissions-Policy([[:space:]]|$)' "$CADDYFILE" permissions_policy; then :; fi
  if ! grep_count_checked "explicit TLS protocol count" '^[[:space:]]*[^#[:space:]].*protocols[[:space:]]+tls1\.(2|3)([[:space:]]|$)' "$CADDYFILE" tls_protocols; then :; fi
  printf 'Caddy enforced CSP headers: %s\n' "$csp_enforced"
  printf 'Caddy report-only CSP headers: %s\n' "$csp_report_only"
  printf 'Caddy Permissions-Policy headers: %s\n' "$permissions_policy"
  printf 'Caddy explicit TLS protocol directives: %s\n' "$tls_protocols"
else
  record_blocked "Caddyfile must be a readable, nonsymlink regular file: $CADDYFILE"
fi

if [[ ! -d "$SYSTEMD_DIR" || -L "$SYSTEMD_DIR" || ! -r "$SYSTEMD_DIR" || ! -x "$SYSTEMD_DIR" ]]; then
  record_blocked "Systemd source directory must be a readable, searchable, nonsymlink directory: $SYSTEMD_DIR"
fi

((EVIDENCE_ERRORS == 0)) || {
  blocked "Hardening audit is BLOCKED by $EVIDENCE_ERRORS static-evidence error(s); refusing PASS or plan generation"
  exit 2
}

controls=(NoNewPrivileges PrivateTmp PrivateDevices ProtectSystem ProtectHome ProtectKernelTunables ProtectKernelModules ProtectKernelLogs ProtectControlGroups RestrictSUIDSGID LockPersonality RestrictRealtime RemoveIPC SystemCallArchitectures CapabilityBoundingSet AmbientCapabilities UMask)
if ! command -v "$SYSTEMCTL" >/dev/null 2>&1; then
  blocked "Required systemctl command is unavailable: $SYSTEMCTL"
  exit 2
fi
printf 'Effective unit hardening gaps (active Astro services):\n'
systemctl_error=$(mktemp /tmp/astro-hardening-systemctl-list.XXXXXX)
if active_units_output=$("$SYSTEMCTL" list-units --type=service --state=active --no-legend --no-pager 2>"$systemctl_error"); then
  systemctl_rc=0
else
  systemctl_rc=$?
fi
if ((systemctl_rc != 0)) || [[ -s "$systemctl_error" ]]; then
  blocked "Cannot obtain active systemd inventory without command errors/stderr; raw unit-file greps are not an effective-config substitute"
  sed -n '1,8p' "$systemctl_error" >&2
  rm -f -- "$systemctl_error"
  exit 2
fi
rm -f -- "$systemctl_error"
effective_errors=0
astro_units=0
while IFS= read -r unit; do
  [[ -n "$unit" ]] || continue
  if ! systemctl_value_checked "$unit" WorkingDirectory working_dir; then
    effective_errors=$((effective_errors + 1))
    continue
  fi
  [[ "$working_dir" == /opt/Astro-production/* ]] || continue
  astro_units=$((astro_units + 1))
  missing=()
  values=()
  for control in "${controls[@]}"; do
    value=
    if ! systemctl_value_checked "$unit" "$control" value; then
      effective_errors=$((effective_errors + 1))
      continue
    fi
    values+=("$control=$value")
    case "$control:$value" in
      NoNewPrivileges:yes|PrivateTmp:yes|PrivateDevices:yes|ProtectHome:yes|ProtectKernelTunables:yes|ProtectKernelModules:yes|ProtectKernelLogs:yes|ProtectControlGroups:yes|RestrictSUIDSGID:yes|LockPersonality:yes|RestrictRealtime:yes|RemoveIPC:yes|ProtectSystem:strict|SystemCallArchitectures:native|CapabilityBoundingSet:|AmbientCapabilities:|UMask:0027) ;;
      *) missing+=("$control") ;;
    esac
  done
  fragment=
  dropins=
  if ! systemctl_value_checked "$unit" FragmentPath fragment; then
    effective_errors=$((effective_errors + 1))
  elif [[ -z "$fragment" ]]; then
    record_blocked "Effective FragmentPath is empty for active Astro unit $unit"
    effective_errors=$((effective_errors + 1))
  fi
  if ! systemctl_value_checked "$unit" DropInPaths dropins; then
    effective_errors=$((effective_errors + 1))
  fi
  printf '  %s workdir=%s fragment=%s dropins=%s\n' "$unit" "$working_dir" "${fragment:-unknown}" "${dropins:-none}"
  printf '    effective: %s\n' "$(IFS=,; printf '%s' "${values[*]}")"
  UNIT_EVIDENCE+=("$unit workdir=$working_dir fragment=${fragment:-unknown} dropins=${dropins:-none} effective=$(IFS=,; printf '%s' "${values[*]}")")
  if ((${#missing[@]} > 0)); then
    printf '    gaps: %s\n' "$(IFS=,; printf '%s' "${missing[*]}")"
    record_open "$unit lacks required effective service hardening: $(IFS=,; printf '%s' "${missing[*]}")"
  else
    printf '    gaps: none\n'
  fi
done < <(printf '%s\n' "$active_units_output" | awk '$1 ~ /^[A-Za-z0-9_.@:-]+\.service$/ {print $1}' | sort -u)
((effective_errors == 0)) || { blocked "Effective unit audit had $effective_errors visibility error(s)"; exit 2; }
((astro_units > 0)) || { blocked "No active Astro services were visible in effective systemd inventory"; exit 2; }

current_caddy_sha256=
if sha256_checked "Caddyfile stability recheck" "$CADDYFILE" current_caddy_sha256; then
  if [[ "$current_caddy_sha256" != "$caddy_sha256" ]]; then
    record_blocked "Caddyfile changed during audit: $CADDYFILE"
  fi
fi
((EVIDENCE_ERRORS == 0)) || {
  blocked "Hardening audit is BLOCKED by $EVIDENCE_ERRORS changing/unreadable static-source error(s); refusing PASS or plan generation"
  exit 2
}

((csp_enforced > 0)) || record_open "No enforced Content-Security-Policy header was found in the supplied Caddyfile"
((permissions_policy > 0)) || record_open "No Permissions-Policy header was found in the supplied Caddyfile"
((tls_protocols > 0)) || record_open "No explicit origin TLS 1.2/1.3 protocol policy was found in the supplied Caddyfile"
record_open "Static header counts do not prove per-site response coverage; every production hostname still requires response-header verification"
record_open "Cloudflare per-zone minimum-TLS evidence is outside this local audit and remains owner-verified"

missing_detection=()
for detection_command in auditctl augenrules fail2ban-client aide; do
  command -v "$detection_command" >/dev/null 2>&1 || missing_detection+=("$detection_command")
done
if ((${#missing_detection[@]} > 0)); then
  record_open "Detection commands are not installed/available: $(IFS=,; printf '%s' "${missing_detection[*]}")"
fi
record_open "Command presence alone does not prove enabled monitoring, retention, alert delivery, or owner response; operational detection evidence remains open"

if [[ "$MODE" == audit ]]; then
  if ((${#OPEN_FINDINGS[@]} > 0)); then
    printf 'OPEN: TLS/CSP/systemd/detection audit has %s unresolved control finding(s); no readiness claim is made.\n' "${#OPEN_FINDINGS[@]}" >&2
    exit 3
  fi
  info "CLOSED: all required TLS/CSP/systemd/detection controls are evidenced."
  exit 0
fi

require_root
[[ -n "$OUTPUT_DIR" ]] || die "--output-dir is required with --apply"
for template_source in \
  "$SCRIPT_DIR/templates/caddy-security-review.caddy.example" \
  "$SCRIPT_DIR/templates/site-security-hardening.conf.example"; do
  if [[ ! -f "$template_source" || -L "$template_source" || ! -r "$template_source" ]]; then
    blocked "Candidate template must be a readable, nonsymlink regular file: $template_source"
    exit 2
  fi
done
canonical=$(canonical_private_output_path "$OUTPUT_DIR")
marker=$canonical/.astro-hardening-staging
canonical=$(prepare_marked_private_dir "$canonical" .astro-hardening-staging)
install -m 0600 "$SCRIPT_DIR/templates/caddy-security-review.caddy.example" "$canonical/"
install -m 0600 "$SCRIPT_DIR/templates/site-security-hardening.conf.example" "$canonical/"

{
  printf 'Generated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'Caddyfile: %s\n' "$CADDYFILE"
  printf 'Caddy SHA256: %s\n' "$caddy_sha256"
  printf 'CSP enforced=%s report_only=%s permissions_policy=%s tls_protocols=%s\n' \
    "$csp_enforced" "$csp_report_only" "$permissions_policy" "$tls_protocols"
  printf '\nEffective active Astro units:\n'
  printf '%s\n' "${UNIT_EVIDENCE[@]}"
  printf '\nUnresolved findings:\n'
  if ((${#OPEN_FINDINGS[@]} == 0)); then
    printf 'none\n'
  else
    printf 'OPEN: %s\n' "${OPEN_FINDINGS[@]}"
  fi
} >"$canonical/LOCAL-EVIDENCE.txt"
chmod 0600 "$canonical/LOCAL-EVIDENCE.txt"

cat >"$canonical/OWNER-PLAN.md" <<'PLAN'
# TLS, response-header, systemd, and detection plan

1. In each Cloudflare zone, set Minimum TLS Version to 1.2 or newer. Confirm from
   outside with explicit TLS 1.0/1.1 failures and TLS 1.2 success. No API is used.
2. Confirm Caddy origin TLS also rejects TLS below 1.2. Keep the Cloudflare/origin
   certificate mode compatible; protocol policy does not fix direct-origin access.
3. Keep CSP report-only until violations for forms, analytics, fonts, embeds, and
   uploads have been reviewed per site. Build explicit allowlists, remove
   `unsafe-eval`, canary an enforced header, then expand. Keep Permissions-Policy
   enforced immediately unless a documented feature needs an exception.
4. For one Node unit, merge the systemd example as a drop-in. Preserve all required
   ReadWritePaths. Run `systemd-analyze verify` and `systemd-analyze security`, then
   test a non-production start. Back up the live unit/drop-in before installation.
5. Only in a maintenance window: `systemctl daemon-reload`, restart that one unit,
   test pages/forms/internal jobs, and review the journal. Roll back the drop-in on
   failure. Expand one unit at a time. Treat Caddy separately because it needs the
   narrow capability to bind ports 80/443.
6. Evaluate auditd, file-integrity monitoring, SSH banning/rate limiting, and a
   host EDR. Define retention and alert ownership before installation; a package
   without monitored alerts is not a detection control.

No staged file is a live-ready fleet-wide policy without per-site review.
PLAN
chmod 0600 "$canonical/OWNER-PLAN.md" "$marker"
info "Candidate-only material staged at $canonical; no live setting changed."
if ((${#OPEN_FINDINGS[@]} > 0)); then
  printf 'OPEN: Plan staged, but the audit still has %s unresolved control finding(s); no readiness claim is made.\n' "${#OPEN_FINDINGS[@]}" >&2
  exit 3
fi
info "CLOSED: plan staged and all required local controls are evidenced."
