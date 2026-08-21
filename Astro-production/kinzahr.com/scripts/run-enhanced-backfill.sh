#!/usr/bin/env bash
# Dated enhanced-conversion hit (same as run-enhanced-jobs.sh with DATE / FROM_DATE / TO_DATE).
# Default with no dates: last 2 days (not a hardcoded calendar range).
exec "$(cd "$(dirname "$0")" && pwd)/run-enhanced-jobs.sh" "$@"
