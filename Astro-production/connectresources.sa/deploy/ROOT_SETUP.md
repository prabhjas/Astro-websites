# Root / ops setup — connectresources.sa

App tree: `/opt/Astro-production/connectresources.sa`  
Unit name: `connectresources-sa` · PORT **5088** · Unix user: **`site-connectresources-sa`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (named CA `astro_origin_2026` with its paired manual cert/key loaders, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-connectresources-sa
useradd --system --gid site-connectresources-sa --home-dir /opt/Astro-production/connectresources.sa \
  --shell /usr/sbin/nologin site-connectresources-sa
mkdir -p /opt/Astro-production/connectresources.sa/.data /var/connectresources-sa/enhanced-live
chown -R site-connectresources-sa:site-connectresources-sa \
  /opt/Astro-production/connectresources.sa/.data /var/connectresources-sa/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectresources-sa` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-connectresources-sa /opt/Astro-production/connectresources.sa/.env.prod
chmod 640 /opt/Astro-production/connectresources.sa/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/connectresources.sa/deploy/connectresources-sa.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectresources-sa
systemctl show connectresources-sa -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-connectresources-sa`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

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
pnpm --filter connectresources-sa-astro run build
sudo site-ctl restart connectresources-sa
curl -sS http://127.0.0.1:5088/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
