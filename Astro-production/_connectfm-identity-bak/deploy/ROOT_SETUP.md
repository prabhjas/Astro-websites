# Root setup for connectfm.ae (CONNECT-ASTRO-FLEET-STANDARD)

App path: `/opt/Astro-production/connectfm.ae`  
Unit name: `connectfm` · Port: **5087** · Unix user: **`site-connectfm`**

Full host checklist: repo `docs/server-ops-only.md`.  
Peer pattern: **leads-only** (`FEATURES_LEADS_ONLY`, copied from `cbss.ae`).

## 1. Create site user + dirs (root)

```bash
useradd --system --home /opt/Astro-production/connectfm.ae --shell /usr/sbin/nologin site-connectfm
mkdir -p /opt/Astro-production/connectfm.ae/.data
chown -R site-connectfm:site-connectfm /opt/Astro-production/connectfm.ae/.data
```

## 2. Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-connectfm` **0640** | Runtime secrets. **Required** (`EnvironmentFile=` no `-`). |
| `.env` | `root:webdev` **0644** | Build-only `PUBLIC_SITE_URL` (no secrets). |

Generate a unique `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) — never reuse across domains.

## 3. Systemd (Tier 1)

```bash
cp /opt/Astro-production/connectfm.ae/deploy/connectfm.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now connectfm
systemctl show connectfm -p User,MemoryMax,EnvironmentFiles,ExecStart
```

## 4. site-ctl allowlist

Add `connectfm` to the host allowlist alongside other fleet units.

## 5. Caddy

Merge `deploy/connectfm.ae.caddy` into fleet `caddy/Caddyfile.production` (one-hop HTTP + hardened site block), or:

```bash
mkdir -p /etc/caddy/sites.d /var/log/caddy
cp /opt/Astro-production/connectfm.ae/deploy/connectfm.ae.caddy /etc/caddy/sites.d/
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

Match `PUBLIC_SITE_URL=https://connectfm.ae`. Cloudflare SSL = **Full**.

## 6. Deploy loop

```bash
cd /opt/Astro-production
pnpm --filter connectfm-astro run build
sudo site-ctl restart connectfm
curl -sS http://127.0.0.1:5087/api/health/
```

Preserve on rsync: `.env.prod`, `.data/`.  
**Never** run `astro dev` in production.
