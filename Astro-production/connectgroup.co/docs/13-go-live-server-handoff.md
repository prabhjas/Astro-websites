# Go-live server handoff — Connect Group Astro

**Audience:** server / DevOps / Cloudflare admin  
**Site:** `https://connectgroup.co`  
**Date:** go-live cutover  
**App model:** Astro **Node standalone SSR** behind Cloudflare (proxy to origin). This is **not** a static-only Cloudflare Pages deploy.

---

## 1. Why Cloudflare must allow these URLs

`/llms.txt`, `/llm.txt`, `/robots.txt`, and Rank Math–style sitemaps are served by the **Node app at request time** (not uploaded as fixed files in `public/`).

If Cloudflare WAF / Bot Fight / custom firewall rules block or challenge `.txt` / `.xml` / unknown bots, Google / AI crawlers get **403/1020/challenge pages** instead of the real file. That is the usual cause of “llms.txt blocked by Cloudflare”.

### Must allow through to origin (no challenge, no block)

| Path | Purpose |
|------|---------|
| `/robots.txt` | Crawler policy + sitemap pointer |
| `/llm.txt` | LLM guidance (alias) |
| `/llms.txt` | LLM guidance (primary) |
| `/sitemap_index.xml` | Sitemap index (underscore name — Rank Math style) |
| `/page-sitemap.xml` | Page URLs |
| `/page-sitemap2.xml`, `/page-sitemap3.xml`, … | Extra page chunks |
| `/post-sitemap.xml` | Blog URLs |
| `/post-sitemap2.xml`, … | Extra post chunks |
| `/runtime-gtm.js` | Live GTM loader (must not be cached aggressively) |

Also do **not** block normal marketing HTML, `/api/contact`, or `/internal/operations/*` for staff (that path is noindex; still needs cookie auth to origin).

### Cloudflare settings checklist

1. **SSL/TLS:** Full (strict) with a valid origin cert.
2. **Proxy:** orange-cloud the apex / www to the origin Node (or nginx → Node).
3. **WAF / Firewall custom rules:** create an **Allow / Skip** rule for the paths above (and ideally `*.txt` / `*.xml` at site root for SEO).  
   - Skip: Bot Fight Mode / Super Bot Fight / Managed Challenge / JS Challenge for those paths.
4. **Bot Fight Mode:** if enabled globally, explicitly **exclude** the SEO paths above.
5. **Cache Rules:**  
   - Do **not** use “Cache Everything” on `/robots.txt`, `/llm.txt`, `/llms.txt`, `/sitemap*.xml`.  
   - Prefer **Bypass cache** or respect origin `Cache-Control`.  
   - App already sends for SEO files: `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`.  
   - `/runtime-gtm.js` is `no-store` — **never cache** at the edge.
6. **Page Rules / Configuration Rules:** no redirect that rewrites `sitemap_index.xml` → something else, and no force-www/HTTPS loop on those URLs.
7. After change: purge cache for those URLs once.

### Quick verification (from outside)

```bash
curl -sI https://connectgroup.co/llms.txt
curl -sI https://connectgroup.co/robots.txt
curl -sI https://connectgroup.co/sitemap_index.xml
curl -s https://connectgroup.co/llms.txt | head
curl -s https://connectgroup.co/robots.txt
```

Expect **HTTP 200**, `content-type: text/plain` or `application/xml`, body starting with `# Connect Group` / `User-agent:` / `<?xml`.  
**Not OK:** Cloudflare challenge HTML, 403, 1020, or empty body.

---

## 2. What to run on the server

### Build & start

```bash
cd /path/to/astro-release
npm ci
npm run build
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

Use **systemd**, **pm2**, or similar so the process restarts on reboot. Keep one long-lived Node process (not serverless).

Example **systemd** unit sketch:

```ini
[Unit]
Description=Connect Group Astro
After=network.target

[Service]
Type=simple
User=connectgroup
WorkingDirectory=/var/www/connectgroup/current
EnvironmentFile=/etc/connectgroup/astro.env
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
  server_name connectgroup.co www.connectgroup.co;

  # TLS certs here...

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
| `INTERNAL_ADMIN_DIR` | `/var/connectgroup/internal-admin` | robots/llm/sitemap overrides, GTM, redirects, PHP versions | **read + write** by Node user |
| `LEAD_STORE_DIR` | `/var/connectgroup/leads` | Contact form NDJSON store | **read + write** |
| `INTERNAL_UPLOAD_DIR` | `/var/connectgroup/internal-uploads` | Dashboard uploads | **read + write** |
| `INTERNAL_ENHANCED_LIVE_DIR` | `/var/www/html/enhanced` (or existing PHP `enhanced/` path) | Live Enhanced PHP files copied from dashboard | **read + write** |

```bash
sudo mkdir -p /var/connectgroup/{internal-admin,leads,internal-uploads}
sudo chown -R connectgroup:connectgroup /var/connectgroup
sudo chmod -R u+rwX,g+rX /var/connectgroup
# Ensure INTERNAL_ENHANCED_LIVE_DIR is writable by the same user
```

