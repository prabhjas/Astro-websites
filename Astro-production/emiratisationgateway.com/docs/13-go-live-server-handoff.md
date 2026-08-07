# 13 — Go-live server handoff (emiratisationgateway.com)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://emiratisationgateway.com`  
**Fleet id / unit:** `emiratisationgateway` · **PORT:** **5106**  
**Unix user:** `site-emiratisationgateway`  
**Canonical:** `https://emiratisationgateway.com` (www → apex)  
**Package filter:** `emiratisationgateway-astro`  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (`tls internal`) → `127.0.0.1:5106`  
**Node:** `>=22.12.0` (see `package.json` `engines`)

Templates: `deploy/emiratisationgateway.service`, `deploy/emiratisationgateway.com.caddy`, `deploy/ROOT_SETUP.md`.  
Fleet Caddy doc: `docs/CONNECT-CADDY-DEPLOYMENT.md`.  
Site Caddy block lives in git under `deploy/emiratisationgateway.com.caddy` (template-only). **Owner** merges into live `/etc/caddy/Caddyfile` + `caddy/Caddyfile.production` (site block **and** one-hop `http://emiratisationgateway.com`) at cutover — see `docs/OPS-OWNER-CADDY-CUTOVER.md`. Do **not** treat laptop smoke as live cutover.

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

1. Sync code to `/opt/Astro-production/emiratisationgateway.com/` (preserve `.env.prod`, `.data/`).
2. Create `site-emiratisationgateway` user + `.data/` + `/var/emiratisationgateway/enhanced-live` per `deploy/ROOT_SETUP.md`.
3. Build `.env` (no secrets): `PUBLIC_SITE_URL=https://emiratisationgateway.com`
4. Runtime `.env.prod` **0640** `root:site-emiratisationgateway` with **unique** `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) + Pipedrive + lead dirs — never reuse another domain’s secret.
5. `pnpm --filter emiratisationgateway-astro run build`
6. Install `deploy/emiratisationgateway.service` → `systemctl enable --now emiratisationgateway`
7. `curl -sS http://127.0.0.1:5106/api/health/` → 200
8. Merge site block into live `/etc/caddy/Caddyfile` to match `caddy/Caddyfile.production` (incl. one-hop `http://emiratisationgateway.com`)
9. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
10. Cloudflare: DNS proxied, SSL **Full**
11. Register domain + bearer secret in FLOW
12. Public smoke: homepage, form POST, health, robots, sitemaps, sample redirects (`/about/` → `/about-us/`)

```bash
curl -sS http://127.0.0.1:5106/api/health/
curl -sI https://emiratisationgateway.com/ | head
curl -sI https://emiratisationgateway.com/ | head   # → canonical apex
curl -sI https://emiratisationgateway.com/robots.txt
curl -sI https://emiratisationgateway.com/sitemap_index.xml
curl -sI https://emiratisationgateway.com/about/
```

---

## 3. Rollback

Keep last good `dist` (or release symlink). Revert code → `systemctl restart emiratisationgateway` → reload Caddy if the site block changed → re-smoke health + homepage.

---

## 4. Local already green (Phase 10 A–D)

```bash
# monorepo root
node scripts/fleet-local.mjs up emiratisationgateway
node scripts/fleet-local.mjs smoke emiratisationgateway
```

Do **not** enable this site in live Caddy until the Node unit is healthy on **5106**.
