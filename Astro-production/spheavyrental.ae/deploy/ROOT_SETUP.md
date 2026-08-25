# Root setup for spheavyrental.ae (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/spheavyrental.ae`  
Unit name: `spheavyrental` · Port: **5082** · Unix user: **`site-spheavyrental`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/spheavyrental.ae --shell /usr/sbin/nologin site-spheavyrental
mkdir -p /opt/Astro-production/spheavyrental.ae/.data
chown -R site-spheavyrental:site-spheavyrental /opt/Astro-production/spheavyrental.ae/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-spheavyrental` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/spheavyrental.ae/deploy/spheavyrental.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now spheavyrental
systemctl show spheavyrental -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental"
```

## 5. Caddy

```bash
mkdir -p /var/log/caddy
# Merge this deploy block into caddy/Caddyfile.production and the reviewed
# single /etc/caddy/Caddyfile; do not install files under sites.d.
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use the complete bare-host production block with named CA `astro_origin_2026` and both manual certificate loaders. Cloudflare SSL must remain **Full**; do not use Flexible.

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter spheavy-rental run build
sudo site-ctl restart spheavyrental
curl -sS http://127.0.0.1:5082/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
