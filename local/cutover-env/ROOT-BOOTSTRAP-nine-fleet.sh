#!/bin/bash
set -euo pipefail
# Run as root on Astro host (178.105.150.67 / hostname Astro)
# Provisions EOR + Connect Staff + C-UAE + KinzaHR, updates site-ctl + Caddy.
#
#   sudo bash /home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-nine-fleet.sh

provision_site() {
  local domain="$1" unit="$2" user="$3" port="$4" extra_rw="${5:-}"
  echo "=== provision $domain ($unit / $user / :$port) ==="
  if ! id "$user" >/dev/null 2>&1; then
    groupadd --system "$user" 2>/dev/null || true
    useradd --system --gid "$user" --home-dir "/opt/Astro-production/$domain" \
      --shell /usr/sbin/nologin "$user"
  fi
  mkdir -p "/opt/Astro-production/$domain/.data"
  if [[ -n "$extra_rw" ]]; then
    # shellcheck disable=SC2086
    mkdir -p $extra_rw
    # shellcheck disable=SC2086
    chown -R "$user:$user" $extra_rw
  fi
  chown -R "$user:$user" "/opt/Astro-production/$domain/.data"

  if [[ -f "/opt/Astro-production/$domain/.env" ]]; then
    chown root:webdev "/opt/Astro-production/$domain/.env"
    chmod 644 "/opt/Astro-production/$domain/.env"
  fi
  if [[ -f "/opt/Astro-production/$domain/.env.prod" ]]; then
    chown "root:$user" "/opt/Astro-production/$domain/.env.prod"
    chmod 640 "/opt/Astro-production/$domain/.env.prod"
  else
    echo "ERROR: missing /opt/Astro-production/$domain/.env.prod" >&2
    exit 1
  fi

  if [[ ! -f "/opt/Astro-production/$domain/deploy/${unit}.service" ]]; then
    echo "ERROR: missing unit template deploy/${unit}.service" >&2
    exit 1
  fi
  install -m 644 "/opt/Astro-production/$domain/deploy/${unit}.service" \
    "/etc/systemd/system/${unit}.service"
}

# Kill interim nohup Node processes on cutover ports (webdev owned)
for port in 5090 5091 5092 5093; do
  pids=$(ss -lntp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)
  for pid in $pids; do
    if [[ -n "$pid" ]]; then
      echo "stopping interim pid $pid on :$port"
      kill "$pid" 2>/dev/null || true
    fi
  done
done
sleep 1

provision_site eormiddleast.com eormiddleast site-eormiddleast 5090
provision_site connectstaff.ae connectstaff site-connectstaff 5091 "/var/connectstaff/enhanced-live"
provision_site c-uae.com cuae site-cuae 5092
provision_site kinzahr.com kinzahr site-kinzahr 5093 "/var/kinzahr/enhanced-live"

# site-ctl allowlist — nine cutover sites
SITE_CTL=/usr/local/sbin/site-ctl
if [[ -f "$SITE_CTL" ]] && grep -q 'ALLOWED=' "$SITE_CTL"; then
  sed -i 's/^ALLOWED=.*/ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental connectgroup eormiddleast connectstaff cuae kinzahr"/' "$SITE_CTL"
  echo "updated site-ctl ALLOWED:"
  grep '^ALLOWED=' "$SITE_CTL"
fi

systemctl daemon-reload
systemctl enable --now eormiddleast connectstaff cuae kinzahr
systemctl restart eormiddleast connectstaff cuae kinzahr

# Caddy — slim nine-site production file
mkdir -p /var/log/caddy /etc/caddy
chown caddy:caddy /var/log/caddy 2>/dev/null || true
if [[ -f /home/webdev/astro-cutover-env/Caddyfile.production ]]; then
  cp /home/webdev/astro-cutover-env/Caddyfile.production /etc/caddy/Caddyfile
elif [[ -f /opt/Astro-production/caddy/Caddyfile.production ]]; then
  cp /opt/Astro-production/caddy/Caddyfile.production /etc/caddy/Caddyfile
else
  echo "ERROR: Caddyfile.production not found" >&2
  exit 1
fi

sudo -u caddy caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

echo '=== unit status ==='
systemctl --no-pager --full is-active eormiddleast connectstaff cuae kinzahr || true

echo '=== loopback health ==='
for pair in eor:5090 staff:5091 cuae:5092 kinza:5093; do
  name="${pair%%:*}"; port="${pair##*:}"
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/api/health/" || echo err)
  echo "$name :$port → $code"
done

echo 'ROOT BOOTSTRAP COMPLETE'
