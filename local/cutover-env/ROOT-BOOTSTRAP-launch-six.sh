#!/bin/bash
set -euo pipefail
# Run as root on Astro host (178.105.150.67 / hostname Astro)
# Provisions launch-six Astro units + extends site-ctl + installs Caddyfile.
#
#   sudo bash /home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-launch-six.sh
#
# Prerequisites (developer already staged):
#   /home/webdev/astro-cutover-env/launch-six/<domain>/app/   (dist + node_modules + deploy + .env*)
#   /home/webdev/astro-cutover-env/launch-six/Caddyfile.production

STAGE=/home/webdev/astro-cutover-env/launch-six
PROD=/opt/Astro-production

if [[ ! -d "$STAGE" ]]; then
  echo "ERROR: missing $STAGE" >&2
  exit 1
fi

provision_site() {
  local domain="$1" unit="$2" user="$3" port="$4"
  local src="$STAGE/$domain/app"
  local dest="$PROD/$domain"

  echo "=== provision $domain ($unit / $user / :$port) ==="
  test -f "$src/dist/server/entry.mjs" || { echo "ERROR: missing $src/dist/server/entry.mjs" >&2; exit 1; }
  test -f "$src/.env.prod" || { echo "ERROR: missing $src/.env.prod" >&2; exit 1; }
  test -f "$src/deploy/${unit}.service" || { echo "ERROR: missing deploy/${unit}.service" >&2; exit 1; }

  if ! id "$user" >/dev/null 2>&1; then
    groupadd --system "$user" 2>/dev/null || true
    useradd --system --gid "$user" --home-dir "$dest" \
      --shell /usr/sbin/nologin "$user"
  fi

  mkdir -p "$dest"
  # Make tree writable for rsync, then sync app (preserve existing .data if present)
  chown -R webdev:webdev "$dest" || true
  rsync -a --delete \
    --exclude '.data/' \
    --exclude 'dist.prev-*' \
    --exclude '.env.prod.bak*' \
    "$src/" "$dest/"

  mkdir -p "$dest/.data/leads" "$dest/.data/internal-admin" \
    "$dest/.data/internal-uploads" "$dest/.data/enhanced-live"
  chown -R "$user:$user" "$dest/.data"

  # Build env (public) + runtime secrets
  if [[ -f "$dest/.env" ]]; then
    chown root:webdev "$dest/.env"
    chmod 644 "$dest/.env"
  fi
  chown "root:$user" "$dest/.env.prod"
  chmod 640 "$dest/.env.prod"

  # App code owned by webdev for future deploys; runtime user needs execute/read
  chown -R webdev:webdev "$dest"
  chown -R "$user:$user" "$dest/.data"
  chown "root:$user" "$dest/.env.prod"
  chmod 640 "$dest/.env.prod"
  # Ensure site user can read tree
  chmod -R a+rX "$dest"
  chmod 640 "$dest/.env.prod"

  install -m 644 "$dest/deploy/${unit}.service" "/etc/systemd/system/${unit}.service"
}

# Kill interim nohup Node on launch-six ports (webdev-owned)
for port in 5084 5087 5088 5089 5096 5097; do
  pids=$(ss -lntp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)
  for pid in $pids; do
    if [[ -n "$pid" ]]; then
      echo "stopping interim pid $pid on :$port"
      kill "$pid" 2>/dev/null || true
    fi
  done
done
sleep 1

provision_site connecthr.ae connecthr site-connecthr 5084
provision_site connectfm.ae connectfm site-connectfm 5087
provision_site connectresources.sa connectresources-sa site-connectresources-sa 5088
provision_site iberiaeor.com iberiaeor site-iberiaeor 5089
provision_site connectfz.com connectfz site-connectfz 5096
provision_site royalvisa.ae royalvisa site-royalvisa 5097

# site-ctl allowlist — existing nine + launch six
SITE_CTL=/usr/local/sbin/site-ctl
if [[ -f "$SITE_CTL" ]] && grep -q 'ALLOWED=' "$SITE_CTL"; then
  sed -i 's/^ALLOWED=.*/ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental connecthr connectgroup connectfm connectresources-sa iberiaeor eormiddleast connectstaff cuae kinzahr connectfz royalvisa"/' "$SITE_CTL"
  echo "updated site-ctl ALLOWED:"
  grep '^ALLOWED=' "$SITE_CTL"
fi

systemctl daemon-reload
systemctl enable --now connecthr connectfm connectresources-sa iberiaeor connectfz royalvisa
systemctl restart connecthr connectfm connectresources-sa iberiaeor connectfz royalvisa

# Caddy — full production file including launch six
mkdir -p /var/log/caddy /etc/caddy
chown caddy:caddy /var/log/caddy 2>/dev/null || true
if [[ -f "$STAGE/Caddyfile.production" ]]; then
  cp "$STAGE/Caddyfile.production" /etc/caddy/Caddyfile
else
  echo "ERROR: Caddyfile.production not found in staging" >&2
  exit 1
fi

sudo -u caddy caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

echo '=== unit status ==='
systemctl --no-pager --full is-active \
  connecthr connectfm connectresources-sa iberiaeor connectfz royalvisa || true

echo '=== loopback health ==='
for pair in hr:5084 fm:5087 sa:5088 iberiaeor:5089 fz:5096 royal:5097; do
  name="${pair%%:*}"; port="${pair##*:}"
  code=$(curl -sS -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/api/health/" || echo err)
  echo "$name :$port → $code"
done

echo 'ROOT BOOTSTRAP LAUNCH-SIX COMPLETE'
echo 'Next: Cloudflare DNS → 178.105.150.67, SSL Full; verify public hosts.'
