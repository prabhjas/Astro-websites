# ngmanpower.com — Phase 01–10 local PASS (2026-08-05)

| Field | Value |
|-------|--------|
| Domain | ngmanpower.com |
| Fleet id / unit | `ngmanpower` |
| Port | **5102** (reserved placeholder → scaffolded) |
| Peer engine | connectfz.com (`FEATURES_FULL_CMS`) |
| Theme | Live **Impreza** (not peer Oklahoma) |
| Branch | mushtaq-branch |

## Content import
- 14 pages + 6 posts from live HTML (REST/sitemaps blocked by live security)
- Assets downloaded; Impreza CSS from live
- Malware scan: **0 PHP** — `docs/malware-scan-2026-08-05.md`

## Local
```bash
pnpm install
node scripts/fleet-local.mjs up ngmanpower
node scripts/fleet-local.mjs smoke ngmanpower   # PASS
```
Loopback: http://127.0.0.1:5102/

## Deploy templates (git only)
- `deploy/ngmanpower.service`
- `deploy/ngmanpower.com.caddy`
- **Not** added to live `caddy/Caddyfile.production` cutover set — owner later per OPS-OWNER-CADDY-CUTOVER.md

## Secrets
- `.env` / `.env.prod` gitignored
- Set real `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_OWNER_ID`, `WEBSITE_ID` before prod
- Unique `INTERNAL_JOB_SECRET` for prod (`openssl rand -hex 32`)

## Known gaps (non-blocking for Phase 10 smoke)
- Full post sitemap parity deferred (live sitemaps return HTML)
- Peer leftover author stubs from connectfz still prerender (empty lists)
- Visual polish vs live may need more Ultimate VC / Smart Slider assets
