# Go-live server handoff — CBSS Astro

**Audience:** server / DevOps / Cloudflare admin  
**Site:** production domain (set `PUBLIC_SITE_URL`; e.g. replace `https://cbss.example.com`)  
**Date:** go-live cutover  
**App model:** Astro **Node standalone SSR** behind Cloudflare (proxy to origin). This is **not** a static-only Cloudflare Pages deploy.

**Repo:** `astro-cbss` (Astro 5 + `@astrojs/node` standalone)  
**Product:** CBSS single landing page + contact / multi-step forms → Pipedrive + internal lead dashboard

---

## 1. Why Cloudflare must allow these URLs

CBSS is a **Node app at request time**. Forms, geo lookup, and the ops dashboard are **SSR routes** — they are not static files you can “upload once” to Pages.

If Cloudflare WAF / Bot Fight / custom firewall rules block or challenge these paths, forms fail, phone country detection breaks, and staff cannot open the dashboard.

### Must allow through to origin (no challenge, no block)

| Path | Purpose |
|------|---------|
| `/` | Marketing homepage (landing) |
| `/api/contact` | Contact + multi-step form AJAX submit (JSON) |
| `/api/geo` | IP → country for phone dial code |
| `/internal/operations` | Lead ops dashboard (noindex; cookie auth) |
| `/internal/operations/*` | Login, leads, failures, detail pages |
| `/api/internal/*` | Dashboard login/logout, export, retry, job runner |

Static assets under `/assets/*` (CSS/JS/images) should also reach origin or CDN without challenge pages.

> **Note:** This CBSS build does **not** currently ship Connect Group–style Rank Math `/robots.txt`, `/llms.txt`, or `/sitemap_index.xml` SSR routes. If those are added later, treat them like the Connect Group handoff (allow `.txt` / `.xml`, bypass Bot Fight, do not “Cache Everything”).

### Cloudflare settings checklist

1. **SSL/TLS:** Full (strict) with a valid origin cert.
2. **Proxy:** orange-cloud the apex / www to the origin Node (or nginx → Node).
3. **WAF / Firewall custom rules:** **Allow / Skip** for `/api/contact`, `/api/geo`, `/api/internal/*`, `/internal/operations*`.  
   - Skip: Bot Fight Mode / Super Bot Fight / Managed Challenge / JS Challenge for those paths (especially `/api/contact` — bots and browsers both POST JSON).
4. **Bot Fight Mode:** if enabled globally, explicitly **exclude** `/api/*` and `/internal/operations*`.
5. **Cache Rules:**  
   - **Bypass cache** for `/api/*` and `/internal/operations*`.  
   - Do **not** use “Cache Everything” on HTML `/` if forms/scripts must stay fresh after deploy (or purge on release).  
   - Prefer respecting origin `Cache-Control` for `/assets/*`.
6. **Page Rules / Configuration Rules:** no HTTPS / www redirect loops that break POST to `/api/contact`.
7. After change: purge cache for `/` and `/api/*` once.

### Quick verification (from outside)

```bash
# Replace with the live hostname
SITE=https://cbss.example.com

curl -sI "$SITE/"
curl -sI "$SITE/api/geo"
curl -s -X POST "$SITE/api/contact" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"name":"","email":"bad","phone":"","message":""}'
```

Expect:

- `/` → **HTTP 200** (HTML)
- `/api/geo` → **HTTP 200**, JSON with `country` (or `null` on private IPs)
- `/api/contact` with empty/invalid body → **HTTP 422** JSON (`success: false`, `errors`), **not** Cloudflare HTML challenge / 403 / 1020

---

## 2. What to run on the server

### Requirements

- **Node.js:** `18.20.8` or `^20.3.0` or `>=22` (recommend **Node 20 LTS** or **22**)
- Long-lived Node process (systemd / pm2) — **not** serverless / Workers-only

### Build & start

```bash
cd /path/to/astro-cbss-release
npm ci
npm run build
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

There is **no** `npm start` script in this repo; use `node ./dist/server/entry.mjs` directly.

Use **systemd**, **pm2**, or similar so the process restarts on reboot.

Example **systemd** unit sketch:

```ini
[Unit]
Description=CBSS Astro
After=network.target

