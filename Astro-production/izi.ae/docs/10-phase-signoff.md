# Phase 10 — Go-live verify (loopback) — izi.ae

**Date:** 2026-08-10  
**Base:** `http://127.0.0.1:5121`  
**Result:** **PASS** — 30 / 30 checks green  
**Machine output:** `docs/10-go-live-verify-loopback.json`

| Area | Result |
|------|--------|
| Trailing slash bare → `/` | PASS (301) |
| Absolute canonical `https://izi.ae/` | PASS |
| Organization JSON-LD | PASS |
| robots / page / post / **car** sitemaps / llms / llm | PASS 200 |
| `/runtime-gtm.js` recreateScript + `G-6FB28YLPSD` | PASS |
| Contact empty → 422; valid + gclid → lead JSON | PASS |
| Internal APIs deny without bearer | PASS |
| 404 = IZI brand + `logo-izi.png` only | PASS |
| Sample pages + car CPT + redirects `/contact` → `/contact-us/` | PASS |
| Fleet smoke (`node scripts/fleet-local.mjs smoke izi`) | PASS |

## Phase map sign-off

| Phase | Status |
|-------|--------|
| 01 Security scan | PASS (`docs/01-malware-scan-report.md`) |
| 02 Convert / place | PASS (`docs/02-convert-place.md`) |
| 03 Fleet + CMS + FLOW | PASS — port 5121, `FEATURES_FULL_CMS`, thin `/api/internal/*` |
| 04 Forms / attribution / Pipedrive | PASS — `/api/contact` + G13 gclid; Pipedrive via peer Connect account in local `.env` |
| 05 Redirects / SEO / slash | PASS — interim aliases; Rank Math-style sitemaps incl. cars |
| 06 Local run + smoke | PASS |
| 07 Harden gates | PASS — unique secret planned; bearer-only internals; no SMTP notify required |
| 08 Deploy templates (git) | PASS — `deploy/*` + `caddy/Caddyfile.production` (git only; **not** live-reloaded) |
| 09 Server app sync | **Handoff** — owner/webdev: sync to `/opt/Astro-production/izi.ae/`, `.env` + `.env.prod`, loopback health |
| 10 Verify checklist | **PASS** (this file) |

## Owner next (not done by developer)

1. Run [OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md) for `izi.ae` / port **5121** / unit `izi`.
2. Set production `INTERNAL_JOB_SECRET` (`openssl rand -hex 32`) — **do not** reuse fleet-local `local-fleet-test-secret`.
3. Confirm restic auto-discovers `.data/leads` after cutover.
4. Re-run this checklist on public HTTPS.

Paste: *Phase 01–10 complete for izi.ae. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md.*
