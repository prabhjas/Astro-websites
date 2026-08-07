# Phase 10 — Go-live verify PASS report

**Site:** peomiddleast.com · **Fleet id:** `peomiddleeast` · **Port:** `5118`  
**Peer:** eormiddleast.com (full CMS) · **Branch:** `mushtaq-branch`  
**Loopback:** `http://127.0.0.1:5118/` · **Canonical:** `https://peomiddleast.com`  
**Date:** 2026-08-05

## Working note

| Field | Value |
|-------|--------|
| Domain | peomiddleast.com |
| Peer | eormiddleast.com |
| Mode | full CMS (`FEATURES_FULL_CMS`) |
| Port | 5118 (registry + fleet-sites; next free remains **5124**) |

## Phase checklist (01–10)

| Phase | Status | Notes |
|-------|--------|--------|
| 01 Security scan | PASS | 0 PHP in public; report `docs/01-malware-scan-report.md` |
| 02 Convert / place | PASS | `Astro-production/peomiddleast.com/` SSR + catalog |
| 03 Fleet + CMS + FLOW | PASS | `fleet-sites.json` scaffolded; thin `/api/internal/*`; `cms.ts` FULL_CMS |
| 04 Forms / Pipedrive | PASS | `/api/contact`; newsletter email-only; Pipedrive `delivered` |
| 05 Redirects / SEO / slash | PASS | `trailingSlash: always`; absolute canonicals; robots/sitemap/llms 200 |
| 06 Local smoke | PASS | `fleet-local.mjs smoke peomiddleeast` all green |
| 07 Harden gates | PASS | internal deny 403 / auth 200; no SMTP/`FORM_NOTIFICATION_*` |
| 08 Deploy templates (git) | PASS | `deploy/peomiddleeast.service`, `.caddy`, `ROOT_SETUP.md`; block in `caddy/Caddyfile.production` |
| 09 Server app sync | N/A (dev) | Owner/webdev host step when ready |
| 10 Verify checklist | **PASS** (loopback) | See matrix below |

## 10-GO-LIVE-VERIFY matrix (loopback)

| Check | Result |
|-------|--------|
| Bare `/contact` → 301 `/contact/` | PASS |
| `/contact/` → 200 | PASS |
| `/runtime-gtm.js` → 200 + `recreateScript` | PASS |
| Absolute canonical `https://peomiddleast.com/…` | PASS |
| robots / sitemap_index / llms.txt → 200 | PASS |
| `/api/health/` → 200 | PASS |
| Contact + gclid/UTM → 200; lead has `gclid` | PASS |
| Pipedrive `deliveryStatus: delivered` | PASS |
| Internal no bearer → 403 | PASS |
| Internal bearer → 200 | PASS |
| 404 = PEO Middle East logo/brand (not peer) | PASS |
| Logo asset 200 | PASS |
| Homepage / insights 200 | PASS |
| No `.env` secrets committed | PASS (gitignored) |

## Fleet smoke

```
PASS homepage, health, 404, internal-deny, internal-auth, contact
All smoke checks passed
```

## Owner next steps (not done by developer)

1. App sync to `/opt/Astro-production/peomiddleast.com/` + `.env.prod` (Phase 09)  
2. Run **[docs/OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md)** for live Caddy / systemd  
3. Re-run this checklist on **public HTTPS**

**Paste for handoff:**  
Phase 01–10 complete for peomiddleast.com. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md.
