# 13 — Go-live server handoff (connectbusinesscenter.com)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://connectbusinesscenter.com`  
**Fleet id / unit:** `connectbusinesscenter` · **PORT:** **5116**  
**Unix user:** `site-connectbusinesscenter`  
**Canonical:** `https://connectbusinesscenter.com` (www → apex)  
**Package filter:** `connectbusinesscenter-astro`  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (`tls internal`) → `127.0.0.1:5116`  
**Node:** `>=22.12.0` (see `package.json` `engines`)

Templates: `deploy/connectbusinesscenter.service`, `deploy/connectbusinesscenter.com.caddy`, `deploy/ROOT_SETUP.md`.  
Fleet Caddy doc: `docs/CONNECT-CADDY-DEPLOYMENT.md`.  
Git Caddy mirror already includes the site block + one-hop `http://www.connectbusinesscenter.com` in `caddy/Caddyfile.production`.

Local laptop sign-off uses `fleet-local` only — do **not** run the production Caddy block locally.

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
| `/api/blog/listing` | Blog index AJAX |
| `/api/internal/*` | FLOW bearer APIs (must reach origin) |

**SSL/TLS:** **Full** (not Flexible; not Full strict alone with `tls internal`).  
Skip Bot Fight / Managed Challenge on the SEO paths above. Do not “Cache Everything” on robots/sitemaps/`runtime-gtm.js`.

---

## 2. Server cutover checklist (Phase 09)

1. Sync code to `/opt/Astro-production/connectbusinesscenter.com/` (preserve `.env.prod`, `.data/`).
2. Create `site-connectbusinesscenter` user + `.data/` + `/var/connectbusinesscenter/enhanced-live` per `deploy/ROOT_SETUP.md`.
3. Build `.env` (no secrets): `PUBLIC_SITE_URL=https://connectbusinesscenter.com`
4. Runtime `.env.prod` **0640** `root:site-connectbusinesscenter` with **unique** `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) + Pipedrive + lead dirs — never reuse another domain’s secret.
5. `pnpm --filter connectbusinesscenter-astro run build`
6. Install `deploy/connectbusinesscenter.service` → `systemctl enable --now connectbusinesscenter`
7. `curl -sS http://127.0.0.1:5116/api/health/` → 200
8. Merge site block into live `/etc/caddy/Caddyfile` to match `caddy/Caddyfile.production` (incl. one-hop `http://www.connectbusinesscenter.com`)
9. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
10. Cloudflare: DNS proxied, SSL **Full**
11. Register domain + bearer secret in FLOW
12. Public smoke: homepage, form POST, health, robots, sitemaps, sample redirects (`/about/` → `/about-us/`)

```bash
curl -sS http://127.0.0.1:5116/api/health/
curl -sI https://connectbusinesscenter.com/ | head
curl -sI https://www.connectbusinesscenter.com/ | head   # → canonical apex
curl -sI https://connectbusinesscenter.com/robots.txt
curl -sI https://connectbusinesscenter.com/sitemap_index.xml
curl -sI https://connectbusinesscenter.com/about/
```

---

## 3. Rollback

Keep last good `dist` (or release symlink). Revert code → `systemctl restart connectbusinesscenter` → reload Caddy if the site block changed → re-smoke health + homepage.

---

## 4. Local already green (Phase 10 A–D)

```bash
# monorepo root
node scripts/fleet-local.mjs up connectbusinesscenter
node scripts/fleet-local.mjs smoke connectbusinesscenter
```

Do **not** enable this site in live Caddy until the Node unit is healthy on **5116**.