Optional (if dashboard redirect sync is enabled): write access to `src/data/redirects.yml` inside the running release, **or** keep redirects only in `INTERNAL_ADMIN_DIR` (runtime path already works without YAML write).

Internal blog CMS (Posts) may also write under:

- `src/content/blog/`
- `src/content/taxonomies/`
- `public/wp-content/uploads/internal-posts/`

If those features are used in production, the Node user needs write permission on those paths in the **active** release (or they must be bind-mounted as persistent volumes).

---

## 4. Required environment variables

Put these in `/etc/connectgroup/astro.env` (or equivalent). **Do not** commit secrets to git.

### Public / SEO

```bash
PUBLIC_SITE_URL=https://connectgroup.co
HOST=0.0.0.0
PORT=4321
```

### Persistent dirs

```bash
INTERNAL_ADMIN_DIR=/var/connectgroup/internal-admin
LEAD_STORE_DIR=/var/connectgroup/leads
INTERNAL_UPLOAD_DIR=/var/connectgroup/internal-uploads
INTERNAL_ENHANCED_LIVE_DIR=/var/www/html/enhanced
INTERNAL_UPLOAD_MAX_FILE_BYTES=10485760
LEAD_STORE_MAX_FILE_BYTES=10485760
```

### Dashboard auth

```bash
DASHBOARD_PATH=/internal/operations
DASHBOARD_SESSION_SECRET=<long-random-secret>
DASHBOARD_SESSION_TTL_MINUTES=480
INTERNAL_JOB_SECRET=<long-random-secret>
DASHBOARD_USERS_JSON=[...]
```

Roles in use: `viewer`, `developer`, `seo`, `super_admin`.  
Login URL: `https://connectgroup.co/internal/operations/login`

### Pipedrive / forms (required for contact API)

```bash
PIPEDRIVE_API_TOKEN=...
PIPEDRIVE_COMPANY_DOMAIN=...
PIPEDRIVE_OWNER_ID=...
PIPEDRIVE_LEAD_SOURCE_ID=270
WEBSITE_ID=...
WEBSITE_NAME=Connect Group
FORM_SOURCE=270
FORM_NAME=Connect Group Contact Form
LEAD_TITLE_PREFIX=AD Connect Group
```

Optional email: `FORM_NOTIFICATION_EMAILS`, `SMTP_*`, `FORM_FROM_*`.

Full template: repo `.env.example`.

---

## 5. DNS / WordPress cutover notes

1. Point Cloudflare DNS for `connectgroup.co` (and `www`) to the new origin.
2. Keep WordPress offline or on a different host so it does not compete for the same vhost.
3. Confirm Enhanced PHP still served from `INTERNAL_ENHANCED_LIVE_DIR` if legacy PHP endpoints remain.
4. Redirects are applied by the Astro middleware + managed admin store — Cloudflare Page Rules are **not** required for Rank Math imports already in the dashboard (optional as belt-and-suspenders).

---

## 6. Post-go-live smoke test

| Check | Command / action | Pass criteria |
|-------|------------------|---------------|
| Homepage | Open `/` | 200, branding/layout OK |
| robots | `curl -sI /robots.txt` | 200, not Cloudflare block |
| llms | `curl -sI /llms.txt` and `/llm.txt` | 200, plaintext |
| Sitemap index | `curl -sI /sitemap_index.xml` | 200, XML |
| Child sitemap | Open a `<loc>` from the index | 200 |
| Contact form | Submit test lead | Pipedrive + lead file under `LEAD_STORE_DIR` |
| Redirect | Hit a known old Rank Math URL | 301/302 to new URL |
| Dashboard | `/internal/operations/login` | Login works; SEO/redirects/posts as per role |
| GTM | View-source / Network for `/runtime-gtm.js` | 200, scripts inject |

---

## 7. Permissions summary (for the server guy)

Grant the **Node process user** (`connectgroup` or similar):

1. Read the release directory (`current` / app files).
2. **Write** to `/var/connectgroup/internal-admin`, `leads`, `internal-uploads`.
3. **Write** to `INTERNAL_ENHANCED_LIVE_DIR`.
4. Bind outbound HTTPS to Pipedrive API (and SMTP if used).
5. Listen on localhost `PORT` (default `4321`) or whatever nginx proxies to.
6. Cloudflare account access to edit **WAF / Bot Fight / Cache Rules** so SEO `.txt` / `.xml` paths are never challenged.

Without (2) and (6), dashboard SEO edits and crawlers will fail even if the site HTML looks fine.

---

## 8. Contacts / ownership

| Area | Owner |
|------|--------|
| App code / env values | Dev team |
| Server user, dirs, systemd, nginx | Server guy |
| Cloudflare WAF / DNS / SSL | Server guy + whoever owns CF account |
| SEO content (robots / llms / sitemap priorities) | SEO role in `/internal/operations` |
