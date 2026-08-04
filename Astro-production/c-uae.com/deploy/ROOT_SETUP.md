# Root setup for c-uae.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/c-uae.com`  
Unit name: `cuae` · Port: **5092** · Unix user: **`site-cuae`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at the Astro host with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/c-uae.com --shell /usr/sbin/nologin site-cuae
mkdir -p /opt/Astro-production/c-uae.com/.data
chown -R site-cuae:site-cuae /opt/Astro-production/c-uae.com/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-cuae` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/c-uae.com/deploy/cuae.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cuae
systemctl show cuae -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental eormiddleast cuae"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/c-uae.com/deploy/c-uae.com.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use `http://`+`https://`+`tls internal` template — **not** bare hostnames (CF Flexible redirect loop).

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter cuae-astro run build
sudo site-ctl restart cuae
curl -sS http://127.0.0.1:5092/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
