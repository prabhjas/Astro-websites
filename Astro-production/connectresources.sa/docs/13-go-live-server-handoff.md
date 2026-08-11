# Go-live server handoff — Connect Resources Saudi (Astro)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://connectresources.sa`  
**Fleet id / unit:** `connectresources-sa` · **PORT:** **5088**  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (named CA `astro_origin_2026` with paired manual cert/key loaders) → `127.0.0.1:5088`
**Node:** `>=22.12.0` (see `package.json` `engines`)

Local laptop sign-off uses `fleet-local` only — do **not** run the production Caddy block locally.  
Detail: `docs/CONNECT-CADDY-DEPLOYMENT.md` · `deploy/ROOT_SETUP.md`

---

## 1. Cloudflare — allow SEO / runtime paths to origin

| Path | Purpose |
|------|---------|
| `/robots.txt` | Crawler policy + sitemap pointer |
| `/llms.txt` / `/llm.txt` | LLM guidance |
| `/sitemap_index.xml` | Sitemap index (underscore) |
| `/page-sitemap.xml`, `/post-sitemap.xml` (+ chunks) | URL lists |
| `/runtime-gtm.js` | Live GTM loader (`no-store`) |
| `/api/contact/`, `/api/geo/`, `/api/health/` | Forms / health |
| `/api/internal/*` | FLOW bearer APIs (must reach origin) |

**SSL/TLS:** **Full** (not Flexible; not Full strict alone with named CA `astro_origin_2026` with paired manual cert/key loaders).
Skip Bot Fight / Managed Challenge on the SEO paths above. Do not “Cache Everything” on robots/sitemaps/`runtime-gtm.js`.

---

## 2. Server cutover checklist

1. Sync code to `/opt/Astro-production/connectresources.sa/` (preserve `.env.prod` + `.data/`).
2. Create unix user `site-connectresources-sa` per `deploy/ROOT_SETUP.md`.
3. `.env.prod` **0640** `root:site-connectresources-sa` with **unique** `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) — never reuse another domain’s secret.
4. Build `.env` (no secrets): `PUBLIC_SITE_URL=https://connectresources.sa`
5. `pnpm --filter connectresources-sa-astro run build`
6. Install `deploy/connectresources-sa.service` → `systemctl enable --now connectresources-sa`
7. Merge site block from `deploy/connectresources.sa.caddy` / `caddy/Caddyfile.production` into live `/etc/caddy/Caddyfile` (incl. one-hop `http://www.connectresources.sa`)
8. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
9. Register domain + `INTERNAL_JOB_SECRET` in FLOW
10. Public smoke: homepage, form POST, health, robots, sitemaps, sample redirect

```bash
curl -sS http://127.0.0.1:5088/api/health/
curl -sI https://connectresources.sa/ | head
curl -sI https://www.connectresources.sa/ | head   # → canonical apex
curl -sI https://connectresources.sa/robots.txt
curl -sI https://connectresources.sa/sitemap_index.xml
```

---

## 3. Rollback

Keep last good `dist` (or release symlink). Revert code → `systemctl restart connectresources-sa` → reload Caddy if the site block changed → re-smoke health + homepage.
