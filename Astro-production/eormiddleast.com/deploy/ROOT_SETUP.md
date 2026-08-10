# Root setup for eormiddleast.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/eormiddleast.com`  
Unit name: `eormiddleast` · Port: **5090** · Unix user: **`site-eormiddleast`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/eormiddleast.com --shell /usr/sbin/nologin site-eormiddleast
mkdir -p /opt/Astro-production/eormiddleast.com/.data
chown -R site-eormiddleast:site-eormiddleast /opt/Astro-production/eormiddleast.com/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-eormiddleast` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/eormiddleast.com/deploy/eormiddleast.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now eormiddleast
systemctl show eormiddleast -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental eormiddleast"
```

## 5. Caddy

```bash
mkdir -p /var/log/caddy
# Prefer merging into the fleet single-file Caddyfile (git: caddy/Caddyfile.production)
# which includes eormiddleast.com @ 5090 + one-hop www→apex HTTP redirect.
# Or copy the site-local template:
# Merge this deploy block into caddy/Caddyfile.production and the reviewed
# single /etc/caddy/Caddyfile; do not install files under sites.d.
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use production peer pattern (bare hosts + named CA `astro_origin_2026` with its paired manual cert/key loaders + `@noncanonical` + HSTS) — see `docs/CONNECT-CADDY-DEPLOYMENT.md`. Cloudflare SSL = **Full** (not Flexible).

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter eormiddleast-astro run build
sudo site-ctl restart eormiddleast
curl -sS http://127.0.0.1:5090/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
