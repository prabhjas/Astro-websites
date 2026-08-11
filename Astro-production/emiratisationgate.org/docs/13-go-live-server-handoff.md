# 13 — Go-live server handoff (emiratisationgate.org)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://emiratisationgate.org`  
**Fleet id / unit:** `emiratisationgate` · **PORT:** **5105**  
**Unix user:** `site-emiratisationgate`  
**Canonical:** `https://emiratisationgate.org` (www → apex)  
**Package filter:** `emiratisationgate-astro`  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (named CA `astro_origin_2026` with paired manual cert/key loaders) → `127.0.0.1:5105`
**Node:** `>=22.12.0` (see `package.json` `engines`)

Templates: `deploy/emiratisationgate.service`, `deploy/emiratisationgate.org.caddy`, `deploy/ROOT_SETUP.md`.  
Fleet Caddy doc: `docs/CONNECT-CADDY-DEPLOYMENT.md`.  
Site Caddy block lives in git under `deploy/emiratisationgate.org.caddy` (template-only). **Owner** merges into live `/etc/caddy/Caddyfile` + `caddy/Caddyfile.production` (site block **and** one-hop `http://emiratisationgate.org`) at cutover — see `docs/OPS-OWNER-CADDY-CUTOVER.md`. Do **not** treat laptop smoke as live cutover.

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

**SSL/TLS:** **Full** (not Flexible; not Full strict alone with named CA `astro_origin_2026` with paired manual cert/key loaders).
Skip Bot Fight / Managed Challenge on the SEO paths above. Do not “Cache Everything” on robots/sitemaps/`runtime-gtm.js`.

---

## 2. Server cutover checklist (Phase 09)

1. Sync code to `/opt/Astro-production/emiratisationgate.org/` (preserve `.env.prod`, `.data/`).
2. Create `site-emiratisationgate` user + `.data/` + `/var/emiratisationgate/enhanced-live` per `deploy/ROOT_SETUP.md`.
3. Build `.env` (no secrets): `PUBLIC_SITE_URL=https://emiratisationgate.org`
4. Runtime `.env.prod` **0640** `root:site-emiratisationgate` with **unique** `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) + Pipedrive + lead dirs — never reuse another domain’s secret.
5. `pnpm --filter emiratisationgate-astro run build`
6. Install `deploy/emiratisationgate.service` → `systemctl enable --now emiratisationgate`
7. `curl -sS http://127.0.0.1:5105/api/health/` → 200
8. Merge site block into live `/etc/caddy/Caddyfile` to match `caddy/Caddyfile.production` (incl. one-hop `http://emiratisationgate.org`)
9. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
10. Cloudflare: DNS proxied, SSL **Full**
11. Register domain + bearer secret in FLOW
12. Public smoke: homepage, form POST, health, robots, sitemaps, sample redirects (`/about/` → `/about-us/`)

```bash
curl -sS http://127.0.0.1:5105/api/health/
curl -sI https://emiratisationgate.org/ | head
curl -sI https://emiratisationgate.org/ | head   # → canonical apex
curl -sI https://emiratisationgate.org/robots.txt
curl -sI https://emiratisationgate.org/sitemap_index.xml
curl -sI https://emiratisationgate.org/about/
```

---

## 3. Rollback

Keep last good `dist` (or release symlink). Revert code → `systemctl restart emiratisationgate` → reload Caddy if the site block changed → re-smoke health + homepage.

---

## 4. Local already green (Phase 10 A–D)

```bash
# monorepo root
node scripts/fleet-local.mjs up emiratisationgate
node scripts/fleet-local.mjs smoke emiratisationgate
```

Do **not** enable this site in live Caddy until the Node unit is healthy on **5105**.
