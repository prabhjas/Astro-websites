# Root setup for spheavyrental.ae (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/spheavyrental.ae`  
Unit name: `spheavyrental` · Port: **5082** · Unix user: **`site-spheavyrental`**

Full host checklist: repo `docs/18-server-ops-only.md`.

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/spheavyrental.ae --shell /usr/sbin/nologin site-spheavyrental
mkdir -p /opt/Astro-production/spheavyrental.ae/.data
chown -R site-spheavyrental:site-spheavyrental /opt/Astro-production/spheavyrental.ae/.data
```

## 2. Systemd (Tier 1)

```bash
cp /opt/Astro-production/spheavyrental.ae/deploy/spheavyrental.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now spheavyrental
systemctl show spheavyrental -p User,MemoryMax,ExecStart
```

## 3. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental"
```

## 4. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/spheavyrental.ae/deploy/spheavyrental.ae.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

## 5. Deploy loop

```bash
cd /opt/Astro-production/spheavyrental.ae
pnpm install && pnpm run build
sudo site-ctl restart spheavyrental
curl -sS http://127.0.0.1:5082/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
