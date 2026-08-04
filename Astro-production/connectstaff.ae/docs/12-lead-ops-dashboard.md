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

Do **not** set `HOST` / `PORT` in `.env.prod` — systemd/deployment must set them per site.

Generate lockfiles on Linux (or ensure optional platform packages for both `darwin` and `linux`) so `npm ci` works on the server.

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

Existing mutation routes remain (posts/categories/tags save+delete, redirects, GTM, SEO, uploads, PHP files, `retry-lead`, `run-retries`). They now return JSON (`{ success: true, ... }`) instead of 303 redirects to the old dashboard.

## TLS / Origin

Caddy terminates HTTPS and proxies to Node over HTTP. `astro.config.mjs` sets `security.allowedDomains` for this hostname. Public contact forms post **JSON** (not FormData) so Astro’s form `checkOrigin` middleware does not apply.

## Leads

Leads stay file-backed **per site** under `LEAD_STORE_DIR`. With the per-site UI removed, lead viewing/retry must live in the **central CMS** via the lead GET APIs above (plus `retry-lead` / `run-retries`). Do not drop those endpoints.
