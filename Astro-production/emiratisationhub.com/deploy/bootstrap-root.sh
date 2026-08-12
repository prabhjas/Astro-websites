#!/bin/bash
set -euo pipefail

printf '%s\n' \
  'RETIRED: this legacy bootstrap is intentionally disabled.' \
  'Use the root-owned Astro fleet installer and autonomous publisher.' >&2
exit 64
