# Phase 10 — loopback verify (movey.ae)

**Date:** 2026-08-07 · **Port:** 5104 · **Canonical:** https://movey.ae/

| Check | Result |
|-------|--------|
| Trailing slash (bare → `/`) | PASS — `301` → `/house-movers-in-dubai/` |
| Absolute canonical on `/` | PASS — `https://movey.ae/` |
| `/robots.txt` | PASS — 200 `text/plain` |
| `/sitemap_index.xml` | PASS — 200 `application/xml` |
| `/llms.txt` + `/llm.txt` alias | PASS — 200 after rebuild + process restart |
| GTM loader + `recreateScript` | PASS — `data-runtime-gtm="1"`, `/runtime-gtm.js` OK |
| GA4 interim ID | PASS — `G-SNFHTDS0Z7` (no inline GTM in mirror HTML) |
| `POST /api/contact` | PASS — fleet smoke 200, lead file store |
| Internal API deny / auth | PASS — 403 without bearer, 200 with `local-fleet-test-secret` |
| 404 branding | PASS — Movey `Logo-color.png` only |
| Organization JSON-LD | PASS — homepage |
| Malware scan (Phase 01) | PASS — 0 PHP in `public/` |
| Deploy templates in git | PASS — `deploy/movey.service`, `deploy/movey.ae.caddy`, `caddy/Caddyfile.production` block |
| No `.env` / secrets in git | PASS — gitignored |

**Fleet smoke:** `node scripts/fleet-local.mjs smoke movey` — all checks passed (local `PIPEDRIVE_API_TOKEN=local-smoke-not-real` in gitignored `.env` only).

**Owner next:** [OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md) — do not reload live Caddy from dev.

**Paste:** Phase 01–10 complete for movey.ae. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md. Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md.
