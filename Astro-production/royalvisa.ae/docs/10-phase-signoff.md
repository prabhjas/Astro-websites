# Phase completion checklist — royalvisa.ae

**Date:** 2026-08-04  
**Local:** http://127.0.0.1:5097/  
**Master:** `docs/00-NEW-SITE-MASTER.md`  
**Final QA report:** `docs/10-final-qa-report.json`

| Phase | Result |
|-------|--------|
| 01 Security scan | PASS — `docs/01-malware-scan-report.md` SAFE |
| 02 Convert / place | PASS — `Astro-production/royalvisa.ae/` Full CMS peer |
| 03 Fleet + CMS + FLOW | PASS — port **5097**, `FEATURES_FULL_CMS`, thin `/api/internal/*` |
| 04 Forms / attribution | PASS — CF7 → `/api/contact`; gclid/campaignId/device on lead store |
| 05 Redirects / SEO | PASS — **23** live-probe + alias rules; robots/sitemaps/llms 200 |
| 06 Local run + smoke | PASS — `fleet-local smoke royalvisa` |
| 07 Harden gates | PASS — internal deny 403; bearer 200; unique local secret |
| 08 Deploy templates | PASS — `deploy/*` + `caddy/Caddyfile.production` site block |
| 09 Server cutover | **OPS PENDING** — see `docs/13-go-live-server-handoff.md` |
| 10 Final A–D (local) | PASS — build, smoke, forms, attribution, SEO, deploy artifacts |
| 10 E (production) | After Phase 09 |

## Final QA matrix (2026-08-04 · re-run 12:35 UTC)

| Check | Result |
|-------|--------|
| Fleet smoke | **PASS** (home, health, 404, internal, contact) |
| Inventory pages (10) | **10/10** HTTP 200 |
| Blog posts (57) | **57/57** HTTP 200 |
| Redirects (23) | **23/23** 301 |
| SEO files | robots, sitemaps, llms/llm, runtime-gtm, health, geo — 200 |
| Blog listing API + tabs | 57 posts; cancel tab → 1 post; pagination 7 pages |
| Contact + attribution | 200 success |
| Internal APIs | bearer 200 / deny 403; posts 200 |
| Hardcoded GTM in SSR | none — only `/runtime-gtm.js` |
| Phone field | no dial-code overlap; IP flag OK |
| Contact map branding | Royal Visa / City Tower |
| FAQ accordion | open / collapse / exclusive panel — **no ghost text**; no underlines |

```bash
# Re-run locally
cd Astro-production/royalvisa.ae
node scripts/final-qa.mjs
node scripts/final-qa-ui.mjs   # needs Playwright at monorepo root
```

## Definition of done (local)

Phases **01–08** and **10 A–D** are complete. Site is ready for **ops deploy** (Phase 09 + 10 E).

## Known non-blockers

- Some live-origin upload URLs already 404 on WordPress (esp. `/wp-content/uploads/2025/10/*`).
- Pipedrive may return dataset validation errors with incomplete pipeline env — lead file store still writes.
- Phase 09 (live Caddy/systemd/Cloudflare/FLOW registration) requires server access.
