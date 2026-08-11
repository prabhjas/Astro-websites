# Root / ops setup — pittant.com

App tree: `/opt/Astro-production/pittant.com`  
Unit name: `pittant` · PORT **5111** · Unix user: **`site-pittant`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (named CA `astro_origin_2026` with its paired manual cert/key loaders, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-pittant
useradd --system --gid site-pittant --home-dir /opt/Astro-production/pittant.com \
  --shell /usr/sbin/nologin site-pittant
mkdir -p /opt/Astro-production/pittant.com/.data /var/pittant/enhanced-live
chown -R site-pittant:site-pittant \
  /opt/Astro-production/pittant.com/.data /var/pittant/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-pittant` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-pittant /opt/Astro-production/pittant.com/.env.prod
chmod 640 /opt/Astro-production/pittant.com/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/pittant.com/deploy/pittant.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now pittant
systemctl show pittant -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-pittant`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
# Merge this deploy block into caddy/Caddyfile.production and the reviewed
# single /etc/caddy/Caddyfile; do not install files under sites.d.
# Production uses one reviewed /etc/caddy/Caddyfile; do not add a sites.d import.
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses named CA `astro_origin_2026` with its paired manual cert/key loaders.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter pittant-astro run build
sudo site-ctl restart pittant
curl -sS http://127.0.0.1:5111/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
