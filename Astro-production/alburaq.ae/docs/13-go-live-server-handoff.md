# 13 — Go-live server handoff (alburaq.ae)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://alburaq.ae`  
**Fleet id / unit:** `alburaq` · **PORT:** **5120**  
**Unix user:** `site-alburaq`  
**Canonical:** `https://alburaq.ae` (www → apex)  
**Package filter:** `alburaq-astro`  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (named CA + paired manual loaders) → `127.0.0.1:5120`
**Node:** `>=22.12.0` (see `package.json` `engines`)

Templates: `deploy/alburaq.service`, `deploy/alburaq.ae.caddy`, `deploy/ROOT_SETUP.md`.  
Fleet Caddy doc: `docs/CONNECT-CADDY-DEPLOYMENT.md`.  
Site Caddy block lives in git under `deploy/alburaq.ae.caddy` (template-only). **Owner** merges into live `/etc/caddy/Caddyfile` + `caddy/Caddyfile.production` (site block **and** one-hop `http://alburaq.ae`) at cutover — see `docs/OPS-OWNER-CADDY-CUTOVER.md`. Do **not** treat laptop smoke as live cutover.

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

**SSL/TLS:** **Full**, backed by named CA `astro_origin_2026` and paired manual loaders (never Flexible).
Skip Bot Fight / Managed Challenge on the SEO paths above. Do not “Cache Everything” on robots/sitemaps/`runtime-gtm.js`.

---

## 2. Server cutover checklist (Phase 09)

1. Sync code to `/opt/Astro-production/alburaq.ae/` (preserve `.env.prod`, `.data/`).
2. Create `site-alburaq` user + `.data/` + `/var/alburaq/enhanced-live` per `deploy/ROOT_SETUP.md`.
3. Build `.env` (no secrets): `PUBLIC_SITE_URL=https://alburaq.ae`
4. Runtime `.env.prod` **0640** `root:site-alburaq` with **unique** `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) + Pipedrive + lead dirs — never reuse another domain’s secret.
5. `pnpm --filter alburaq-astro run build`
6. Install `deploy/alburaq.service` → `systemctl enable --now alburaq`
7. `curl -sS http://127.0.0.1:5120/api/health/` → 200
8. Merge site block into live `/etc/caddy/Caddyfile` to match `caddy/Caddyfile.production` (incl. one-hop `http://alburaq.ae`)
9. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
10. Cloudflare: DNS proxied, SSL **Full**
11. Register domain + bearer secret in FLOW
12. Public smoke: homepage, form POST, health, robots, sitemaps, sample redirects (`/about/` → `/about-us/`)

```bash
curl -sS http://127.0.0.1:5120/api/health/
curl -sSI / | head -15   # → 301 /
curl -sSI / | head -10
curl -sSI /robots.txt
curl -sSI /sitemap_index.xml
curl -sSI /llms.txt
curl -sSI /about-us   # → 301 /about-us/
```

**Git already has** the production Caddy site block + one-hop `http://www.alburaq.ae` line in `caddy/Caddyfile.production` — owner copies that into live `/etc/caddy/Caddyfile` (do not reload from a developer laptop).

---

## 3. Rollback

Keep last good `dist` (or release symlink). Revert code → `systemctl restart alburaq` → reload Caddy if the site block changed → re-smoke health + homepage.

---

## 4. Local already green (Phase 10 A–D)

```bash
# monorepo root
node scripts/fleet-local.mjs up alburaq
node scripts/fleet-local.mjs smoke alburaq
```

Do **not** enable this site in live Caddy until the Node unit is healthy on **5120**.
