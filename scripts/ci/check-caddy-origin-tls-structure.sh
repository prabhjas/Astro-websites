#!/usr/bin/env bash
# Fail CI if active Caddy sources can restore the retired default local CA.
# This checks structure and paths only; it never reads private-key contents.

set -euo pipefail
export LC_ALL=C

cd -- "$(git rev-parse --show-toplevel)"

canonical=caddy/Caddyfile.production
registry=scripts/fleet-sites.json
legacy_evolution=Astro-production/evolutionmiddleast.com/deploy/Caddyfile.snippet
astro_ca=astro_origin_2026
payroll_ca=payroll_origin_isolated_2026

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

count_ere() {
  local pattern=$1 file=$2 count
  count=$(grep -Ec -- "$pattern" "$file" || true)
  printf '%s' "$count"
}

[[ -f "$canonical" ]] || fail "missing canonical production Caddyfile: $canonical"
[[ -f "$registry" ]] || fail "missing fleet registry: $registry"
[[ -f "$legacy_evolution" ]] || fail "missing tracked Evolution deploy source: $legacy_evolution"
mapfile -t registry_domains < <(jq -er '
  .sites
  | map(.domain)
  | if length > 0 and length == (unique | length)
    then sort[]
    else error("fleet registry domains must be nonempty and unique")
    end
' "$registry")
expected_site_count=${#registry_domains[@]}
expected_astro_site_count=$((expected_site_count - 1))
expected_loader_count=$((expected_site_count * 2))

declare -A expected_snippets=()
for domain in "${registry_domains[@]}"; do
  expected_snippets["Astro-production/$domain/deploy/$domain.caddy"]=1
done
mapfile -d '' snippets < <(git ls-files -z 'Astro-production/*/deploy/*.caddy' | sort -z)
((${#snippets[@]} == expected_site_count)) ||
  fail "expected $expected_site_count tracked active deploy snippets, found ${#snippets[@]}"
for snippet in "${snippets[@]}"; do
  [[ ${expected_snippets[$snippet]+present} ]] ||
    fail "tracked deploy snippet is not represented exactly by the fleet registry: $snippet"
done
for snippet in "${!expected_snippets[@]}"; do
  [[ -f $snippet ]] || fail "fleet registry is missing its exact deploy snippet: $snippet"
done
cmp -s -- "$legacy_evolution" Astro-production/evolutionmiddleast.com/deploy/evolutionmiddleast.com.caddy ||
  fail "Evolution legacy and canonical deploy snippets differ"

active_sources=("$canonical" "$legacy_evolution" "${snippets[@]}")
if grep -EnH -- '^[[:space:]]*tls[[:space:]]+internal([[:space:]]|$)' "${active_sources[@]}"; then
  fail "bare 'tls internal' is forbidden in canonical and active deploy sources"
fi
mapfile -d '' active_deploy_files < <(git ls-files -z 'Astro-production/*/deploy/*')
if grep -IEnH -- 'tls[[:space:]]+internal|certificates/local/|ca[[:space:]]+local([[:space:]]|$)|/etc/caddy/sites\.d|http://.*https://|not bare hostnames|mixed http\+https' "${active_deploy_files[@]}"; then
  fail "active deployment code or guidance references the retired default local CA"
fi

mapfile -d '' active_guidance < <(git ls-files -z -- \
  README.md caddy/README.md 'docs/*.md' 'docs/**/*.md' 'ops/**/*.md' \
  'Astro-production/*/README.md' 'Astro-production/*/deploy/*' \
  'Astro-production/*/docs/*.md')
if grep -IEnH -- 'tls[[:space:]]+internal|/etc/caddy/sites\.d|/opt/Astro-production/_incoming/(install-caddyfile-security-20260807\.sh|Caddyfile\.production\.20260807-security)|sudo[[:space:]]+bash[[:space:]]+/home/webdev/astro-cutover-env/ROOT-BOOTSTRAP' "${active_guidance[@]}"; then
  fail "active guidance can restore a retired CA, split layout, staged source, or bootstrap path"
fi

mapfile -d '' payroll_guidance < <(git ls-files -z -- \
  'Astro-production/payrollmiddleast.org/deploy/*' \
  'Astro-production/payrollmiddleast.org/docs/*.md')
if grep -IEnH -- 'astro_origin_2026' "${payroll_guidance[@]}"; then
  fail "Payroll guidance must use only payroll_origin_isolated_2026"
fi

[[ $(head -n 1 -- "$canonical") == '# C-01-REFRESH-SCHEMA: named-internal-manual-v1' ]] ||
  fail "canonical C-01 refresh schema marker is missing"
[[ $(count_ere '^[[:space:]]*auto_https[[:space:]]+ignore_loaded_certs[[:space:]]*$' "$canonical") == 1 ]] ||
  fail "canonical config must set auto_https ignore_loaded_certs exactly once"
[[ $(count_ere '^[[:space:]]*ca[[:space:]]+astro_origin_2026[[:space:]]*\{' "$canonical") == 1 ]] ||
  fail "canonical config must define $astro_ca exactly once"
[[ $(count_ere '^[[:space:]]*ca[[:space:]]+payroll_origin_isolated_2026[[:space:]]*\{' "$canonical") == 1 ]] ||
  fail "canonical config must define $payroll_ca exactly once"
[[ $(count_ere '^[[:space:]]*tls[[:space:]]+force_automate[[:space:]]*\{' "$canonical") == "$expected_site_count" ]] ||
  fail "canonical config must contain $expected_site_count force_automate policies"
[[ $(count_ere '^[[:space:]]*ca[[:space:]]+astro_origin_2026[[:space:]]*$' "$canonical") == "$expected_astro_site_count" ]] ||
  fail "canonical config must assign $astro_ca to exactly $expected_astro_site_count sites"
[[ $(count_ere '^[[:space:]]*ca[[:space:]]+payroll_origin_isolated_2026[[:space:]]*$' "$canonical") == 1 ]] ||
  fail "canonical config must assign $payroll_ca to Payroll exactly once"
[[ $(count_ere '^[[:space:]]*tls[[:space:]]+/var/lib/caddy/\.local/share/caddy/certificates/' "$canonical") == "$expected_loader_count" ]] ||
  fail "canonical config must synchronously load exactly $expected_loader_count origin certificate/key pairs"

check_site_source() {
  local snippet=$1 domain=$2 ca=$3 apex_loader www_loader loader

  [[ $(count_ere '^[[:space:]]*tls[[:space:]]+force_automate[[:space:]]*\{' "$snippet") == 1 ]] ||
    fail "$snippet must contain exactly one force_automate policy"
  [[ $(count_ere "^[[:space:]]*ca[[:space:]]+${ca}[[:space:]]*$" "$snippet") == 1 ]] ||
    fail "$snippet must select named CA $ca exactly once"
  [[ $(count_ere '^[[:space:]]*lifetime[[:space:]]+120h[[:space:]]*$' "$snippet") == 1 ]] ||
    fail "$snippet must set the 120h leaf lifetime exactly once"
  [[ $(count_ere '^[[:space:]]*tls[[:space:]]+/var/lib/caddy/\.local/share/caddy/certificates/' "$snippet") == 2 ]] ||
    fail "$snippet must synchronously load exactly two origin certificate/key pairs"

  apex_loader="tls /var/lib/caddy/.local/share/caddy/certificates/$ca/$domain/$domain.crt /var/lib/caddy/.local/share/caddy/certificates/$ca/$domain/$domain.key"
  www_loader="tls /var/lib/caddy/.local/share/caddy/certificates/$ca/www.$domain/www.$domain.crt /var/lib/caddy/.local/share/caddy/certificates/$ca/www.$domain/www.$domain.key"
  for loader in "$apex_loader" "$www_loader"; do
    [[ $(grep -Fxc -- $'\t'"$loader" "$snippet" || true) == 1 ]] ||
      fail "$snippet has a missing or malformed manual certificate loader"
    [[ $(grep -Fxc -- $'\t'"$loader" "$canonical" || true) == 1 ]] ||
      fail "$canonical is missing the loader represented by $snippet"
  done
}

for snippet in "${snippets[@]}"; do
  domain=$(basename -- "$snippet" .caddy)
  ca=$astro_ca
  [[ $domain == payrollmiddleast.org ]] && ca=$payroll_ca
  check_site_source "$snippet" "$domain" "$ca"
done
check_site_source "$legacy_evolution" evolutionmiddleast.com "$astro_ca"

printf 'PASS: canonical + %d active .caddy snippets + Evolution legacy source use named CAs and paired manual loaders\n' "$expected_site_count"
