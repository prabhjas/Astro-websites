# Root setup for raadrecruitment.ae (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/raadrecruitment.ae`  
Unit name: `raadrecruitment` · Port: **5113** · Unix user: **`site-raadrecruitment`**

Full host checklist: repo `docs/server-ops-only.md`.

**Go-live gate:** unit + Caddy on this host are ready, but public DNS may still point at WordPress. Cloudflare must point apex (+ `www`) at `178.105.150.67` with SSL **Full** (not Full strict).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/raadrecruitment.ae --shell /usr/sbin/nologin site-raadrecruitment
mkdir -p /opt/Astro-production/raadrecruitment.ae/.data
chown -R site-raadrecruitment:site-raadrecruitment /opt/Astro-production/raadrecruitment.ae/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-raadrecruitment` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL=https://raadrecruitment.ae` (no secrets). |

Generate a **unique** machine secret (never reuse across domains):

```bash
openssl rand -hex 32
# → INTERNAL_JOB_SECRET=<value> in .env.prod only (LF line endings)
```

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/raadrecruitment.ae/deploy/raadrecruitment.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now raadrecruitment
systemctl show raadrecruitment -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental raadrecruitment"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
# Prefer merging into the fleet single-file Caddyfile (git: caddy/Caddyfile.production)
# which includes raadrecruitment.ae @ 5113 + one-hop www→apex HTTP redirect.
# Or copy the site-local template:
cp /opt/Astro-production/raadrecruitment.ae/deploy/raadrecruitment.ae.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use production peer pattern (bare hosts + `tls internal` + `@noncanonical` + HSTS) — see `docs/CONNECT-CADDY-DEPLOYMENT.md`. Cloudflare SSL = **Full** (not Flexible).

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter raadrecruitment-astro run build
sudo site-ctl restart raadrecruitment
curl -sS http://127.0.0.1:5113/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
