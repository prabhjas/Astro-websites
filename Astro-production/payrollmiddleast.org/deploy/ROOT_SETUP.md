# Root / ops setup — payrollmiddleast.org

App tree: `/opt/Astro-production/payrollmiddleast.org`  
Unit name: `payrollmiddleast` · PORT **5110** · Unix user: **`site-payrollmiddleast`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Templates here match **live Tier 1**: non-root unit, required `.env.prod`, production Caddy pattern (named CA `payroll_origin_isolated_2026` with its paired manual cert/key loaders, canonical www redirect, HSTS).

## 1. Site unix user

```bash
groupadd --system site-payrollmiddleast
useradd --system --gid site-payrollmiddleast --home-dir /opt/Astro-production/payrollmiddleast.org \
  --shell /usr/sbin/nologin site-payrollmiddleast
mkdir -p /opt/Astro-production/payrollmiddleast.org/.data
chown -R site-payrollmiddleast:site-payrollmiddleast \
  /opt/Astro-production/payrollmiddleast.org/.data
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-payrollmiddleast` **0640** | Runtime secrets (Pipedrive, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only. No SMTP / `FORM_NOTIFICATION_*` / `FORM_FROM_*`.

```bash
# After creating .env.prod from secrets:
chown root:site-payrollmiddleast /opt/Astro-production/payrollmiddleast.org/.env.prod
chmod 640 /opt/Astro-production/payrollmiddleast.org/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/payrollmiddleast.org/deploy/payrollmiddleast.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now payrollmiddleast
systemctl show payrollmiddleast -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-payrollmiddleast`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

Owner-only: [docs/OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md).

```bash
# Merge only into the reviewed canonical Caddyfile; there is no split-file alternative.
# Also add http://payrollmiddleast.org to the shared one-hop HTTP alt-host block
# (redirect apex → https://www.payrollmiddleast.org — live WP canonical is www)
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses named CA `payroll_origin_isolated_2026` with its paired manual cert/key loaders.
`PUBLIC_SITE_URL=https://www.payrollmiddleast.org`

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter payrollmiddleast-org-astro run build
sudo site-ctl restart payrollmiddleast
curl -sS http://127.0.0.1:5110/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive from prod.
