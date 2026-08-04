# Root setup for connectresources.ae (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/connectresources.ae`  
Unit name: `connectresources` · Port: **5087** · Unix user: **`site-connectresources`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/connectresources.ae --shell /usr/sbin/nologin site-connectresources
mkdir -p /opt/Astro-production/connectresources.ae/.data
chown -R site-connectresources:site-connectresources /opt/Astro-production/connectresources.ae/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectresources` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/connectresources.ae/deploy/connectresources.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectresources
systemctl show connectresources -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental connectresources"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/connectresources.ae/deploy/connectresources.ae.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use `http://`+`https://`+`tls internal` template — **not** bare hostnames (CF Flexible redirect loop).

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter connectresources-astro run build
sudo site-ctl restart connectresources
curl -sS http://127.0.0.1:5087/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
