# Internal APIs (central CMS)

Per-site dashboard UI (`/internal/operations/*`) has been removed. Content, leads, SEO, redirects, GTM, uploads, and PHP files are managed from the **central CMS**, which calls this site’s file-backed APIs.

## Auth

All `/api/internal/*` routes require `INTERNAL_JOB_SECRET`:

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Also accepted: `x-internal-job-secret: <secret>` or `?secret=<secret>` (cron).

Cookie sessions / CSRF / `DASHBOARD_USERS_JSON` are no longer used for these routes.

## Environment

```bash
INTERNAL_JOB_SECRET=replace-with-a-long-random-secret
INTERNAL_ADMIN_DIR=.data/internal-admin
INTERNAL_UPLOAD_DIR=.data/internal-uploads
INTERNAL_UPLOAD_MAX_FILE_BYTES=10485760
INTERNAL_ENHANCED_LIVE_DIR=.data/enhanced-live
LEAD_STORE_DIR=.data/leads
```

Do **not** set `HOST` / `PORT` in `.env.prod` - systemd/deployment must set them per site.

Generate lockfiles on Linux (or ensure optional platform packages for both `darwin` and `linux`) so `npm ci` works on the server.

## Health / observability

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness `{ ok: true }` for Caddy/systemd |
| - | stdout JSON | Form + Pipedrive events; middleware emits `http_access` for HTML/API |

## Read APIs (JSON)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/internal/leads` | List leads (`?q=` `?status=`) |
| GET | `/api/internal/leads/:publicId` | Lead detail + attempts |
| GET | `/api/internal/export-leads` | CSV/JSON export (`?format=json\|csv`) |
| GET | `/api/internal/posts` | List posts |
| GET | `/api/internal/posts/:slug` | One post |
| GET | `/api/internal/posts/categories` | Categories |
| GET | `/api/internal/posts/tags` | Tags |
| GET | `/api/internal/redirects` | Redirects + hit stats |
| GET | `/api/internal/gtm` | Global GTM config |

## Write APIs

Mutation routes (posts/categories/tags save+delete, redirects, GTM, SEO, uploads, PHP files, `retry-lead`, `run-retries`) return JSON (`{ success: true, ... }`) for the central CMS.

## TLS / Origin

TLS terminates at Cloudflare/Caddy and proxies to Node over HTTP. `astro.config.mjs` sets `security.allowedDomains` for this hostname. Public contact forms post **JSON** (not FormData) so Astro’s form `checkOrigin` middleware does not apply.

## Leads

Leads stay file-backed **per site** under `LEAD_STORE_DIR`. Lead viewing/retry lives in the **central CMS** via the lead GET APIs above (plus `retry-lead` / `run-retries`).
