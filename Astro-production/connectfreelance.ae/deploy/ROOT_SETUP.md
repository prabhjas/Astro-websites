# Root / ops setup — connectfreelance.ae

App tree: `/opt/Astro-production/connectfreelance.ae`  
Unit name: `connectfreelance` · PORT **5094** · Unix user: **`site-connectfreelance`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (named CA `astro_origin_2026` with its paired manual cert/key loaders, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-connectfreelance
useradd --system --gid site-connectfreelance --home-dir /opt/Astro-production/connectfreelance.ae \
  --shell /usr/sbin/nologin site-connectfreelance
mkdir -p /opt/Astro-production/connectfreelance.ae/.data /var/connectfreelance/enhanced-live
chown -R site-connectfreelance:site-connectfreelance \
  /opt/Astro-production/connectfreelance.ae/.data /var/connectfreelance/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectfreelance` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-connectfreelance /opt/Astro-production/connectfreelance.ae/.env.prod
chmod 640 /opt/Astro-production/connectfreelance.ae/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/connectfreelance.ae/deploy/connectfreelance.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectfreelance
systemctl show connectfreelance -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-connectfreelance`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

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
pnpm --filter connectfreelance-ae-astro run build
sudo site-ctl restart connectfreelance
curl -sS http://127.0.0.1:5094/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
