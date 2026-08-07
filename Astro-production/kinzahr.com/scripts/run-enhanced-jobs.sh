#!/usr/bin/env bash
# Hit Kinza enhanced conversion jobs (Node) with Bearer auth.
# Usage:
#   ENHANCED_RUN_SECRET=... ./scripts/run-enhanced-jobs.sh
#   BASE_URL=http://127.0.0.1:5093 ENHANCED_RUN_SECRET=... ./scripts/run-enhanced-jobs.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://kinzahr.com}"
SECRET="${ENHANCED_RUN_SECRET:-${INTERNAL_JOB_SECRET:-}}"

if [[ -z "$SECRET" ]]; then
  echo "ENHANCED_RUN_SECRET (or INTERNAL_JOB_SECRET) is required" >&2
  exit 1
fi

JOBS=(
  kinzahr.php
  cfm.php
  chr.php
  ib.php
  cr.php
  crb2b.php
  # crnew.php / crb2bnew.php are aliases of cr.php / crb2b.php (same 2-day window)
)

fail=0
for job in "${JOBS[@]}"; do
  url="${BASE_URL%/}/enhanced/${job}"
  echo "==> GET ${url}"
  code=$(curl -sS -o "/tmp/enhanced-${job}.out" -w "%{http_code}" \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Accept: text/html" \
    --max-time 300 \
    "$url" || true)
  echo "    HTTP ${code}"
  if [[ "$code" != "200" ]]; then
    echo "    FAILED (see /tmp/enhanced-${job}.out)" >&2
    fail=1
  fi
done

exit "$fail"
