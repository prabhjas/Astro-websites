# Root / ops setup — peomiddleast.com

App tree: `/opt/Astro-production/peomiddleast.com`  
Unit name: `peomiddleeast` · PORT **5118** · Unix user: **`site-peomiddleeast`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (`tls internal`, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-peomiddleeast
useradd --system --gid site-peomiddleeast --home-dir /opt/Astro-production/peomiddleast.com \
  --shell /usr/sbin/nologin site-peomiddleeast
mkdir -p /opt/Astro-production/peomiddleast.com/.data
chown -R site-peomiddleeast:site-peomiddleeast \
  /opt/Astro-production/peomiddleast.com/.data
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-peomiddleeast` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only. No SMTP / `FORM_NOTIFICATION_*` / `FORM_FROM_*`.

```bash
# After creating .env.prod from secrets:
chown root:site-peomiddleeast /opt/Astro-production/peomiddleast.com/.env.prod
chmod 640 /opt/Astro-production/peomiddleast.com/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/peomiddleast.com/deploy/peomiddleeast.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now peomiddleeast
systemctl show peomiddleeast -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-peomiddleeast`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

Owner-only: [docs/OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md).

```bash
# Merge deploy/peomiddleast.com.caddy into /etc/caddy/Caddyfile (or sites.d)
# Also add http://www.peomiddleast.com to the shared one-hop HTTP alt-host block
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses `tls internal`.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter peomiddleast-com-astro run build
sudo site-ctl restart peomiddleeast
curl -sS http://127.0.0.1:5118/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