[Service]
Type=simple
User=cbss
WorkingDirectory=/var/www/cbss/current
EnvironmentFile=/etc/cbss/astro.env
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
  server_name cbss.example.com www.cbss.example.com;

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

**Important:** forward `X-Forwarded-For` / `X-Real-IP` so rate limiting and `/api/geo` see the visitor IP (not Cloudflare’s edge alone without those headers).

---

## 3. Persistent directories (critical)

App deploys must **not** wipe runtime data. Put these **outside** the release folder (or symlink into each release).

| Env var | Suggested production path | Purpose | Access needed |
|---------|---------------------------|---------|---------------|
| `LEAD_STORE_DIR` | `/var/cbss/leads` | Contact / multi-step form NDJSON + state (source of truth) | **read + write** |
| `INTERNAL_ADMIN_DIR` | `/var/cbss/internal-admin` | Reserved admin/runtime store (scaffolded) | **read + write** |
| `INTERNAL_UPLOAD_DIR` | `/var/cbss/internal-uploads` | Dashboard uploads (if used) | **read + write** |
| `INTERNAL_ENHANCED_LIVE_DIR` | `/var/cbss/enhanced-live` | Reserved enhanced/live path (scaffolded) | **read + write** |

Lead store layout (under `LEAD_STORE_DIR`):

- `state/{publicId}.json` — current lead state  
- `submissions/YYYY-MM/*.ndjson` — append-only submissions  
- `attempts/YYYY-MM/*.ndjson` — Pipedrive delivery attempts  

```bash
sudo mkdir -p /var/cbss/{leads,internal-admin,internal-uploads,enhanced-live}
sudo chown -R cbss:cbss /var/cbss
sudo chmod -R u+rwX,g+rX /var/cbss
```

**Also persist:** production env file (e.g. `/etc/cbss/astro.env`) — **never** commit secrets to git.

**Logs:** app logs JSON to **stdout/stderr** only. Capture via systemd/journald or the process manager. There is no on-disk app log directory.

---

## 4. Required environment variables

Put these in `/etc/cbss/astro.env` (or equivalent). **Do not** commit secrets to git.  
Full template: repo `.env.example`.

### Public / process

```bash
PUBLIC_SITE_URL=https://cbss.example.com
HOST=0.0.0.0
PORT=4321
LOG_LEVEL=info
```

### Persistent dirs

```bash
LEAD_STORE_DIR=/var/cbss/leads
LEAD_STORE_MAX_FILE_BYTES=10485760
INTERNAL_ADMIN_DIR=/var/cbss/internal-admin
INTERNAL_UPLOAD_DIR=/var/cbss/internal-uploads
INTERNAL_ENHANCED_LIVE_DIR=/var/cbss/enhanced-live
INTERNAL_UPLOAD_MAX_FILE_BYTES=10485760
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
Login URL: `https://cbss.example.com/internal/operations/login`

Session cookie is **httpOnly** and **`secure: true`** — **HTTPS is required** in production.

### Pipedrive / forms (required for contact API)

```bash
PIPEDRIVE_API_TOKEN=...
PIPEDRIVE_COMPANY_DOMAIN=connectgroup2
PIPEDRIVE_OWNER_ID=...
PIPEDRIVE_LEAD_SOURCE_ID=270
PIPEDRIVE_PERSON_LABEL_IDS=5
PIPEDRIVE_PERSON_VISIBLE_TO=3
PIPEDRIVE_MAX_RETRY_ATTEMPTS=5
PIPEDRIVE_REQUEST_TIMEOUT_MS=10000

WEBSITE_ID=5248
WEBSITE_NAME=CBSS
FORM_SOURCE=270
FORM_NAME=CBSS Contact Form
LEAD_TITLE_PREFIX=AD CBSS
```

Optional Pipedrive field-key overrides: see `.env.example` / `src/env/server.ts` (`PIPEDRIVE_FIELD_*`).

### Email notifications

Not used. Lead path is file store + Pipedrive only — do not configure `FORM_NOTIFICATION_*` or `SMTP_*`.

### Rate limiting

Not env-configurable. Hardcoded: **5 requests / 60 seconds / client IP** on `POST /api/contact`.

### Scheduled retries (recommended)

Hit the job endpoint on a cron (e.g. every 5–15 minutes) so failed Pipedrive deliveries retry:

