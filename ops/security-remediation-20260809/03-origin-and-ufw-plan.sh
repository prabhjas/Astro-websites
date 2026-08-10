#!/usr/bin/env bash
# H-04/M-07: static/read-only origin exposure review and owner plan generator.

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

MODE=dry-run
OUTPUT_DIR=
CADDYFILE=/etc/caddy/Caddyfile
UFW_DIR=/etc/ufw
VISIBILITY_ERRORS=0
declare -a OPEN_FINDINGS=()
declare -a STATIC_SOURCE_PATHS=()
declare -a STATIC_SOURCE_HASHES=()

record_blocked() {
  blocked "$*"
  VISIBILITY_ERRORS=$((VISIBILITY_ERRORS + 1))
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

  stderr_file=$(mktemp /tmp/astro-origin-grep.XXXXXX)
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

  stderr_file=$(mktemp /tmp/astro-origin-sha256.XXXXXX)
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

remember_static_source() {
  local label=$1
  local file=$2
  local digest=
  if sha256_checked "$label SHA256" "$file" digest; then
    STATIC_SOURCE_PATHS+=("$file")
    STATIC_SOURCE_HASHES+=("$digest")
  fi
}

verify_static_sources_unchanged() {
  local index current
  for index in "${!STATIC_SOURCE_PATHS[@]}"; do
    current=
    if sha256_checked "static-source stability recheck" "${STATIC_SOURCE_PATHS[$index]}" current; then
      if [[ "$current" != "${STATIC_SOURCE_HASHES[$index]}" ]]; then
        record_blocked "Static source changed during audit: ${STATIC_SOURCE_PATHS[$index]}"
      fi
    fi
  done
}

usage() {
  cat <<'USAGE'
Usage: 03-origin-and-ufw-plan.sh [options]

Default: inspect local Caddy/UFW/listener evidence. No network or API calls.

Options:
  --apply                 Write a private owner-review plan only.
  --output-dir PATH       New/marked plan directory (required with --apply).
  --caddyfile PATH        Caddy config to inspect.
  --ufw-dir PATH          UFW config directory to inspect.
  -h, --help              Show help.

This helper never changes Caddy, UFW, DNS, or Cloudflare settings and never
reloads a service. The separate 03b helper is the only optional 4323 mutation.
USAGE
}

while (($#)); do
  case "$1" in
    --apply) MODE=apply ;;
    --output-dir)
      (($# >= 2)) || die "--output-dir requires a path"
      OUTPUT_DIR=$2
      shift
      ;;
    --caddyfile)
      (($# >= 2)) || die "--caddyfile requires a path"
      CADDYFILE=$2
      shift
      ;;
    --ufw-dir)
      (($# >= 2)) || die "--ufw-dir requires a path"
      UFW_DIR=$2
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

info "Origin/UFW evidence (local inspection only)"
site_blocks=0
tls_internal=0
trusted_proxies=0
if [[ -f "$CADDYFILE" && ! -L "$CADDYFILE" && -r "$CADDYFILE" ]]; then
  info "Caddyfile: $CADDYFILE"
  remember_static_source "Caddyfile" "$CADDYFILE"
  if ! grep_count_checked "Caddy site-block count" '^[^#[:space:]].*\{' "$CADDYFILE" site_blocks; then :; fi
  if ! grep_count_checked "Caddy internal-TLS count" '^[[:space:]]*tls[[:space:]]+internal([[:space:]]|$)' "$CADDYFILE" tls_internal; then :; fi
  if ! grep_count_checked "Caddy trusted-proxies count" '^[[:space:]]*[^#[:space:]].*trusted_proxies([[:space:]]|$)' "$CADDYFILE" trusted_proxies; then :; fi
  printf '  site_blocks=%s tls_internal=%s trusted_proxies_directives=%s\n' \
    "$site_blocks" "$tls_internal" "$trusted_proxies"
else
  record_blocked "Caddyfile must be a readable, nonsymlink regular file: $CADDYFILE"
fi

ufw_static_output=
ufw_rule_files=()
if [[ -d "$UFW_DIR" && ! -L "$UFW_DIR" && -r "$UFW_DIR" && -x "$UFW_DIR" ]]; then
  for ufw_rule_file in "$UFW_DIR/user.rules" "$UFW_DIR/user6.rules"; do
    if [[ -f "$ufw_rule_file" && ! -L "$ufw_rule_file" && -r "$ufw_rule_file" ]]; then
      ufw_rule_files+=("$ufw_rule_file")
      remember_static_source "static UFW source" "$ufw_rule_file"
    else
      record_blocked "Required static UFW source must be a readable, nonsymlink regular file: $ufw_rule_file"
    fi
  done
fi
if ((${#ufw_rule_files[@]} == 2)); then
  info "Static UFW references to fleet ports:"
  ufw_grep_error=$(mktemp /tmp/astro-origin-ufw-grep.XXXXXX)
  if ufw_static_output=$(grep -HE '(^|[^0-9])(22|80|443|4323)(/tcp|[^0-9]|$)' "${ufw_rule_files[@]}" 2>"$ufw_grep_error"); then
    ufw_grep_rc=0
  else
    ufw_grep_rc=$?
  fi
  if ((ufw_grep_rc > 1)) || [[ -s "$ufw_grep_error" ]]; then
    record_blocked "Cannot read the required static UFW rule sources"
    sed -n '1,8p' "$ufw_grep_error" >&2
    ufw_static_output=
  else
    printf '%s\n' "$ufw_static_output" \
      | sed -E 's/(comment[[:space:]]+).*/\1[omitted]/' \
      | sed -n '1,80p'
  fi
  rm -f -- "$ufw_grep_error"
else
  if [[ ! -d "$UFW_DIR" || -L "$UFW_DIR" || ! -r "$UFW_DIR" || ! -x "$UFW_DIR" ]]; then
    record_blocked "UFW directory must be a readable, searchable, nonsymlink directory: $UFW_DIR"
  fi
fi

if ! command -v ufw >/dev/null 2>&1; then
  record_blocked "ufw is unavailable; runtime firewall state is unverified"
else
  ufw_error=$(mktemp /tmp/astro-origin-ufw.XXXXXX)
  if ufw_runtime=$(ufw status verbose 2>"$ufw_error"); then
    ufw_rc=0
  else
    ufw_rc=$?
  fi
  if ((ufw_rc != 0)) || [[ -s "$ufw_error" ]]; then
    record_blocked "ufw runtime status is not visible without command errors/stderr"
    sed -n '1,20p' "$ufw_error" >&2
  else
    info "Runtime UFW status:"
    printf '%s\n' "$ufw_runtime" | sed -n '1,80p'
    if grep -Eq '^Status:[[:space:]]+active[[:space:]]*$' <<<"$ufw_runtime"; then
      :
    elif grep -Eq '^Status:[[:space:]]+inactive[[:space:]]*$' <<<"$ufw_runtime"; then
      record_open "UFW is inactive; host firewall controls are not enforcing the reviewed policy"
    else
      record_blocked "ufw output did not contain an unambiguous active/inactive status"
    fi
    if ufw_default=$(grep -E '^Default:' <<<"$ufw_runtime"); then
      if ! grep -Eq '^Default:[[:space:]]+deny[[:space:]]+\(incoming\)(,|[[:space:]]|$)' <<<"$ufw_default"; then
        record_open "UFW default incoming policy is not deny"
      fi
    else
      record_blocked "ufw verbose output omitted the default incoming policy"
    fi

    broad_web_rule=0
    stale_4323_rule=0
    while IFS= read -r ufw_line; do
      [[ "$ufw_line" == *ALLOW* ]] || continue
      trimmed_ufw_line=${ufw_line#"${ufw_line%%[![:space:]]*}"}
      first_field=${trimmed_ufw_line%%[[:space:]]*}
      port_list=${first_field%/tcp}
      padded_ports=,$port_list,
      if [[ "$ufw_line" == *Anywhere* ]] && { [[ "$padded_ports" == *,80,* ]] || [[ "$padded_ports" == *,443,* ]]; }; then
        broad_web_rule=1
      fi
      [[ "$padded_ports" == *,4323,* ]] && stale_4323_rule=1
    done <<<"$ufw_runtime"
    ((broad_web_rule == 0)) || record_open "UFW still has an Anywhere ALLOW for origin TCP 80/443; Cloudflare-only origin restriction is not enforced locally"
    ((stale_4323_rule == 0)) || record_open "UFW runtime policy still contains an ALLOW rule for TCP 4323"
  fi
  rm -f -- "$ufw_error"
fi

if ! command -v ss >/dev/null 2>&1; then
  record_blocked "ss is unavailable; local listener exposure is unverified"
else
  ss_error=$(mktemp /tmp/astro-origin-ss.XXXXXX)
  if ! ss_runtime=$(ss -H -ltn 2>"$ss_error") || [[ -s "$ss_error" ]]; then
    record_blocked "TCP listener state is not visible without command errors/stderr"
    sed -n '1,20p' "$ss_error" >&2
  else
    info "Listening TCP endpoints (local address only):"
    listener_endpoints=$(printf '%s\n' "$ss_runtime" | awk 'NF >= 4 {print $4}' | sort -u)
    malformed_listener_rows=$(printf '%s\n' "$ss_runtime" | awk 'NF > 0 && NF < 4 {count++} END {print count+0}')
    if ((malformed_listener_rows > 0)); then
      record_blocked "ss returned rows that could not be parsed as listener evidence"
    else
      printf '%s\n' "$listener_endpoints" | sed '/^$/d; s/^/  /'
      has_4323_listener=0
      public_high_listeners=()
      while IFS= read -r endpoint; do
        [[ -n "$endpoint" ]] || continue
        port=${endpoint##*:}
        [[ "$port" =~ ^[0-9]+$ ]] || continue
        ((port == 4323)) && has_4323_listener=1
        host=${endpoint%:*}
        if ((port > 1024)) && [[ "$host" != 127.* && "$host" != "[::1]" && "$host" != ::1 ]]; then
          public_high_listeners+=("$endpoint")
        fi
      done <<<"$listener_endpoints"
      ((has_4323_listener == 0)) || record_open "TCP 4323 still has a local listener"
      if ((${#public_high_listeners[@]} > 0)); then
        record_open "Non-loopback high-port listeners require owner attribution: $(IFS=,; printf '%s' "${public_high_listeners[*]}")"
      fi
    fi
  fi
  rm -f -- "$ss_error"
fi

verify_static_sources_unchanged

if ((VISIBILITY_ERRORS == 0)); then
  ((site_blocks > 0)) || record_open "No Caddy site block was directly visible in the supplied Caddyfile"
  ((trusted_proxies > 0)) || record_open "No Caddy trusted_proxies directive was found; forwarded client-IP trust remains unreviewed"
  if grep -Eq '(^|[^0-9])4323(/tcp|[^0-9]|$)' <<<"$ufw_static_output"; then
    record_open "Static UFW rule sources still reference TCP 4323"
  fi
  record_open "Provider-firewall and Cloudflare proxy/DNS evidence is outside this local audit; direct-origin closure remains owner-verified"
fi

if ((VISIBILITY_ERRORS > 0)); then
  blocked "Origin/UFW audit is BLOCKED by $VISIBILITY_ERRORS evidence error(s); refusing PASS or plan generation"
  exit 2
fi

if [[ "$MODE" == dry-run ]]; then
  if ((${#OPEN_FINDINGS[@]} > 0)); then
    printf 'OPEN: Origin/UFW audit has %s unresolved control finding(s); no readiness claim is made.\n' "${#OPEN_FINDINGS[@]}" >&2
    exit 3
  fi
  info "CLOSED: all required local Origin/UFW controls are evidenced. --apply only writes a plan."
  exit 0
fi

require_root
[[ -n "$OUTPUT_DIR" ]] || die "--output-dir is required with --apply"
canonical_output=$(canonical_private_output_path "$OUTPUT_DIR")
marker=$canonical_output/.astro-origin-plan
canonical_output=$(prepare_marked_private_dir "$canonical_output" .astro-origin-plan)

info "Writing owner-review material to $canonical_output only; this is not a live apply."

evidence=$canonical_output/LOCAL-EVIDENCE.txt
{
  printf 'Generated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'Caddyfile: %s\n' "$CADDYFILE"
  printf 'Caddy SHA256: %s\n' "${STATIC_SOURCE_HASHES[0]}"
  printf 'tls internal directives: %s\n' "$tls_internal"
  printf 'trusted_proxies directives: %s\n' "$trusted_proxies"
  printf '\nUFW runtime status:\n%s\n' "$ufw_runtime"
  printf '\nTCP listeners:\n'
  printf '%s\n' "$ss_runtime" | awk '{print $4}' | sort -u
  printf '\nUnresolved findings:\n'
  if ((${#OPEN_FINDINGS[@]} == 0)); then
    printf 'none\n'
  else
    printf 'OPEN: %s\n' "${OPEN_FINDINGS[@]}"
  fi
} >"$evidence"
chmod 0600 "$evidence"

cat >"$canonical_output/OWNER-PLAN.md" <<'PLAN'
# Cloudflare origin restriction and stale-port plan

No step in this plan should be automated through a DNS or Cloudflare API.

## Preflight

- Keep two tested owner SSH sessions and provider-console access.
- Record current provider-firewall and UFW policies, including IPv4 and IPv6.
- Confirm all public sites are proxied in Cloudflare, not DNS-only.
- Manually obtain the current Cloudflare IPv4 and IPv6 ranges from Cloudflare's
  official published page. Have a second owner review the copied ranges and date.
- Confirm Caddy and every Node service bind as expected; Node should be loopback.
- Confirm `ss -lntup` has no required service on TCP 4323.

## Origin restriction

1. Preserve SSH access first. Do not replace the entire firewall policy.
2. Add allow rules for current Cloudflare IPv4 and IPv6 source ranges to origin
   TCP 80 and 443 at the provider firewall, preferably before host UFW.
3. Retain loopback traffic and a narrow, documented owner recovery path.
4. Deny all other Internet sources to origin TCP 80/443.
5. From an external non-Cloudflare network, direct-origin `curl --resolve` should
   time out or be denied. Through each normal hostname, HTTP/HTTPS should work.
6. Test apex/www redirects, forms, uploads, and internal API authorization.

`trusted_proxies` controls client-IP interpretation but does not itself prevent
direct origin access. Do not treat it as a firewall replacement. If configured,
trust only reviewed Cloudflare ranges and reject spoofed forwarding headers from
other sources.

## Stale TCP 4323

Use `03b-remove-stale-ufw-4323.sh` only after listener and dependency review. It
backs up `/etc/ufw`, removes only the exact broad `4323/tcp` rule, and does not
reload Caddy/systemd. Do not remove a numbered rule copied from stale output;
rule numbers can change.

## Rollback

- Keep the untouched SSH recovery session open.
- Restore the exact saved provider-firewall policy if proxied traffic fails.
- If 4323 was actually needed, run the narrow rollback printed by 03b, then
  investigate and replace the preview server with an authenticated, non-public
  deployment workflow.
- Never expose Node high ports as a shortcut during rollback.
PLAN
chmod 0600 "$canonical_output/OWNER-PLAN.md"

info "Owner-review plan written: $canonical_output"
info "No live configuration, firewall rule, DNS record, or service was changed."
if ((${#OPEN_FINDINGS[@]} > 0)); then
  printf 'OPEN: Plan staged, but the audit still has %s unresolved control finding(s); no readiness claim is made.\n' "${#OPEN_FINDINGS[@]}" >&2
  exit 3
fi
info "CLOSED: plan staged and all required local controls are evidenced."
