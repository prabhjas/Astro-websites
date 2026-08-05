# Root / ops setup — kinzahr.com

App tree: `/opt/Astro-production/kinzahr.com`  
Unit name: `kinzahr` · PORT **5093** · Unix user: **`site-kinzahr`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-kinzahr
useradd --system --gid site-kinzahr --home-dir /opt/Astro-production/kinzahr.com \
  --shell /usr/sbin/nologin site-kinzahr
mkdir -p /opt/Astro-production/kinzahr.com/.data /var/kinzahr/enhanced-live
chown -R site-kinzahr:site-kinzahr \
  /opt/Astro-production/kinzahr.com/.data /var/kinzahr/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-kinzahr` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-kinzahr /opt/Astro-production/kinzahr.com/.env.prod
chmod 640 /opt/Astro-production/kinzahr.com/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/kinzahr.com/deploy/kinzahr.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kinzahr
systemctl show kinzahr -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-kinzahr`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
cp deploy/kinzahr.com.caddy /etc/caddy/sites.d/
# Main Caddyfile: import /etc/caddy/sites.d/*.caddy
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter kinzahr-astro run build
sudo site-ctl restart kinzahr
curl -sS http://127.0.0.1:5093/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
