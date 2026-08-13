#!/usr/bin/env bash
# Hit Kinza enhanced conversion jobs (Node) with Bearer auth.
#
# Default (timer + usual manual): last 2 days — no date query.
# Dated hit (when you name a day or range):
#   DATE=2026-08-06 ./scripts/run-enhanced-jobs.sh
#   FROM_DATE=2026-08-06 TO_DATE=2026-08-10 ./scripts/run-enhanced-jobs.sh
#   ./scripts/run-enhanced-jobs.sh --date 2026-08-06
#   ./scripts/run-enhanced-jobs.sh --from 2026-08-06 --to 2026-08-10
#
# Local:
#   BASE_URL=http://127.0.0.1:5093 ./scripts/run-enhanced-jobs.sh
# Production loopback (public https://kinzahr.com/enhanced is 401):
#   BASE_URL=http://127.0.0.1:15093 HOST_HEADER=kinzahr.com ./scripts/run-enhanced-jobs.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage: run-enhanced-jobs.sh [options]

  (no dates)              last 2 days — same as the 12h timer / usual manual hit
  --date YYYY-MM-DD       that calendar day only
  --from YYYY-MM-DD       range start (with --to, or through today)
  --to YYYY-MM-DD         range end (alone = that day only)

Env aliases: DATE, FROM_DATE / START, TO_DATE / END
Auth: ENHANCED_RUN_SECRET (or INTERNAL_JOB_SECRET, or kinzahr.com/.env)
EOF
}

DATE="${DATE:-}"
FROM_DATE="${FROM_DATE:-${START:-}}"
TO_DATE="${TO_DATE:-${END:-}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --date|--day)
      DATE="${2:-}"
      shift 2
      ;;
    --from|--start)
      FROM_DATE="${2:-}"
      shift 2
      ;;
    --to|--end)
      TO_DATE="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

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

valid_iso() {
  [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
}

SECRET="${ENHANCED_RUN_SECRET:-${INTERNAL_JOB_SECRET:-}}"
if [[ -z "$SECRET" ]]; then
  SECRET="$(read_env ENHANCED_RUN_SECRET || true)"
fi
if [[ -z "$SECRET" ]]; then
  SECRET="$(read_env INTERNAL_JOB_SECRET || true)"
fi

BASE_URL="${BASE_URL:-https://kinzahr.com}"
HOST_HEADER="${HOST_HEADER:-}"

# Public https://kinzahr.com/enhanced is 401 (frontend split). Hit the trusted backend instead.
if [[ "${BASE_URL%/}" == "https://kinzahr.com" || "${BASE_URL%/}" == "http://kinzahr.com" ]]; then
  BASE_URL="http://127.0.0.1:15093"
  HOST_HEADER="${HOST_HEADER:-kinzahr.com}"
fi

if [[ -z "$SECRET" ]]; then
  echo "ENHANCED_RUN_SECRET (or INTERNAL_JOB_SECRET) is required" >&2
  exit 1
fi

QS=""
if [[ -n "$DATE" ]]; then
  if ! valid_iso "$DATE"; then
    echo "DATE must be YYYY-MM-DD (got: ${DATE})" >&2
    exit 1
  fi
  QS="?date=${DATE}"
  echo "Enhanced jobs: single day ${DATE} on ${BASE_URL}"
elif [[ -n "$FROM_DATE" || -n "$TO_DATE" ]]; then
  if [[ -n "$FROM_DATE" ]] && ! valid_iso "$FROM_DATE"; then
    echo "FROM_DATE must be YYYY-MM-DD (got: ${FROM_DATE})" >&2
    exit 1
  fi
  if [[ -n "$TO_DATE" ]] && ! valid_iso "$TO_DATE"; then
    echo "TO_DATE must be YYYY-MM-DD (got: ${TO_DATE})" >&2
    exit 1
  fi
  if [[ -n "$FROM_DATE" && -n "$TO_DATE" ]]; then
    QS="?start=${FROM_DATE}&end=${TO_DATE}"
    echo "Enhanced jobs: ${FROM_DATE} → ${TO_DATE} on ${BASE_URL}"
  elif [[ -n "$FROM_DATE" ]]; then
    QS="?start=${FROM_DATE}"
    echo "Enhanced jobs: ${FROM_DATE} → today on ${BASE_URL}"
  else
    QS="?date=${TO_DATE}"
    echo "Enhanced jobs: single day ${TO_DATE} on ${BASE_URL}"
  fi
else
  echo "Enhanced jobs: default last 2 days on ${BASE_URL}"
fi
echo

JOBS=(
  kinzahr.php
  cfm.php
  chr.php
  ib.php
  cr.php
  crb2b.php
  # crnew.php / crb2bnew.php are aliases of cr.php / crb2b.php (same 2-day window)
)

CURL_HOST=()
if [[ -n "$HOST_HEADER" ]]; then
  CURL_HOST=(-H "Host: ${HOST_HEADER}")
fi

fail=0
for job in "${JOBS[@]}"; do
  if [[ -n "$QS" ]]; then
    url="${BASE_URL%/}/enhanced/job/?file=${job}&${QS#?}"
  else
    url="${BASE_URL%/}/enhanced/job/?file=${job}"
  fi
  out="/tmp/enhanced-${job}.out"
  echo "==> GET ${url}"
  code=$(curl -sS -o "$out" -w "%{http_code}" \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Accept: text/html" \
    "${CURL_HOST[@]}" \
    --max-time 600 \
    "$url" || true)
  echo "    HTTP ${code}"
  if [[ "$code" != "200" ]]; then
    echo "    FAILED (see ${out})" >&2
    fail=1
    continue
  fi
  grep -E 'Window:|BACKFILL|Default last|Final leads queued|Leads sent:' "$out" 2>/dev/null | head -8 | sed 's/^/    /' || true
done

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All enhanced jobs completed (HTTP 200)."
else
  echo "One or more jobs failed." >&2
fi
exit "$fail"
