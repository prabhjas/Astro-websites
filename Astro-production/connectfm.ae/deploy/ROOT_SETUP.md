# Root setup for connectfm.ae (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/connectfm.ae`
Unit name: `connectfm` · Port: **5087** · Unix user: **`site-connectfm`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at the Astro host with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/connectfm.ae --shell /usr/sbin/nologin site-connectfm
mkdir -p /opt/Astro-production/connectfm.ae/.data
chown -R site-connectfm:site-connectfm /opt/Astro-production/connectfm.ae/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectfm` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/connectfm.ae/deploy/connectfm.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectfm
systemctl show connectfm -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental eormiddleast connectfm"
```

## 5. Caddy

```bash
mkdir -p /var/log/caddy
# Prefer merging deploy/connectfm.ae.caddy into the fleet Caddyfile.production
# (one-hop HTTP + hardened site block). production has no sites.d import.
# Merge this deploy block into caddy/Caddyfile.production and the reviewed
# single /etc/caddy/Caddyfile; do not install files under sites.d.
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use the complete bare-host production block with named CA `astro_origin_2026` and both manual certificate loaders. Cloudflare SSL must remain **Full**; do not use Flexible.
Match `PUBLIC_SITE_URL=https://connectfm.ae`. Cloudflare SSL = **Full**.

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter connectfm-astro run build
sudo site-ctl restart connectfm
curl -sS http://127.0.0.1:5087/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
