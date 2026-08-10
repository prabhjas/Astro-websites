# Phase 01–10 sign-off — snapsale.ae

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Branch | `rajpal-branch` |
| Peer | `movey.ae` / `connecthr.ae` |
| Mode | **FEATURES_FULL_CMS** |
| Port | **5122** (reserved; not next-free 5125) |
| WEBSITE_ID | **5065** |
| Fleet id | `snapsale` |

## Phase checklist

| Phase | Result | Notes |
|-------|--------|-------|
| 01 Security scan | **PASS** | 0 PHP in public/source; eval hits = jquery/CF7/mirror-fixes only. See `docs/01-malware-scan-report.md` |
| 02 Convert / place | **PASS** | `Astro-production/snapsale.ae/` — 53 cleaned mirrors, assets filled |
| 03 Fleet + CMS + FLOW | **PASS** | `fleet-sites.json` scaffolded; thin `/api/internal/*`; `FEATURES_FULL_CMS` |
| 04 Forms / attribution | **PASS** | `POST /api/contact` + gclid on lead JSON; Pipedrive via env (no SMTP) |
| 05 Redirects / SEO / slash | **PASS** | `trailingSlash: always` + middleware; `/blog/`→`/insight/`; robots/sitemaps/llms 200 |
| 06 Local run | **PASS** | `fleet-local up/smoke snapsale` green on `:5122` |
| 07 Harden gates | **PASS** | Bearer deny 403; unique local secret; no CMS cookie UI; mirrors hygiene-only |
| 08 Deploy templates (git) | **PASS** | `deploy/snapsale.service`, `deploy/snapsale.ae.caddy`, `Caddyfile.production` block — **not** reloaded live |
| 09 Server app sync | **N/A (dev)** | Owner/webdev on host — not done in this session |
| 10 Go-live verify (loopback) | **PASS** | See below |

## Phase 10 loopback verify (`http://127.0.0.1:5122`)

| Check | Result |
|-------|--------|
| Trailing slash (`/about-us` → `/about-us/`) | 301 |
| Absolute canonical + `og:url` | `https://snapsale.ae/` |
| Homepage `og:image` | Hero image absolute HTTPS |
| Organization + `parentOrganization` | Present (Connect Group) |
| `/robots.txt` this-domain only | PASS |
| `/sitemap_index.xml` `/page-sitemap.xml` `/post-sitemap.xml` | 200 |
| `/llms.txt` + `/llm.txt` | 200; `/insight/` |
| `/runtime-gtm.js` `recreateScript` + `Cache-Control: no-store` | PASS |
| Homepage `data-runtime-gtm="1"` | PASS |
| Contact empty → validation errors | PASS |
| Contact + `gclid` → lead JSON | PASS |
| Internal APIs without bearer | 403 |
| 404 brand = Snapsale logo only | PASS |
| Key pages 200 | `/` `/about-us/` `/contact-us/` `/insight/` sell guides |
| Fleet smoke | **All smoke checks passed** |
| Pre-push QA (`docs/10-final-qa-report.json`) | **PASS** — 63 pages 200; redirects; no live WP asset `src`/`href`; no date-archive/nav `wp-json`/cdn-cgi; assets verify 503 refs; form delivered |

## Owner next

1. Sync app to `/opt/Astro-production/snapsale.ae/` with real `.env` / `.env.prod` (unique `INTERNAL_JOB_SECRET`, Pipedrive, GTM/GA4 IDs).
2. Run **[OPS-OWNER-CADDY-CUTOVER.md](../../docs/OPS-OWNER-CADDY-CUTOVER.md)** (do not reload Caddy from this PR alone).
3. Re-run [10-GO-LIVE-VERIFY-CHECKLIST.md](../../docs/10-GO-LIVE-VERIFY-CHECKLIST.md) on public HTTPS.

**Paste:** Phase 01–10 complete for snapsale.ae. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md.
