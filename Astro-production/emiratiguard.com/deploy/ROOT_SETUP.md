# Root setup for emiratiguard.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/emiratiguard.com`  
Unit name: `emiratiguard` · Port: **5103** · Unix user: **`site-emiratiguard`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at the Astro host with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/emiratiguard.com --shell /usr/sbin/nologin site-emiratiguard
mkdir -p /opt/Astro-production/emiratiguard.com/.data
chown -R site-emiratiguard:site-emiratiguard /opt/Astro-production/emiratiguard.com/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-emiratiguard` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL=https://emiratiguard.com` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/emiratiguard.com/deploy/emiratiguard.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now emiratiguard
systemctl show emiratiguard -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental eormiddleast emiratiguard"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
# Prefer merging deploy/emiratiguard.com.caddy into the fleet Caddyfile.production
# (one-hop HTTP + hardened site block). Or copy to sites.d if that layout is used.
cp /opt/Astro-production/emiratiguard.com/deploy/emiratiguard.com.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use the hardened bare-host + `tls internal` template (`@noncanonical` www→apex, HSTS, static cache) — **not** mixed http+https in one block (CF Flexible redirect loop).
Match `PUBLIC_SITE_URL=https://emiratiguard.com`. Cloudflare SSL = **Full**.

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter emiratiguard-astro run build
sudo site-ctl restart emiratiguard
curl -sS http://127.0.0.1:5103/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
