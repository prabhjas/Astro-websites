# Root / ops setup — freelancerdxb.com

App tree: `/opt/Astro-production/freelancerdxb.com`  
Unit name: `freelancerdxb` · PORT **5109** · Unix user: **`site-freelancerdxb`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-freelancerdxb
useradd --system --gid site-freelancerdxb --home-dir /opt/Astro-production/freelancerdxb.com \
  --shell /usr/sbin/nologin site-freelancerdxb
mkdir -p /opt/Astro-production/freelancerdxb.com/.data
chown -R site-freelancerdxb:site-freelancerdxb \
  /opt/Astro-production/freelancerdxb.com/.data
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-freelancerdxb` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only. No SMTP / `FORM_NOTIFICATION_*` / `FORM_FROM_*`.

```bash
# After creating .env.prod from secrets:
chown root:site-freelancerdxb /opt/Astro-production/freelancerdxb.com/.env.prod
chmod 640 /opt/Astro-production/freelancerdxb.com/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/freelancerdxb.com/deploy/freelancerdxb.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now freelancerdxb
systemctl show freelancerdxb -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-freelancerdxb`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

Owner-only: [docs/OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md).

```bash
# Merge deploy/freelancerdxb.com.caddy into /etc/caddy/Caddyfile (or sites.d)
# Also add http://www.freelancerdxb.com to the shared one-hop HTTP alt-host block
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter freelancerdxb-com-astro run build
sudo site-ctl restart freelancerdxb
curl -sS http://127.0.0.1:5109/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
