# Phase 06/07/10 local verify — connectbusinesscenter.com

| | |
|--|--|
| **When** | 2026-08-08 |
| **Base** | `http://127.0.0.1:5116` |
| **Result** | **ALL CHECKS PASSED** |

## fleet-local smoke

```
PASS homepage, health, 404, internal-deny (403), internal-auth (200), contact (200)
```

## Harden / go-live loopback

| Gate | Result |
|------|--------|
| G1 404 | PASS |
| G2 contact empty 422 / valid 200 | PASS |
| G3 health | PASS |
| G5 no CMS UI | PASS (`/internal/operations/` → 404) |
| G6 bearer deny/allow | PASS |
| G13 attribution fields accepted | PASS |
| Trailing slash | PASS |
| Canonical absolute | PASS |
| Organization JSON-LD | PASS (Rank Math; `@type` may be `["Person","Organization"]`) |
| `/sitemap_index.xml` + page/post (no empty law) | PASS |
| `/robots.txt` `/llms.txt` `/runtime-gtm.js` | PASS |
| Insights + contact-us mirrors | PASS |
| `/home/` → `/` | PASS |

## Fixes during Phase 04–10

- Prefer `/api/contact/` with trailing slash (peer pattern).
- `prepare-page.mjs` GTM strip must not cross `<script>` boundaries (was deleting Rank Math JSON-LD).
- Re-ran `prepare:all` → 222/222 cleaned pages keep `rank-math-schema-pro`.
- UAE/Dubai `llms-defaults.json` (not KSA peer copy).
- Git Caddy site block + one-hop `http://www.connectbusinesscenter.com`.

## Notes

- Local Pipedrive uses a non-production smoke token so `getServerEnv()` loads; replace with real credentials in server `.env.prod` before cutover.
- `fleet-local` forces `INTERNAL_JOB_SECRET=local-fleet-test-secret` for laptop smoke.
- Public HTTPS / live Caddy reload remains **owner** work (`OPS-OWNER-CADDY-CUTOVER`).
