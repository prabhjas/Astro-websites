# Go-live server handoff — Connect HR (Astro)

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://connecthr.ae`  
**Date:** go-live cutover  
**App model:** Astro **Node standalone SSR** behind Cloudflare (proxy to origin). This is **not** a static-only Cloudflare Pages deploy.  
**Node:** `>=22.12.0` (see `package.json` `engines`)

---

## 1. Why Cloudflare must allow these URLs

Rank Math–style sitemaps, GTM runtime, and (when enabled) robots / LLM text files are served by the **Node app at request time** (or must reach origin so the correct file is returned). They are **not** safe to “Cache Everything” or challenge at the edge.

If Cloudflare WAF / Bot Fight / custom firewall rules block or challenge `.txt` / `.xml` / unknown bots, Google / AI crawlers get **403/1020/challenge pages** instead of the real file.

### Must allow through to origin (no challenge, no block)

| Path | Purpose |
|------|---------|
| `/robots.txt` | Crawler policy + sitemap pointer |
| `/llm.txt` | LLM guidance (alias) |
| `/llms.txt` | LLM guidance (primary) |
| `/sitemap_index.xml` | Sitemap index (**underscore** — Rank Math style; not `sitemap-index.xml`) |
| `/page-sitemap.xml` | Page URLs |
| `/page-sitemap2.xml`, `/page-sitemap3.xml`, … | Extra page chunks |
| `/post-sitemap.xml` | Blog / post URLs |
| `/post-sitemap2.xml`, … | Extra post chunks |
| `/runtime-gtm.js` | Live GTM loader (must not be cached aggressively) |

Also do **not** block normal marketing HTML, `/api/contact/`, `/api/geo/`, or `/api/health`. Machine CMS traffic hits `/api/internal/*` with a bearer secret (noindex; still must reach origin).

**Trailing slashes:** this app uses `trailingSlash: "always"`. Prefer `/api/contact/` (with trailing `/`). Middleware 308s many API paths without a slash.

### Cloudflare settings checklist

1. **SSL/TLS:** Full (strict) with a valid origin cert.
2. **Proxy:** orange-cloud the apex / www to the origin Node (or nginx → Node).
3. **WAF / Firewall custom rules:** create an **Allow / Skip** rule for the paths above (and ideally `*.txt` / `*.xml` at site root for SEO).
   - Skip: Bot Fight Mode / Super Bot Fight / Managed Challenge / JS Challenge for those paths.
4. **Bot Fight Mode:** if enabled globally, explicitly **exclude** the SEO paths above.
5. **Cache Rules:**
   - Do **not** use “Cache Everything” on `/robots.txt`, `/llm.txt`, `/llms.txt`, `/sitemap*.xml`.
   - Prefer **Bypass cache** or respect origin `Cache-Control`.
   - `/runtime-gtm.js` is `no-store` — **never cache** at the edge.
6. **Page Rules / Configuration Rules:** no redirect that rewrites `sitemap_index.xml` → something else, and no force-www/HTTPS loop on those URLs.
7. After change: purge cache for those URLs once.

### Quick verification (from outside)

```bash
curl -sI https://connecthr.ae/llms.txt
curl -sI https://connecthr.ae/robots.txt
curl -sI https://connecthr.ae/sitemap_index.xml
curl -s https://connecthr.ae/llms.txt | head
curl -s https://connecthr.ae/robots.txt
curl -sI https://connecthr.ae/runtime-gtm.js
```

Expect **HTTP 200**, `content-type: text/plain` or `application/xml` / `javascript`, body starting with `#` / `User-agent:` / `<?xml` as appropriate.  
**Not OK:** Cloudflare challenge HTML, 403, 1020, or empty body.

Confirm sitemap locs use **`sitemap_index.xml`** (underscore). A static `public/robots.txt` that still points at `sitemap-index.xml` (hyphen) is wrong for this app — fix via dashboard SEO → robots, or update the file so it matches the live Rank Math–style routes.

---

## 2. What to run on the server

### Build & start

```bash
cd /path/to/spheavy-release
npm ci
npm run build
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
# equivalent: npm run start  (set HOST/PORT in the environment)
```

Use **systemd**, **pm2**, or similar so the process restarts on reboot. Keep one long-lived Node process (not serverless).

Example **systemd** unit sketch:

