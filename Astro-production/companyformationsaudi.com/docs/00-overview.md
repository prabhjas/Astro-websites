# Company Formation Saudi (companyformationsaudi.com) — Astro fleet

| | |
|--|--|
| **Port** | **5114** |
| **Unit** | `companyformationsaudi` |
| **Peer** | Full CMS — `connectresources.sa` |
| **Features** | `FEATURES_FULL_CMS` |
| **Live** | https://companyformationsaudi.com/ |
| **Local** | http://127.0.0.1:5114/ |

## Inventory (mirrored 2026-08-04)

| Kind | Count |
|------|------:|
| Pages | 10 |
| Posts | 57 |
| Prepared `.cleaned.html` | 67 |
| Blog JSON (FLOW) | 57 |

## Status

| Phase | Status |
|-------|--------|
| 01 Malware scan | Done — SAFE TO CONTINUE (`docs/01-malware-scan-report.md`) |
| 02 Convert / scaffold | Done |
| 03 Fleet + CMS + FLOW | Done — thin mounts, `cms.ts` bound |
| 04 Forms / attribution | Done — CF7 → `/api/contact` via `astro-mirror-fixes.js` |
| 05 Redirects / SEO | Done — **23** rules (live probe + sensible aliases, peer SA pattern); robots/sitemaps/llms 200 |
| 06 Local smoke | Green (`fleet-local smoke companyformationsaudi`) |
| 07 Harden | Bearer 401/200 OK; unique `INTERNAL_JOB_SECRET` in local `.env` |
| 08 Deploy templates | `deploy/companyformationsaudi.service` + `companyformationsaudi.com.caddy` + `ROOT_SETUP.md` |
| 09 Server cutover | **Ops** — templates + `caddy/Caddyfile.production` ready; see `docs/13-go-live-server-handoff.md` |
| 10 Final checks | Local A–D + full page/post QA green (`docs/10-phase-signoff.md`, `docs/10-final-qa-report.json`); E after cutover |

## Local commands

```bash
# monorepo root
pnpm install
node scripts/fleet-local.mjs up companyformationsaudi
node scripts/fleet-local.mjs smoke companyformationsaudi

# refresh mirror from live
cd Astro-production/companyformationsaudi.com
pnpm run import:sitemap:download
pnpm run assets:download-all
pnpm run migrate:posts
pnpm run chrome:extract
```

## Known live gaps (matched, not invented)

Some Rank Math image URLs (esp. `/wp-content/uploads/2025/10/*.webp` and sized visual-selection thumbs) already **404 on live**. The clone mirrors that — do not invent replacements unless marketing supplies files.

Live contact map still titled “Connect Resources Dubai” on origin; local cleaned HTML points at **Company Formation Saudi / City Tower 2**.

## Notes

- Theme chrome is **Astra** (`#masthead` / `#colophon`), not Elementor Theme Builder headers. Shared-chrome swap is a no-op; each page keeps its own export chrome.
- Posts are served from prepared Elementor HTML for pixel fidelity; JSON store powers FLOW CMS edits + `/api/blog/listing`.
- GA4 on live: `G-WG16DPP9YT` (set in `.env.example` / local `.env`).
