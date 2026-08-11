#!/usr/bin/env bash
# RETIRED: this bootstrap installs a per-site Caddy fragment into sites.d, but
# production uses one guarded canonical Caddyfile with C-01 named-CA controls.
# Keeping it executable would allow an old runbook to bypass those controls.

set -euo pipefail

printf '%s\n' \
  'DISABLED: connectgroup bootstrap-root.sh uses the retired sites.d layout.' \
  'Use docs/OPS-OWNER-CADDY-CUTOVER.md and caddy/Caddyfile.production.' >&2
exit 64
