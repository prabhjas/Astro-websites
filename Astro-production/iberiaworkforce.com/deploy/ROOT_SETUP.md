# Root setup for iberiaworkforce.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/iberiaworkforce.com`  
Unit name: `iberiaworkforce` · Port: **5083** · Unix user: **`site-iberiaworkforce`**

Full host checklist: repo `docs/18-server-ops-only.md`.

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/iberiaworkforce.com --shell /usr/sbin/nologin site-iberiaworkforce
mkdir -p /opt/Astro-production/iberiaworkforce.com/.data
chown -R site-iberiaworkforce:site-iberiaworkforce /opt/Astro-production/iberiaworkforce.com/.data
# .env.prod: mode 600, owned by site user (or readable by it); no HOST/PORT; LF only
```

## 2. Systemd (Tier 1)

```bash
cp /opt/Astro-production/iberiaworkforce.com/deploy/iberiaworkforce.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iberiaworkforce
systemctl show iberiaworkforce -p User,MemoryMax,ExecStart
```

## 3. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental"
```

## 4. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/iberiaworkforce.com/deploy/iberiaworkforce.com.caddy /etc/caddy/sites.d/
# Main Caddyfile must contain: import /etc/caddy/sites.d/*.caddy
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

## 5. Deploy loop (after Tier 1)

```bash
cd /opt/Astro-production/iberiaworkforce.com
# Prefer pnpm from fleet workspace when synced; until then:
pnpm install && pnpm run build   # or: npm ci && npm run build
sudo site-ctl restart iberiaworkforce
curl -sS http://127.0.0.1:5083/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
