# Root / ops setup — royalvisa.ae

App tree: `/opt/Astro-production/royalvisa.ae`  
Unit name: `royalvisa` · PORT **5097** · Unix user: **`site-royalvisa`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (named CA `astro_origin_2026` with its paired manual cert/key loaders, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-royalvisa
useradd --system --gid site-royalvisa --home-dir /opt/Astro-production/royalvisa.ae \
  --shell /usr/sbin/nologin site-royalvisa
mkdir -p /opt/Astro-production/royalvisa.ae/.data /var/royalvisa/enhanced-live
chown -R site-royalvisa:site-royalvisa \
  /opt/Astro-production/royalvisa.ae/.data /var/royalvisa/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-royalvisa` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-royalvisa /opt/Astro-production/royalvisa.ae/.env.prod
chmod 640 /opt/Astro-production/royalvisa.ae/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/royalvisa.ae/deploy/royalvisa.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now royalvisa
systemctl show royalvisa -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-royalvisa`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

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
pnpm --filter royalvisa-ae-astro run build
sudo site-ctl restart royalvisa
curl -sS http://127.0.0.1:5097/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
