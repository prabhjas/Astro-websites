# 13 — Go-live server handoff (connectfreelance.ae)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://connectfreelance.ae`  
**Fleet id / unit:** `connectfreelance` · **PORT:** **5094**  
**Unix user:** `site-connectfreelance`  
**Canonical:** `https://connectfreelance.ae` (www → apex)  
**Package filter:** `connectfreelance-ae-astro`  
**App model:** Astro **Node standalone SSR** behind Cloudflare → Caddy (named CA `astro_origin_2026` with paired manual cert/key loaders) → `127.0.0.1:5094`
**Node:** `>=22.12.0` (see `package.json` `engines`)  
**Peer scaffold:** `royalvisa.ae` (full CMS WP Elementor mirror)

Templates: `deploy/connectfreelance.service`, `deploy/connectfreelance.ae.caddy`, `deploy/ROOT_SETUP.md`.  
Fleet Caddy doc: `docs/CONNECT-CADDY-DEPLOYMENT.md`.  
**Do not** merge into live `/etc/caddy/Caddyfile` until the Node unit is healthy on **5094**.

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
| `/api/blog/listing` | Insights/blog index AJAX |
| `/api/internal/*` | FLOW bearer APIs (must reach origin) |

**SSL/TLS:** **Full** (not Flexible; not Full strict alone with named CA `astro_origin_2026` with paired manual cert/key loaders).

---

## 2. Server cutover checklist (Phase 09)

1. Sync code to `/opt/Astro-production/connectfreelance.ae/` (preserve `.env.prod`, `.data/`).
2. Create `site-connectfreelance` user + `.data/` + `/var/connectfreelance/enhanced-live` per `deploy/ROOT_SETUP.md`.
3. Build `.env` (no secrets): `PUBLIC_SITE_URL=https://connectfreelance.ae`
4. Runtime `.env.prod` **0640** `root:site-connectfreelance` with **unique** `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) + Pipedrive + lead dirs — never reuse another domain’s secret.
5. `pnpm --filter connectfreelance-ae-astro run build`
6. Install `deploy/connectfreelance.service` → `systemctl enable --now connectfreelance`
7. `curl -sS http://127.0.0.1:5094/api/health/` → 200
8. Merge site block from `deploy/connectfreelance.ae.caddy` into live `/etc/caddy/Caddyfile` (incl. one-hop `http://www.connectfreelance.ae`)
9. `sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
10. Cloudflare: DNS proxied, SSL **Full**
11. Register domain + bearer secret in FLOW
12. Public smoke: homepage, form POST, health, robots, sitemaps, sample redirects

```bash
curl -sS http://127.0.0.1:5094/api/health/
curl -sI https://connectfreelance.ae/ | head
curl -sI https://www.connectfreelance.ae/ | head   # → canonical apex
```

---

## 3. Local (Phase 10)

```bash
# monorepo root
node scripts/fleet-local.mjs up connectfreelance
node scripts/fleet-local.mjs smoke connectfreelance
```

Do **not** enable this site in live Caddy until the Node unit is healthy on **5094**.
