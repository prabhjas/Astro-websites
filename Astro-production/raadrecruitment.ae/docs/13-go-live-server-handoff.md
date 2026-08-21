# Go-live server handoff — ngmanpower.com (Astro)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://ngmanpower.com` (canonical apex)  
**Port / unit:** **5102** / `ngmanpower` / user `site-ngmanpower`  
**App model:** Astro Node standalone SSR behind Cloudflare → Caddy → loopback Node  
**Node:** `>=22.12.0`

Local laptop testing uses fleet-local only (no Caddy): `http://127.0.0.1:5102/`

---

## 1. Cloudflare must allow these URLs to origin

| Path | Purpose |
|------|---------|
| `/robots.txt` | Crawler policy + sitemap pointer |
| `/llm.txt` / `/llms.txt` | LLM guidance |
| `/sitemap_index.xml` | Sitemap index (underscore) |
| `/page-sitemap.xml` (+ chunks) | Pages |
| `/post-sitemap.xml` (+ chunks) | Posts (404 until posts imported) |
| `/runtime-gtm.js` | GTM loader (`no-store`) |
| `/api/contact/`, `/api/geo/`, `/api/health/` | Forms / geo / liveness |
| `/api/internal/*` | FLOW bearer APIs |

SSL mode: **Full**, backed by named CA `astro_origin_2026` and paired manual loaders (never Flexible).

---

## 2. Server steps (summary)

1. Sync code to `/opt/Astro-production/ngmanpower.com/` (preserve `.env.prod` + `.data/`).
2. Follow `deploy/ROOT_SETUP.md` — create `site-ngmanpower`, install unit, Caddy.
3. Generate unique secret: `openssl rand -hex 32` → `INTERNAL_JOB_SECRET` in `.env.prod` only.
4. Build `.env` with `PUBLIC_SITE_URL=https://ngmanpower.com` (no secrets).
5. `pnpm --filter ngmanpower-astro run build` → `systemctl enable --now ngmanpower`.
6. Merge `caddy/Caddyfile.production` (includes ngmanpower @ 5102 + one-hop www→apex).
7. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`.
8. Register domain + secret in central FLOW.
9. Public smoke: homepage, form POST, health, redirects, SEO files.

Full ops: repo `docs/server-ops-only.md` · `docs/CONNECT-CADDY-DEPLOYMENT.md`.

---

## 3. Local verify (before cutover)

```bash
# From monorepo root
node scripts/fleet-local.mjs up ngmanpower
node scripts/fleet-local.mjs smoke ngmanpower
open http://127.0.0.1:5102/
```
