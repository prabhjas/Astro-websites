#!/usr/bin/env bash
# Fail CI if a tracked path or tracked blob looks like private key material.
# Only paths are reported; credential contents are never printed.

set -euo pipefail
export LC_ALL=C

cd -- "$(git rev-parse --show-toplevel)"

declare -a violations=()

while IFS= read -r -d '' path; do
  case "$path" in
    *.key|*/var-lib-caddy/.local/share/caddy/*|*/.local/share/caddy/pki/authorities/*|*/.local/share/caddy/certificates/*)
      violations+=("$path")
      ;;
  esac
done < <(git ls-files -z)

while IFS= read -r path; do
  [[ -n "$path" ]] && violations+=("$path")
done < <(git grep -I -l -E -- '-----BEGIN ([A-Z0-9]+[[:space:]])*PRIVATE KEY-----' -- . || true)

if ((${#violations[@]})); then
  printf 'ERROR: tracked private credential material is forbidden:\n' >&2
  printf '  %s\n' "${violations[@]}" | sort -u >&2
  exit 1
fi

printf 'PASS: no tracked private-key paths, Caddy credential storage, or private-key PEM headers\n'
