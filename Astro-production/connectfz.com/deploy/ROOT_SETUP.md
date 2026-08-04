# Root setup for connectfz.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/connectfz.com`  
Unit name: `connectfz` · Port: **5096** · Unix user: **`site-connectfz`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/connectfz.com --shell /usr/sbin/nologin site-connectfz
mkdir -p /opt/Astro-production/connectfz.com/.data
chown -R site-connectfz:site-connectfz /opt/Astro-production/connectfz.com/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectfz` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL=https://connectfz.com` (no secrets). |

Generate a **unique** machine secret (never reuse across domains):

```bash
openssl rand -hex 32
# → INTERNAL_JOB_SECRET=<value> in .env.prod only (LF line endings)
```

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/connectfz.com/deploy/connectfz.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectfz
systemctl show connectfz -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental connectfz"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
# Prefer merging into the fleet single-file Caddyfile (git: caddy/Caddyfile.production)
# which includes connectfz.com @ 5096 + one-hop www→apex HTTP redirect.
# Or copy the site-local template:
cp /opt/Astro-production/connectfz.com/deploy/connectfz.com.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use production peer pattern (bare hosts + `tls internal` + `@noncanonical` + HSTS) — see `docs/CONNECT-CADDY-DEPLOYMENT.md`. Cloudflare SSL = **Full** (not Flexible).

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter connectfz-astro run build
sudo site-ctl restart connectfz
curl -sS http://127.0.0.1:5096/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
