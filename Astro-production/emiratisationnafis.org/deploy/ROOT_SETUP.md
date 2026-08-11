# Root / ops setup — emiratisationnafis.org

App tree: `/opt/Astro-production/emiratisationnafis.org`  
Unit name: `emiratisationnafis` · PORT **5108** · Unix user: **`site-emiratisationnafis`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-emiratisationnafis
useradd --system --gid site-emiratisationnafis --home-dir /opt/Astro-production/emiratisationnafis.org \
  --shell /usr/sbin/nologin site-emiratisationnafis
mkdir -p /opt/Astro-production/emiratisationnafis.org/.data /var/emiratisationnafis/enhanced-live
chown -R site-emiratisationnafis:site-emiratisationnafis \
  /opt/Astro-production/emiratisationnafis.org/.data /var/emiratisationnafis/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-emiratisationnafis` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-emiratisationnafis /opt/Astro-production/emiratisationnafis.org/.env.prod
chmod 640 /opt/Astro-production/emiratisationnafis.org/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/emiratisationnafis.org/deploy/emiratisationnafis.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now emiratisationnafis
systemctl show emiratisationnafis -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-emiratisationnafis`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
cp deploy/emiratisationnafis.org.caddy /etc/caddy/sites.d/
# Main Caddyfile: import /etc/caddy/sites.d/*.caddy
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter emiratisationnafis-astro run build
sudo site-ctl restart emiratisationnafis
curl -sS http://127.0.0.1:5108/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