```bash
curl -sS -X POST "https://cbss.example.com/api/internal/run-retries" \
  -H "Authorization: Bearer $INTERNAL_JOB_SECRET"
```

(Also accepts `x-internal-job-secret` header or `?secret=`.) Returns **503** if `INTERNAL_JOB_SECRET` is unset.

---

## 5. DNS / cutover notes

1. Point Cloudflare DNS for the CBSS hostname (and `www` if used) to the new origin.
2. Keep any legacy HTML/PHP CBSS host offline or on a different vhost so it does not compete.
3. Set `PUBLIC_SITE_URL` to the **canonical https** origin (no trailing slash) before go-live.
4. Rebuild after env/domain changes: `npm run build` then restart Node so `/api/geo` and SSR routes are in `dist/`.
5. Confirm outbound HTTPS from the Node host to Pipedrive (and SMTP if used).

---

## 6. Post-go-live smoke test

| Check | Command / action | Pass criteria |
|-------|------------------|---------------|
| Homepage | Open `/` | 200, branding/layout OK |
| Assets | CSS/images load | No mixed-content / 404 |
| Geo | `curl -s /api/geo` | 200 JSON; phone dial code matches visitor country in browser |
| Contact form | Submit footer contact with valid data | Success status; Pipedrive person/lead; row under `LEAD_STORE_DIR` |
| Multi-step form | Complete quiz + submit | Same as above; message includes quiz answers |
| Invalid form | Name with URL / letters in phone | Client field errors; API 422 if forced |
| Dashboard | `/internal/operations/login` | Login works; leads + failures visible |
| Export | Dashboard export (if used) | CSV/JSON downloads |
| Retry job | `POST /api/internal/run-retries` with secret | 200 JSON; no 503 |
| HTTPS cookie | Login over https | Session persists; no secure-cookie drop |

---

## 7. Permissions summary (for the server guy)

Grant the **Node process user** (`cbss` or similar):

1. Read the release directory (`current` / app files under `/var/www/cbss/current`).
2. **Write** to `/var/cbss/leads`, `internal-admin`, `internal-uploads`, `enhanced-live`.
3. Bind outbound HTTPS to Pipedrive API (and SMTP if used).
4. Listen on localhost `PORT` (default `4321`) or whatever nginx proxies to.
5. Cloudflare account access to edit **WAF / Bot Fight / Cache Rules** so `/api/*` and `/internal/operations*` are never challenged or wrongly cached.

Without (2), leads and dashboard state will fail even if the homepage HTML looks fine.  
Without (5), form POSTs often look like “API broken” but are Cloudflare blocks.

---

## 8. App surface (quick map)

| Area | Route / path |
|------|----------------|
| Landing page | `/` |
| Forms API | `POST /api/contact` |
| IP country | `GET /api/geo` |
| Ops login | `/internal/operations/login` |
| Ops home | `/internal/operations/` |
| Leads | `/internal/operations/leads/` |
| Failures / retries UI | `/internal/operations/failures/` |
| Job runner | `/api/internal/run-retries` |

Forms: AJAX JSON only after client validation → server validation → file store → Pipedrive (then optional email). Invalid data must **not** reach Pipedrive.

---

## 9. Contacts / ownership

| Area | Owner |
|------|--------|
| App code / env values / Pipedrive field mapping | Dev team |
| Server user, dirs, systemd, nginx | Server guy |
| Cloudflare WAF / DNS / SSL | Server guy + whoever owns CF account |
| Dashboard users / lead triage | Ops (roles in `DASHBOARD_USERS_JSON`) |

---

## 10. Differences vs Connect Group Astro handoff

| Topic | Connect Group | CBSS (this app) |
|-------|---------------|-----------------|
| Scope | Full marketing site + SEO admin | Single CBSS landing + forms + lead ops |
| SEO SSR (`robots` / `llms` / sitemaps) | Required CF allow-list | Not in this build yet |
| Enhanced PHP live dir | Often required | Scaffolded; not primary for go-live |
| `npm start` | May vary | Use `node ./dist/server/entry.mjs` |
| Website id / lead prefix | Connect Group values | `WEBSITE_ID=5248`, `LEAD_TITLE_PREFIX=AD CBSS` |

Same core ops model: **Node standalone + persistent lead dir + Cloudflare allow API/dashboard + Pipedrive secrets outside git.**
