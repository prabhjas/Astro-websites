# Root / ops setup — snapsale.ae

App tree: `/opt/Astro-production/snapsale.ae`  
Unit name: `snapsale` · PORT **5122** · Unix user: **`site-snapsale`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match the named-CA production pattern: non-root unit, required `.env.prod`, canonical redirect, HSTS and paired manual certificate loaders.

## 1. Site unix user

```bash
groupadd --system site-snapsale
useradd --system --gid site-snapsale --home-dir /opt/Astro-production/snapsale.ae \
  --shell /usr/sbin/nologin site-snapsale
mkdir -p /opt/Astro-production/snapsale.ae/.data /var/snapsale/enhanced-live
chown -R site-snapsale:site-snapsale \
  /opt/Astro-production/snapsale.ae/.data /var/snapsale/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-snapsale` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-snapsale /opt/Astro-production/snapsale.ae/.env.prod
chmod 640 /opt/Astro-production/snapsale.ae/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/snapsale.ae/deploy/snapsale.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now snapsale
systemctl show snapsale -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-snapsale`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
# Merge the complete reviewed site block into caddy/Caddyfile.production and
# the root-owned single /etc/caddy/Caddyfile. Never install fragment imports.
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use named CA `astro_origin_2026` with both manual certificate loaders.
Cloudflare SSL remains **Full**; never use Flexible.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter snapsale-ae-astro run build
sudo site-ctl restart snapsale
curl -sS http://127.0.0.1:5122/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