```ini
[Unit]
Description=Connect HR Astro
After=network.target

[Service]
Type=simple
User=spheavy
WorkingDirectory=/var/www/spheavyrental/current
EnvironmentFile=/etc/spheavy/astro.env
Environment=HOST=0.0.0.0
Environment=PORT=4321
ExecStart=/usr/bin/node ./dist/server/entry.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Reverse proxy (nginx sketch)

```nginx
server {
  listen 443 ssl http2;
  server_name connecthr.ae www.connecthr.ae;

  # TLS certs here...

  # Large Elementor / upload bodies if dashboard uploads are used
  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Cloudflare → nginx:443 → Node:4321.

---

## 3. Persistent directories (critical)

App deploys must **not** wipe runtime data. Put these **outside** the release folder (or symlink into each release).

| Env var | Suggested production path | Purpose | Access needed |
|---------|---------------------------|---------|---------------|
| `INTERNAL_ADMIN_DIR` | `/var/spheavy/internal-admin` | robots/llm/sitemap overrides, GTM, redirects, PHP versions | **read + write** by Node user |
| `LEAD_STORE_DIR` | `/var/spheavy/leads` | Contact form NDJSON store | **read + write** |
| `INTERNAL_UPLOAD_DIR` | `/var/spheavy/internal-uploads` | Dashboard uploads | **read + write** |
| `INTERNAL_ENHANCED_LIVE_DIR` | `/var/www/html/enhanced` (or existing PHP `enhanced/` path) | Live Enhanced PHP files copied from dashboard | **read + write** |

```bash
sudo mkdir -p /var/spheavy/{internal-admin,leads,internal-uploads}
sudo chown -R spheavy:spheavy /var/spheavy
sudo chmod -R u+rwX,g+rX /var/spheavy
# Ensure INTERNAL_ENHANCED_LIVE_DIR is writable by the same user
```

Optional (if dashboard redirect sync writes YAML): write access to `src/data/redirects.yml` inside the running release, **or** keep redirects only in `INTERNAL_ADMIN_DIR` (runtime path already works without YAML write).

### Content CMS (Posts / Categories / Tags)

Unlike Connect Group’s `src/content/blog/`, this site stores migrated WordPress content in JSON:

- `src/data/posts.json`
- `src/data/categories.json`
- `src/data/tags.json`
- Featured / post media may land under `public/wp-content/uploads/internal-posts/`

If dashboard Posts CMS is used in production, the Node user needs **write** permission on those paths in the **active** release (or bind-mount them as persistent volumes).

Also keep `public/wp-content/` and `public/wp-includes/` intact across deploys (Elementor / WP asset fidelity). Prefer shipping them with the release artifact, not regenerating on the server unless you run `npm run fetch-assets` intentionally.

---

## 4. Required environment variables

Put these in `/etc/spheavy/astro.env` (or equivalent). **Do not** commit secrets to git.

Full template: repo `.env.example`.

### Public / SEO / process

```bash
PUBLIC_SITE_URL=https://connecthr.ae
LOG_LEVEL=info
```

**Do not** put `HOST` / `PORT` in `.env.prod` — systemd (or the process manager) must set them per site. Use **LF** line endings only (CRLF breaks systemd `EnvironmentFile=`).

### Persistent dirs

```bash
INTERNAL_ADMIN_DIR=/var/spheavy/internal-admin
LEAD_STORE_DIR=/var/spheavy/leads
INTERNAL_UPLOAD_DIR=/var/spheavy/internal-uploads
INTERNAL_ENHANCED_LIVE_DIR=/var/www/html/enhanced
INTERNAL_UPLOAD_MAX_FILE_BYTES=10485760
LEAD_STORE_MAX_FILE_BYTES=10485760
```

### Machine auth (central CMS / cron)

```bash
INTERNAL_JOB_SECRET=<long-random-secret>
```

Per-site dashboard UI (`/internal/operations/*`) is **removed**. The central CMS calls `/api/internal/*` with:

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Also accepted: `x-internal-job-secret` header or `?secret=` (cron). Do **not** share `DASHBOARD_SESSION_SECRET` with the control plane as the machine credential.

### Pipedrive / forms (required for contact API)

```bash
PIPEDRIVE_API_TOKEN=...
PIPEDRIVE_COMPANY_DOMAIN=...
PIPEDRIVE_OWNER_ID=...
PIPEDRIVE_LEAD_SOURCE_ID=270
WEBSITE_ID=...
WEBSITE_NAME=Connect HR
FORM_SOURCE=270
FORM_NAME=Connect HR Contact Form
LEAD_TITLE_PREFIX=Connect HR
```

Optional email: not used — lead path is file store + Pipedrive only (no `FORM_NOTIFICATION_*` / `SMTP_*`).

Optional Pipedrive field key overrides: `PIPEDRIVE_FIELD_*` (defaults in `.env.example` match the old WP integration).

Public forms post **JSON** to `POST /api/contact/` (CF7 bridge + ContactForm). Optional: `PUBLIC_CONTACT_ENDPOINT`.

Lead retry job (cron): `GET|POST /api/internal/run-retries/` with `INTERNAL_JOB_SECRET`.

Health check: `GET /api/health` → `{ ok: true }`. Node emits structured `http_access` JSON logs for HTML/API.

---

## 5. DNS / WordPress cutover notes

1. Point Cloudflare DNS for `connecthr.ae` (and `www`) to the new origin.
2. Keep WordPress offline or on a different host so it does not compete for the same vhost.
3. Confirm Enhanced PHP still served from `INTERNAL_ENHANCED_LIVE_DIR` if legacy PHP endpoints remain.
4. Redirects are applied by Astro middleware + managed admin store — Cloudflare Page Rules are **not** required for Rank Math imports already managed via the central CMS (optional as belt-and-suspenders). Generate static edge helpers if needed: `npm run redirects:generate` → `public/_redirects`.
5. Optional pre-cutover: `npm run sitemap:sync` to refresh `src/data/sitemap-urls.json` from the live Rank Math index (`LIVE_SITEMAP_INDEX`).
6. Image remote allowlist includes `connecthr.ae` — keep `PUBLIC_SITE_URL` on that host in production.

---

## 6. Post-go-live smoke test

| Check | Command / action | Pass criteria |
|-------|------------------|---------------|
| Homepage | Open `/` | 200, branding/layout OK |
| Health | `curl -s /api/health` | 200, `{ "ok": true, ... }` |
| Unknown URL | `curl -sI /this-page-does-not-exist-xyz/` | **404** (not 503); body has no `prepare:page` |
| robots | `curl -sI /robots.txt` | 200, not Cloudflare block; Sitemap points at `sitemap_index.xml` |
| llms | `curl -sI /llms.txt` and `/llm.txt` | 200, plaintext |
| Sitemap index | `curl -sI /sitemap_index.xml` | 200, XML |
| Child sitemap | Open a `<loc>` from the index | 200 |
| Contact form | Submit test lead (JSON body) | Pipedrive + lead file under `LEAD_STORE_DIR`; not Origin 403 |
| Phone / geo | Form country detect | `/api/geo/` returns country for client IP |
| Redirect | Hit a known old Rank Math URL | 301/302/308 to new URL |
| Internal API | `curl -sH "Authorization: Bearer $INTERNAL_JOB_SECRET" /api/internal/leads/` | 200 JSON list |
| Dashboard UI | `/internal/operations/` | **404** (UI removed; use central CMS) |
| GTM | View-source for GTM snippet and/or Network for `/runtime-gtm.js` | 200, container scripts present |
| Sample post | e.g. `/wheel-loaders-for-rent/` | Elementor layout + assets load |
| Trailing slash | Hit `/api/contact` without `/` | 308 to `/api/contact/` (or direct POST with `/`) |

---

## 7. Permissions summary (for the server guy)

Grant the **Node process user** (`spheavy` or similar):

1. Read the release directory (`current` / app files).
2. **Write** to `/var/spheavy/internal-admin`, `leads`, `internal-uploads`.
3. **Write** to `INTERNAL_ENHANCED_LIVE_DIR`.
4. **Write** to CMS paths if Posts are edited in prod: `src/data/posts.json`, `categories.json`, `tags.json`, and `public/wp-content/uploads/internal-posts/`.
5. Bind outbound HTTPS to Pipedrive API (and SMTP if used).
6. Listen on localhost `PORT` (default `4321`) or whatever nginx proxies to.
7. Cloudflare account access to edit **WAF / Bot Fight / Cache Rules** so SEO `.txt` / `.xml` paths are never challenged.

Without (2) and (7), CMS SEO edits and crawlers will fail even if the site HTML looks fine.

---

## 8. Rollback

Recommended release layout:

```text
/opt/Astro-production/connecthr.ae/
  current -> releases/<id>
  releases/<id>/
  releases/<previous>/
  .env.prod               # not inside release (or copied with care)
```

Revert:

1. `ln -sfn releases/<previous> current` (or restore last known-good `dist/`)
2. Restart the site unit (`systemctl restart …` / `site-ctl restart spheavy`)
3. Smoke: `/api/health`, homepage 200, `POST /api/contact` validation 422, one known page
4. Record incident: who published, which release id, why reverted

Until symlink releases are standard, keep `.dist-backup-*` style snapshots.

---

## 9. Useful app commands (ops / content)

| Command | When |
|---------|------|
| `npm run build` && `npm run start` | Production serve |
| `npm run sitemap:sync` | Pull live Rank Math URLs into `src/data/sitemap-urls.json` |
| `npm run redirects:generate` | Emit `public/_redirects` from `src/data/redirects.yml` |
| `npm run extract` / `npm run fetch-assets` | Re-pull WordPress markup/assets (dev/migration only) |

---

## 10. Contacts / ownership

| Area | Owner |
|------|--------|
| App code / env values | Dev team |
| Server user, dirs, systemd, nginx | Server guy |
| Cloudflare WAF / DNS / SSL | Server guy + whoever owns CF account |
| SEO content (robots / llms / sitemap priorities) | Central CMS / SEO role |
| Pipedrive pipeline / field mapping | Marketing / CRM owner + Dev |

---

## 11. Related docs in this repo

- `docs/ADMIN.md` — bearer auth + internal API surface
- `README.md` — stack overview and scripts
- `.env.example` — full env template