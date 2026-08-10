# Root / ops setup — alburaq.ae

App tree: `/opt/Astro-production/alburaq.ae`  
Unit name: `alburaq` · PORT **5120** · Unix user: **`site-alburaq`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-alburaq
useradd --system --gid site-alburaq --home-dir /opt/Astro-production/alburaq.ae \
  --shell /usr/sbin/nologin site-alburaq
mkdir -p /opt/Astro-production/alburaq.ae/.data /var/alburaq/enhanced-live
chown -R site-alburaq:site-alburaq \
  /opt/Astro-production/alburaq.ae/.data /var/alburaq/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-alburaq` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-alburaq /opt/Astro-production/alburaq.ae/.env.prod
chmod 640 /opt/Astro-production/alburaq.ae/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/alburaq.ae/deploy/alburaq.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now alburaq
systemctl show alburaq -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-alburaq`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
cp deploy/alburaq.ae.caddy /etc/caddy/sites.d/
# Main Caddyfile: import /etc/caddy/sites.d/*.caddy
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter alburaq-astro run build
sudo site-ctl restart alburaq
curl -sS http://127.0.0.1:5120/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
