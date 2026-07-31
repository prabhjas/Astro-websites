#!/usr/bin/env bash
# Pull Iberia server .env → local gitignored .env (no secrets printed).
# DEFERRED: server file is root:root 600 — leave until ops unlocks (see docs/server-ops-only.md).
# Prefers .env.prod if readable; falls back to .env.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/Astro-production/iberiaworkforce.com/.env"
REMOTE_DIR=/opt/Astro-production/iberiaworkforce.com
SSH_HOST=astro-connectgroup

pick=""
for f in .env.prod .env; do
  if ssh -o BatchMode=yes "$SSH_HOST" "test -r $REMOTE_DIR/$f"; then
    pick=$f
    break
  fi
done

if [[ -z "$pick" ]]; then
  cat >&2 <<'EOF'
DEFERRED — Cannot read Iberia env on server (root:root mode 600).

Leave for later. Local Iberia still runs with fleet-local placeholders
(node scripts/fleet-local.mjs up iberiaworkforce) for non-Pipedrive smoke.

When ops is ready, ONCE on Astro as root:

  sudo cp /opt/Astro-production/iberiaworkforce.com/.env \
    /opt/Astro-production/iberiaworkforce.com/.env.prod
  sudo chown site-iberiaworkforce:site-iberiaworkforce \
    /opt/Astro-production/iberiaworkforce.com/.env.prod
  sudo chmod 600 /opt/Astro-production/iberiaworkforce.com/.env.prod

Then re-run: bash scripts/pull-iberia-env.sh
EOF
  exit 1
fi

scp -q "$SSH_HOST:$REMOTE_DIR/$pick" "$DEST"
chmod 600 "$DEST"

if grep -q '^PUBLIC_SITE_URL=' "$DEST"; then
  sed -i.bak 's|^PUBLIC_SITE_URL=.*|PUBLIC_SITE_URL=http://127.0.0.1:5083|' "$DEST" && rm -f "$DEST.bak"
else
  printf '\nPUBLIC_SITE_URL=http://127.0.0.1:5083\n' >> "$DEST"
fi

if ! grep -q '^INTERNAL_JOB_SECRET=.\+' "$DEST"; then
  printf '\nINTERNAL_JOB_SECRET=local-fleet-test-secret\n' >> "$DEST"
fi

echo "Wrote $DEST (from server $pick)."
echo "Keys present:"
grep -E '^[A-Z_][A-Z0-9_]*=' "$DEST" | cut -d= -f1
echo "Secrets not printed. Start Iberia: node scripts/fleet-local.mjs up iberiaworkforce"
