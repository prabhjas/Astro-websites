# Root / ops setup — evolutionmiddleast.com

App tree: `/opt/Astro-production/evolutionmiddleast.com`  
Unit name: `evolutionmiddleast` · PORT **5080** · Unix user: **`site-evolutionmiddleast`**  
Fleet docs: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · host checklist: `docs/server-ops-only.md`

Use the complete bare-host production block with named CA `astro_origin_2026` and both manual certificate loaders. Cloudflare SSL must remain **Full**; do not use Flexible.

## 1. Site unix user

```bash
groupadd --system site-evolutionmiddleast
useradd --system --gid site-evolutionmiddleast --home-dir /opt/Astro-production/evolutionmiddleast.com \
  --shell /usr/sbin/nologin site-evolutionmiddleast
mkdir -p /opt/Astro-production/evolutionmiddleast.com/.data /var/evolutionmiddleast/enhanced-live
chown -R site-evolutionmiddleast:site-evolutionmiddleast \
  /opt/Astro-production/evolutionmiddleast.com/.data /var/evolutionmiddleast/enhanced-live
```

## 2. Env (two files — do not merge)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-evolutionmiddleast` **0640** | Runtime secrets (Pipedrive, SMTP, `INTERNAL_JOB_SECRET`, …). **Required** by systemd (`EnvironmentFile=` with **no** leading `-`). |
| `.env` | `root:webdev` **0644** | Build-only, **no secrets** — at least `PUBLIC_SITE_URL` / `SITE_URL` so `pnpm build` gets correct canonicals. |

Never put `HOST`/`PORT` in either file (unit sets them). LF only.

```bash
# After creating .env.prod from secrets:
chown root:site-evolutionmiddleast /opt/Astro-production/evolutionmiddleast.com/.env.prod
chmod 640 /opt/Astro-production/evolutionmiddleast.com/.env.prod
```

## 3. Systemd

```bash
cp /opt/Astro-production/evolutionmiddleast.com/deploy/evolutionmiddleast.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now evolutionmiddleast
systemctl show evolutionmiddleast -p User,MemoryMax,EnvironmentFiles,ExecStart --no-pager
```

Expect `User=site-evolutionmiddleast`, `MemoryMax=268435456`, `EnvironmentFiles=…/.env.prod (ignore_errors=no)`.

## 4. Caddy

```bash
# Merge this deploy block into caddy/Caddyfile.production and the reviewed
# single /etc/caddy/Caddyfile; do not install files under sites.d.
# Production uses one reviewed /etc/caddy/Caddyfile; do not add a sites.d import.
# Keep Caddyfile readable by the caddy user/group (reload failed quietly when root:root dropped the group).
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Cloudflare SSL: **Full** (not Full strict) when origin uses named CA `astro_origin_2026` with its paired manual cert/key loaders.

## 5. Deploy / build (webdev)

```bash
cd /opt/Astro-production   # fleet pnpm workspace root
pnpm --filter evolutionmiddleast-astro run build
sudo site-ctl restart evolutionmiddleast
curl -sS http://127.0.0.1:5080/api/health/
```

Preserve on sync: `.env.prod`, `.data/`. Builds read non-secret `.env` only — webdev never needs Pipedrive/SMTP from prod.
