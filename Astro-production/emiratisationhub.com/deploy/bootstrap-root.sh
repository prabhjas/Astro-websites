#!/bin/bash
# Run as root on Astro host after webdev has synced /opt/Astro-production/emiratisationhub.com
set -euo pipefail

SITE_ROOT=/opt/Astro-production/emiratisationhub.com
UNIT=emiratisationhub
USER_NAME=site-emiratisationhub
PORT=5107
STAGED_ENV="${SITE_ROOT}/.env.prod.staged"
CTL=/usr/local/sbin/site-ctl

if [[ $(id -u) -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

id -u "$USER_NAME" >/dev/null 2>&1 || useradd --system --home-dir "$SITE_ROOT" --shell /usr/sbin/nologin "$USER_NAME"

install -d -o "$USER_NAME" -g "$USER_NAME" -m 750 "$SITE_ROOT/.data"
install -d -o "$USER_NAME" -g "$USER_NAME" -m 750 "$SITE_ROOT/.data/leads"
install -d -o "$USER_NAME" -g "$USER_NAME" -m 750 "$SITE_ROOT/.data/internal-admin"

# Build .env (non-secret)
if [[ ! -f "$SITE_ROOT/.env" ]]; then
  printf 'PUBLIC_SITE_URL=https://emiratisationhub.com\n' > "$SITE_ROOT/.env"
fi
chown root:webdev "$SITE_ROOT/.env"
chmod 644 "$SITE_ROOT/.env"

# Runtime secrets
if [[ -f "$STAGED_ENV" ]]; then
  install -o root -g "$USER_NAME" -m 640 "$STAGED_ENV" "$SITE_ROOT/.env.prod"
  shred -u "$STAGED_ENV" 2>/dev/null || rm -f "$STAGED_ENV"
elif [[ ! -f "$SITE_ROOT/.env.prod" ]]; then
  echo "Missing $STAGED_ENV and $SITE_ROOT/.env.prod — create .env.prod before enabling the unit." >&2
  exit 1
else
  chown root:"$USER_NAME" "$SITE_ROOT/.env.prod"
  chmod 640 "$SITE_ROOT/.env.prod"
fi

install -o root -g root -m 644 "$SITE_ROOT/deploy/emiratisationhub.service" /etc/systemd/system/emiratisationhub.service
install -o root -g root -m 644 "$SITE_ROOT/deploy/emiratisationhub.com.caddy" /etc/caddy/sites.d/emiratisationhub.com.caddy

# Allow webdev restarts
if [[ -f "$CTL" ]] && ! grep -q 'emiratisationhub' "$CTL"; then
  sed -i 's/ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental"/ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental emiratisationhub"/' "$CTL"
fi

systemctl daemon-reload
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl enable --now emiratisationhub.service
systemctl status emiratisationhub.service --no-pager --lines=15

echo "Smoke:"
curl -sS -o /dev/null -w "loopback_home:%{http_code}\n" "http://127.0.0.1:${PORT}/" || true
curl -sS "http://127.0.0.1:${PORT}/api/health/" || true
echo
echo "Done. Point Cloudflare origin to this host (Full SSL) if not already."
