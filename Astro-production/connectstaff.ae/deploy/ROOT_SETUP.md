# Root / ops setup — connectstaff.ae

App tree: `/opt/Astro-production/connectstaff.ae`  
Unit name: `connectstaff` · PORT **5091** · Unix user: **`site-connectstaff`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Use the complete bare-host production block with named CA `astro_origin_2026` and both manual certificate loaders. Cloudflare SSL must remain **Full**; do not use Flexible.

## 1. Site unix user

```bash
groupadd --system site-connectstaff
useradd --system --gid site-connectstaff --home-dir /opt/Astro-production/connectstaff.ae \
  --shell /usr/sbin/nologin site-connectstaff
mkdir -p /opt/Astro-production/connectstaff.ae/.data /var/connectstaff/enhanced-live
chown -R site-connectstaff:site-connectstaff \
  /opt/Astro-production/connectstaff.ae/.data /var/connectstaff/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectstaff` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-connectstaff /opt/Astro-production/connectstaff.ae/.env.prod
chmod 640 /opt/Astro-production/connectstaff.ae/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/connectstaff.ae/deploy/connectstaff.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectstaff
systemctl show connectstaff -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-connectstaff`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

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
pnpm --filter connectstaff-astro run build
sudo site-ctl restart connectstaff
curl -sS http://127.0.0.1:5091/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
