# Root / ops setup — theuaegate.com

App tree: `/opt/Astro-production/theuaegate.com`  
Unit name: `theuaegate` · PORT **5117** · Unix user: **`site-theuaegate`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-theuaegate
useradd --system --gid site-theuaegate --home-dir /opt/Astro-production/theuaegate.com \
  --shell /usr/sbin/nologin site-theuaegate
mkdir -p /opt/Astro-production/theuaegate.com/.data /var/theuaegate/enhanced-live
chown -R site-theuaegate:site-theuaegate \
  /opt/Astro-production/theuaegate.com/.data /var/theuaegate/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-theuaegate` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-theuaegate /opt/Astro-production/theuaegate.com/.env.prod
chmod 640 /opt/Astro-production/theuaegate.com/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/theuaegate.com/deploy/theuaegate.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now theuaegate
systemctl show theuaegate -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-theuaegate`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
cp deploy/theuaegate.com.caddy /etc/caddy/sites.d/
# Main Caddyfile: import /etc/caddy/sites.d/*.caddy
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter theuaegate-astro run build
sudo site-ctl restart theuaegate
curl -sS http://127.0.0.1:5117/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
