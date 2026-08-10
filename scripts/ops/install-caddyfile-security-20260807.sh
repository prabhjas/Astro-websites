#!/usr/bin/env bash
# Install staged security Caddyfile and reload (ROOT on Astro host).
#
# Staging file (already uploaded by engineering):
#   /opt/Astro-production/_incoming/Caddyfile.production.20260807-security
#
# Usage:
#   sudo bash install-caddyfile-security-20260807.sh

set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "must run as root"; exit 1; }

SRC=/opt/Astro-production/_incoming/Caddyfile.production.20260807-security
DST=/etc/caddy/Caddyfile
STAGING=/opt/Astro-production/caddy/Caddyfile.production
BAK="/opt/Astro-production/caddy/Caddyfile.production.bak-$(date +%Y%m%d%H%M%S)"

[[ -f "$SRC" ]] || { echo "missing $SRC"; exit 1; }

cp -a "$STAGING" "$BAK" 2>/dev/null || true
cp -a "$SRC" "$STAGING"
cp -a "$SRC" "$DST"

caddy validate --config "$DST"
systemctl reload caddy
systemctl is-active caddy

echo "Caddy reloaded. Spot-check headers:"
echo "  curl -sSI https://connectgroup.co/ | grep -iE 'content-security-policy|permissions-policy|strict-transport'"
