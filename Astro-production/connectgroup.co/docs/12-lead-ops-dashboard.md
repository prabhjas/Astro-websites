# Internal operations dashboard

The operations dashboard is served from `/internal/operations/` and runs entirely on the server. It reads the same file-backed lead store used by `/api/contact`, so the internal view always reflects the persisted source of truth. Legacy `/internal/lead-operations/*` URLs redirect to the new path.

## What it includes

- Protected login page for internal users
- Overview page with lead and delivery counts
- Lead listing with search plus CSV and JSON export
- Lead detail page with full stored form data and delivery attempt history
- Failure queue with manual retry for developer and admin roles
- Enhanced PHP deployment panel for persistent `enhanced/`-style files
- Global GTM manager with runtime loader injection
- Redirect import panel for Rank Math JSON
- SEO controls for live `robots.txt`, `llm.txt` / `llms.txt`, and sitemap priority/changefreq overrides
- Restricted internal uploads area with authenticated download/delete
- `noindex` and `X-Robots-Tag` protection on all dashboard and internal API routes

## Environment variables

Add the following variables before enabling the dashboard:

```bash
DASHBOARD_PATH=/internal/operations
DASHBOARD_SESSION_SECRET=replace-with-a-long-random-secret
DASHBOARD_SESSION_TTL_MINUTES=480
INTERNAL_JOB_SECRET=replace-with-a-long-random-secret
INTERNAL_UPLOAD_DIR=.data/internal-uploads
INTERNAL_UPLOAD_MAX_FILE_BYTES=10485760
INTERNAL_ADMIN_DIR=.data/internal-admin
INTERNAL_ENHANCED_LIVE_DIR=/var/www/html/enhanced
DASHBOARD_USERS_JSON=[{"email":"ops@example.com","role":"super_admin","passwordHash":"scrypt$..."},{"email":"seo@example.com","role":"seo","passwordHash":"scrypt$..."}]
```

Supported roles:

- `viewer`: read-only dashboard access and CSV export
- `developer`: viewer access plus manual retry and upload/delete actions
- `seo`: SEO workspace (`robots.txt`, `llm.txt`, sitemap priority/changefreq) plus redirect import/edit. No lead, GTM, PHP, or upload access
- `super_admin`: developer access plus PHP deployment, GTM changes, redirect imports, and SEO file/sitemap overrides

## Creating password hashes

Passwords are stored as scrypt hashes, not plain text. Generate a hash with this Node command:

```bash
node --input-type=module -e "import { randomBytes, scryptSync } from 'node:crypto'; const password='replace-me'; const salt=randomBytes(16).toString('hex'); const hash=scryptSync(password, salt, 64).toString('hex'); console.log(`scrypt$${salt}$${hash}`);"
```

Paste the resulting `scrypt$...` value into `DASHBOARD_USERS_JSON`.

## Notes

- The session cookie is signed with `DASHBOARD_SESSION_SECRET` and marked `httpOnly`.
- Manual retries reuse the same store-first delivery flow as the public contact endpoint.
- Automatic retries can be triggered securely through `/api/internal/run-retries` using `INTERNAL_JOB_SECRET`.
- Enhanced PHP uploads are versioned in `INTERNAL_ADMIN_DIR` and copied into the live PHP-served folder at `INTERNAL_ENHANCED_LIVE_DIR`.
- GTM is injected at runtime via `/runtime-gtm.js`, so changing the global GTM config does not require editing each legacy page manually.
- Imported redirects are stored persistently and also synced back into the repo redirect source when the server has write access.
- SEO files are stored under `INTERNAL_ADMIN_DIR` (`robots.json`, `llm.json`, `llms-config.json`, `sitemap-overrides.json`) and served by SSR public endpoints (`/robots.txt`, `/llm.txt`, `/llms.txt`, `/sitemap_index.xml`, child sitemaps). URL discovery stays automatic from published pages/posts; `llms.txt` auto-rebuilds from that same discovery (grouped via `src/data/llms-defaults.json` + dashboard intro settings), with an optional full-body override mode. Sitemap overrides only decorate priority and changefreq.
- This is an interim auth model for the file-store phase. When a real database/session store is introduced, migrate users, sessions, audit trails, and uploads into durable server-side storage.
