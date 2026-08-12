# Root setup for mbs-consultancy.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/mbs-consultancy.com`  
Unit name: `mbs-consultancy` · Port: **5099** · Unix user: **`site-mbs-consultancy`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/mbs-consultancy.com --shell /usr/sbin/nologin site-mbs-consultancy
mkdir -p /opt/Astro-production/mbs-consultancy.com/.data
chown -R site-mbs-consultancy:site-mbs-consultancy /opt/Astro-production/mbs-consultancy.com/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-mbs-consultancy` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/mbs-consultancy.com/deploy/mbs-consultancy.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now mbs-consultancy
systemctl show mbs-consultancy -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental mbs-consultancy"
```

## 5. Caddy

```bash
# Merge mbs-consultancy.com.caddy into caddy/Caddyfile.production and the
# reviewed root-owned single /etc/caddy/Caddyfile. Never install fragments.
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use bare hosts, named CA `astro_origin_2026`, both manual certificate loaders
and the canonical redirect. Cloudflare SSL remains **Full**; never use Flexible.

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter mbs-consultancy-astro run build
sudo site-ctl restart mbs-consultancy
curl -sS http://127.0.0.1:5099/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
