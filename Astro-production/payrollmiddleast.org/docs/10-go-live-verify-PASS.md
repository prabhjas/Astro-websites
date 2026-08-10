# Phase 10 — Go-live verify PASS (loopback)

| Field | Value |
|-------|-------|
| **Domain** | payrollmiddleast.org |
| **Fleet id** | `payrollmiddleast` |
| **Port** | **5110** |
| **Peer** | peomiddleast.com (full CMS) |
| **Canonical** | `https://www.payrollmiddleast.org` |
| **Date** | 2026-08-07 |
| **Branch** | `rajpal-branch` |
| **Result** | **PASS** (local / loopback) |

## Working note

- Mode: **full CMS** (`FEATURES_FULL_CMS`)
- Port: reserved placeholder **5110** (renamed from misspelled `payrollmiddleeast.org` → `payrollmiddleast.org`)
- Forms: `POST /api/contact` + attribution; Pipedrive path wired (token optional locally; set real token + `WEBSITE_ID` before prod)
- No SMTP / `FORM_NOTIFICATION_EMAILS` / `FORM_FROM_*` required

## Checklist (docs/10-GO-LIVE-VERIFY-CHECKLIST.md)

| Check | Result |
|-------|--------|
| Trailing slash bare → `/` | **PASS** (`/about-us` → 301 `/about-us/`) |
| Absolute canonicals | **PASS** (`https://www.payrollmiddleast.org/...`) |
| `/robots.txt`, sitemaps, `/llms.txt`, `/llm.txt` | **PASS** 200 |
| `/runtime-gtm.js` | **PASS** 200 |
| Contact + gclid/UTM on lead store | **PASS** (`gclid`, `campaignId`, `device` present) |
| Internal APIs deny without bearer | **PASS** 403 |
| Internal APIs OK with bearer | **PASS** 200 |
| 404 branding = this site only | **PASS** (Payroll Middle East + `Logo-Payroll-Middleast.png`) |
| Logo asset 200 | **PASS** |
| Local asset audit (refs on disk, no HTML soft-404 fakes) | **PASS** — `npm run assets:verify` → 0 missing / 0 masquerades; `public/wp-content` synced to `dist/client` (`npm run assets:sync-dist`) |
| HTTP image/CSS probe on key pages | **PASS** — 252/252 local `/wp-content` assets 200 on `/`, `/about-us/`, `/insights/`, `/author/`, `/author/gregg-steyn/`, `/contact-us/`, sample posts |
| Content parity vs live sitemaps | **PASS** — 94 pages + 68 posts imported/prepared |
| Key routes 200 | **PASS** `/`, `/about-us/`, `/contact-us/`, `/insights/`, `/company/…`, `/country/…`, posts |
| Fleet smoke | **PASS** (`node scripts/fleet-local.mjs smoke payrollmiddleast`) |
| Deploy templates in git | **PASS** `deploy/payrollmiddleast.service`, `deploy/payrollmiddleast.org.caddy`, `caddy/Caddyfile.production` block |
| No `.env` / secrets committed | **PASS** (gitignored) |
| Malware scan Phase 01 | **PASS** — 0 PHP in public/source |

## Owner cutover (not done by developer)

→ [OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md)

Notes for owner:

1. Live WP currently has an **expired TLS cert**; fix Cloudflare/origin cert before public cutover.
2. Confirm Pipedrive **Website** option ID (`.env.example` uses placeholder `5110`).
3. Set `PUBLIC_GTM_ID` if a GTM container exists (live homepage showed GA4 `G-4V1NN085TV` only).
4. Install systemd unit + merge Caddy block; do **not** reload live Caddy from this branch without owner process.

## Paste for handoff

*Phase 01–10 complete for payrollmiddleast.org. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md.*
