# Root setup for iberiaeor.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/iberiaeor.com`  
Unit name: `iberiaeor` · Port: **5089** · Unix user: **`site-iberiaeor`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/iberiaeor.com --shell /usr/sbin/nologin site-iberiaeor
mkdir -p /opt/Astro-production/iberiaeor.com/.data
chown -R site-iberiaeor:site-iberiaeor /opt/Astro-production/iberiaeor.com/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-iberiaeor` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/iberiaeor.com/deploy/iberiaeor.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iberiaeor
systemctl show iberiaeor -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental iberiaeor"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
# Prefer merging into the fleet single-file Caddyfile (git: caddy/Caddyfile.production)
# which includes iberiaeor.com @ 5089 + one-hop www→apex HTTP redirect.
# Or copy the site-local template:
cp /opt/Astro-production/iberiaeor.com/deploy/iberiaeor.com.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use production peer pattern (bare hosts + `tls internal` + `@noncanonical` + HSTS) — see `docs/CONNECT-CADDY-DEPLOYMENT.md`. Cloudflare SSL = **Full** (not Flexible).

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter iberiaeor-astro run build
sudo site-ctl restart iberiaeor
curl -sS http://127.0.0.1:5089/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
