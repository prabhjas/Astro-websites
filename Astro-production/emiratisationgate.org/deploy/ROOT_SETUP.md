# Root / ops setup — emiratisationgate.org

App tree: `/opt/Astro-production/emiratisationgate.org`  
Unit name: `emiratisationgate` · PORT **5105** · Unix user: **`site-emiratisationgate`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (named CA `astro_origin_2026` with its paired manual cert/key loaders, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-emiratisationgate
useradd --system --gid site-emiratisationgate --home-dir /opt/Astro-production/emiratisationgate.org \
  --shell /usr/sbin/nologin site-emiratisationgate
mkdir -p /opt/Astro-production/emiratisationgate.org/.data /var/emiratisationgate/enhanced-live
chown -R site-emiratisationgate:site-emiratisationgate \
  /opt/Astro-production/emiratisationgate.org/.data /var/emiratisationgate/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-emiratisationgate` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-emiratisationgate /opt/Astro-production/emiratisationgate.org/.env.prod
chmod 640 /opt/Astro-production/emiratisationgate.org/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/emiratisationgate.org/deploy/emiratisationgate.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now emiratisationgate
systemctl show emiratisationgate -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-emiratisationgate`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

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
pnpm --filter emiratisationgate-astro run build
sudo site-ctl restart emiratisationgate
curl -sS http://127.0.0.1:5105/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
