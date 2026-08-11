#!/usr/bin/env bash
# RETIRED: the 2026-08-07 staged file predates the C-01 CA replacement and can
# restore the compromised default local hierarchy. This file is deliberately
# fail-closed so an old runbook or shell history cannot overwrite production.

set -euo pipefail

printf '%s\n' \
  'DISABLED: this installer predates the C-01 named-CA rotation.' \
  'Use caddy/Caddyfile.production and docs/CONNECT-CADDY-DEPLOYMENT.md.' \
  'Do not install _incoming/Caddyfile.production.20260807-security.' >&2
exit 64
