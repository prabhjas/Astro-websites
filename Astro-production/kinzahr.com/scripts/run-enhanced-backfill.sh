#!/usr/bin/env bash
# Backfill missed enhanced-conversion runs over a date range (one GET per job).
#
# Usage (local Kinza on :5093):
#   cd Astro-production/kinzahr.com
#   source ../../.env   # optional if ENHANCED_RUN_SECRET already in kinzahr.com/.env
#   FROM_DATE=2026-08-10 TO_DATE=2026-08-12 ./scripts/run-enhanced-backfill.sh
#
# Production:
#   BASE_URL=https://kinzahr.com FROM_DATE=2026-08-10 TO_DATE=2026-08-12 \
#     ENHANCED_RUN_SECRET=… ./scripts/run-enhanced-backfill.sh
#
# Defaults: FROM_DATE=2026-08-10, TO_DATE=today (UTC). Override with env vars.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

read_env() {
  local key="$1"
  local file="$ROOT/.env"
  [[ -f "$file" ]] || return 1
  python3 - "$key" "$file" <<'PY'
import sys
key, path = sys.argv[1], sys.argv[2]
for line in open(path, encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, _, v = line.partition("=")
    if k.strip() == key:
        print(v.strip().strip('"').strip("'"))
        break
PY
}

SECRET="${ENHANCED_RUN_SECRET:-${INTERNAL_JOB_SECRET:-}}"
if [[ -z "$SECRET" ]]; then
  SECRET="$(read_env ENHANCED_RUN_SECRET || true)"
fi
if [[ -z "$SECRET" ]]; then
  SECRET="$(read_env INTERNAL_JOB_SECRET || true)"
fi
FROM_DATE="${FROM_DATE:-2026-08-10}"
TO_DATE="${TO_DATE:-$(date -u +%Y-%m-%d)}"
BASE_URL="${BASE_URL:-http://127.0.0.1:5093}"

if [[ -z "$SECRET" ]]; then
  echo "ENHANCED_RUN_SECRET (or INTERNAL_JOB_SECRET) is required" >&2
  exit 1
fi

if ! [[ "$FROM_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || ! [[ "$TO_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "FROM_DATE and TO_DATE must be YYYY-MM-DD" >&2
  exit 1
fi

JOBS=(
  kinzahr.php
  cfm.php
  chr.php
  ib.php
  cr.php
  crb2b.php
)

echo "Enhanced backfill: ${FROM_DATE} → ${TO_DATE} on ${BASE_URL}"
echo

fail=0
for job in "${JOBS[@]}"; do
  url="${BASE_URL%/}/enhanced/${job}?start=${FROM_DATE}&end=${TO_DATE}"
  out="/tmp/enhanced-backfill-${job}.html"
  echo "==> GET ${url}"
  code=$(curl -sS -o "$out" -w "%{http_code}" \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Accept: text/html" \
    --max-time 600 \
    "$url" || true)
  echo "    HTTP ${code}"
  if [[ "$code" != "200" ]]; then
    echo "    FAILED (see ${out})" >&2
    fail=1
    continue
  fi
  # Show window + lead count from HTML pre blocks
  grep -E 'Window:|BACKFILL|Final leads queued|Leads sent:' "$out" 2>/dev/null | head -6 | sed 's/^/    /' || true
done

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All backfill jobs completed (HTTP 200)."
else
  echo "One or more jobs failed." >&2
fi
exit "$fail"
