# Root setup for iberiaworkforce.com (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/iberiaworkforce.com`  
Unit name: `iberiaworkforce` · Port: **5083** · Unix user: **`site-iberiaworkforce`**

Full host checklist: repo `docs/server-ops-only.md`.

Caddy is a **full reverse proxy** to Node (homepage + `/api/contact` + `/api/health` + `/api/lead`).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/iberiaworkforce.com --shell /usr/sbin/nologin site-iberiaworkforce
mkdir -p /opt/Astro-production/iberiaworkforce.com/.data
chown -R site-iberiaworkforce:site-iberiaworkforce /opt/Astro-production/iberiaworkforce.com/.data
```

## 2. Env (two files) — create `.env.prod` **before** enabling the unit

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-iberiaworkforce` **0640** | Runtime secrets (Pipedrive, …). **Required** — unit uses `EnvironmentFile=` **without** `-` so a missing file fails loudly instead of booting with empty PIPEDRIVE_*. |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

No `HOST`/`PORT` in env files. LF only.

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/iberiaworkforce.com/deploy/iberiaworkforce.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iberiaworkforce
systemctl show iberiaworkforce -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

```bash
ALLOWED="evolutionmiddleast cbss iberiaworkforce spheavyrental"
```

## 5. Caddy

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/iberiaworkforce.com/deploy/iberiaworkforce.com.caddy /etc/caddy/sites.d/
# Main Caddyfile must contain: import /etc/caddy/sites.d/*.caddy
# Keep Caddyfile group-readable by caddy (root:root-only caused a silent reload failure).
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Use explicit `http://`+`https://`+`tls internal` — bare domains + Cloudflare Flexible = redirect loop.

## 6. Deploy loop (after Tier 1)

```bash
cd /opt/Astro-production
pnpm --filter iberiaworkforce-astro run build
sudo site-ctl restart iberiaworkforce
curl -sS http://127.0.0.1:5083/api/health/
curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:5083/api/contact/ \
  -H 'Content-Type: application/json' -d '{}'
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
