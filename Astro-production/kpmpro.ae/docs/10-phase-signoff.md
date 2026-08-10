# Phase completion checklist — kpmpro.ae

**Date:** 2026-08-05  
**Branch:** `mushtaq-branch`  
**Local:** http://127.0.0.1:5124/  
**Master:** `docs/00-NEW-SITE-MASTER.md`  
**Verify:** `docs/10-GO-LIVE-VERIFY-CHECKLIST.md`

| | |
|--|--|
| **Domain** | kpmpro.ae |
| **Peer** | `royalvisa.ae` / `kinzahr.com` (Full CMS mirror patterns) |
| **Mode** | Full CMS (`FEATURES_FULL_CMS`) |
| **Port** | **5124** (fleet registry; not reused) |
| **Unit** | `kpmpro` |

| Phase | Result |
|-------|--------|
| 01 Security scan | **PASS** — `docs/01-malware-scan-report.md` + 2026-08-05 public re-scan: **0 PHP**; eval hits = vendor jQuery/min only |
| 02 Convert / place | **PASS** — `Astro-production/kpmpro.ae/`; catalog `astro`; Node SSR |
| 03 Fleet + CMS + FLOW | **PASS** — `scripts/fleet-sites.json` id `kpmpro` port **5124**; thin `/api/internal/*`; `cms.ts` `FEATURES_FULL_CMS` |
| 04 Forms / attribution | **PASS** — CF7 → `POST /api/contact/`; gclid/UTM/campaignId/device on lead store; Pipedrive website **862**; no SMTP / `FORM_NOTIFICATION_*` |
| 05 Redirects / SEO / slash | **PASS** — KPM-only `redirects.yml` (Royal Visa leftovers removed); robots/sitemaps/llms 200; `trailingSlash: always` + middleware |
| 06 Local run + smoke | **PASS** — `node scripts/fleet-local.mjs smoke kpmpro` all green |
| 07 Harden gates | **PASS** — internal deny **403** (slashed); bearer **200** (fleet smoke); unique `INTERNAL_JOB_SECRET` in local `.env` (not committed) |
| 08 Deploy templates (git) | **PASS** — `deploy/kpmpro.service`, `deploy/kpmpro.ae.caddy`, `deploy/ROOT_SETUP.md`; **`caddy/Caddyfile.production`** site + HTTP alt-host (git only; **no** live Caddy reload) |
| 09 Server app sync | **OPS PENDING** — owner/webdev: `docs/13-go-live-server-handoff.md` + `docs/OPS-OWNER-CADDY-CUTOVER.md` |
| 10 Go-live verify (loopback) | **PASS** — matrix below |

## Phase 10 loopback matrix (2026-08-05)

| Check | Result |
|-------|--------|
| Trailing slash bare → `/` | **PASS** — `/about-us` → **301** `Location: /about-us/` |
| Slashed page | **PASS** — 200 |
| Assets no slash redirect | **PASS** — `/runtime-gtm.js` 200 |
| Absolute canonical | **PASS** — `https://kpmpro.ae/`, `/about-us/`, blog post absolute |
| robots / sitemap / llms / llm | **PASS** — all 200 |
| `/runtime-gtm.js` recreateScript | **PASS** |
| Health | **PASS** — `{ ok: true, service: kpmpro-ae-astro }` |
| Contact + gclid/UTM | **PASS** — 200; lead `verify-golive@example.com`; gclid/utm/campaignId/device stored; Pipedrive `delivered` |
| Internal deny / auth | **PASS** — deny **403** on `/api/internal/leads/`; auth **200** (smoke) |
| Sample redirect | **PASS** — `/about/` → `/about-us/`; `/golden-visa/` → `/uae-golden-visa/` (200) |
| 404 brand | **PASS** — KPM Pro logo + favicon only (no Royal Visa assets) |
| Fleet smoke | **PASS** — home, health, 404, internal, contact |
| Deploy artifacts in git | **PASS** — `dist/server/entry.mjs` built; deploy templates + Caddy block |
| Secrets | **PASS** — `.env` / `.data` gitignored; not committed |

## Definition of done (local)

Phases **01–08** and **10 (loopback)** are complete. Ready for **owner Caddy / public DNS** after Phase 09 app sync on host.

```text
Phase 01–10 complete for kpmpro.ae. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md.
Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md (do not reload live Caddy from this branch alone).
```

## Local commands

```bash
# monorepo root, mushtaq-branch
pnpm install
node scripts/fleet-local.mjs up kpmpro
node scripts/fleet-local.mjs smoke kpmpro
# → http://127.0.0.1:5124/
```

## Known non-blockers

- Bare `/api/internal/leads` (no slash) may **301** to `/api/internal/leads/` via Astro `trailingSlash: always`; deny/auth checks use the slashed path (fleet smoke).
- Some live WP upload URLs may already 404 on origin; local media coverage is best-effort via `public/wp-content`.
- Phase 09 + public HTTPS re-verify remain after owner cutover.
