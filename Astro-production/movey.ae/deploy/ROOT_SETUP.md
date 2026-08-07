# Root / ops setup — movey.ae

App tree: `/opt/Astro-production/movey.ae`  
Unit name: `movey` · PORT **5098** · Unix user: **`site-movey`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-movey
useradd --system --gid site-movey --home-dir /opt/Astro-production/movey.ae \
  --shell /usr/sbin/nologin site-movey
mkdir -p /opt/Astro-production/movey.ae/.data /var/movey/enhanced-live
chown -R site-movey:site-movey \
  /opt/Astro-production/movey.ae/.data /var/movey/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-movey` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-movey /opt/Astro-production/movey.ae/.env.prod
chmod 640 /opt/Astro-production/movey.ae/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/movey.ae/deploy/movey.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now movey
systemctl show movey -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-movey`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
cp deploy/movey.ae.caddy /etc/caddy/sites.d/
# Main Caddyfile: import /etc/caddy/sites.d/*.caddy
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter movey-ae-astro run build
sudo site-ctl restart movey
curl -sS http://127.0.0.1:5104/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
