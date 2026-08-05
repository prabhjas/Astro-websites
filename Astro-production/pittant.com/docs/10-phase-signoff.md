# pittant.com — Phase 10 go-live verify (loopback)

| Field | Value |
|-------|-------|
| **Date** | 2026-08-05 |
| **Branch** | `mushtaq-branch` |
| **Peer** | `redo.ae` (`FEATURES_FULL_CMS` WP HTML mirror) |
| **Port** | **5111** |
| **Canonical** | `https://pittant.com` |
| **Local** | `http://127.0.0.1:5111` |

## Working note

| Item | Choice |
|------|--------|
| Domain | pittant.com |
| Peer | redo.ae |
| Mode | Full CMS |
| Port | 5111 (pre-reserved; not 5124) |

## Phase checklist

| Phase | Status |
|-------|--------|
| 01 Security scan | **PASS** — 0 PHP in `public/`; report in `docs/01-malware-scan-report.md` |
| 02 Convert / place | **PASS** — `Astro-production/pittant.com/` |
| 03 Fleet + CMS + FLOW | **PASS** — `fleet-sites.json` scaffolded; thin `/api/internal/*`; `cms.ts` `FEATURES_FULL_CMS` |
| 04 Forms / attribution | **PASS** — `POST /api/contact` + Pipedrive path; no SMTP required |
| 05 Redirects / SEO / slash | **PASS** — `trailingSlash: always`; absolute canonicals; robots/sitemaps/llms 200 |
| 06 Local smoke | **PASS** — `fleet-local smoke pittant` all green |
| 07 Harden gates | **PASS** — unique secret (fleet-local test secret locally); internal deny 403; contact validates |
| 08 Deploy templates (git) | **PASS** — `deploy/pittant.service`, `deploy/pittant.com.caddy`, `Caddyfile.production` block |
| 09 Server app sync | **N/A (owner)** — not done from laptop |
| 10 Verify checklist | **PASS (loopback)** — see below |
| Owner Caddy | **Pending** — do **not** reload live Caddy; hand off `docs/OPS-OWNER-CADDY-CUTOVER.md` |

## 10-GO-LIVE-VERIFY-CHECKLIST (loopback)

| Check | Result |
|-------|--------|
| Trailing slash bare → `/` | **PASS** (`/about-us` → 301 `/about-us/`) |
| Absolute canonical | **PASS** (`https://pittant.com/`) |
| robots / sitemap_index / page / post / llms / llm | **PASS** 200 |
| `/runtime-gtm.js` + `recreateScript` + `GTM-TXNVDFBM` | **PASS** |
| Contact + gclid / UTM | **PASS** (`gclid=test-gclid`, `utmSource=verify` on lead store; Pipedrive 401 expected with local smoke token) |
| Internal deny / auth | **PASS** 403 / 200 |
| 404 brand = Pittant + logo | **PASS** |
| Content parity (key pages) | **PASS** structural match vs live |
| Images / assets | **PASS** (homepage assets 86/89; wp-json expected 404) |
| Deploy artifacts in git | **PASS** |
| No `.env` secrets committed | **PASS** (gitignored) |

## Finalize QA (2026-08-05, post redirection-log + polish)

| Check | Result |
|-------|--------|
| Redirects YAML | **19 rules** — 11 aliases + **8** unique pairs from `imports/redirects/2026-08-05-redirection-log.csv` |
| Local redirect smoke | **19/19 PASS** |
| Sitemap index / page / post | **PASS** — 64 pages, 102 posts, all `https://pittant.com/…` |
| robots.txt | **PASS** — aligned to live Rank Math shape + Sitemap line |
| GTM | **PASS** — no hardcoded container in served HTML; `/runtime-gtm.js` from `PUBLIC_GTM_ID` |
| Images | **PASS** — Gravatars localized under `/wp-content/uploads/gravatar/`; no external img deps on key pages |
| Title parity vs live (16 key URLs) | **PASS** — 0 mismatches |

## Hotfix QA (2026-08-05 evening)

| Issue | Fix | Browser QA |
|-------|-----|------------|
| Broken `astro-mirror-fixes.js` (syntax) | Restored `ensureKinzaFormSkin`; cache-bust `?v=20260805-qa3` | PASS |
| TOC first-click only / no heading ids | Stamp heading ids from TOC + re-click hash clear | PASS (re-scroll) |
| Author `/page/2/` 404 | Route + live mirrors; 9 cards + images | PASS |
| Pricing FAQ accordion | Classic accordion polyfill restored with JS | PASS open/close |
| Form POST 301→404 | `fetch('/api/contact/')` trailing slash | PASS thank-you |
| Phone flag grey box | Local sprites + CSS absolute URLs + IP `pk`/+92 | PASS |

## Structural parity vs https://pittant.com/

OK: `/`, `/about-us/`, `/pricing/`, `/features/`, `/contact-us/`, `/blog/`, `/blog/page/3/`, `/author/`, `/author/arjun-vadlamani/`, `/hr-management-software-saudi-arabia/`, `/payroll-management-software-saudi-arabia/`, `/get-a-free-demo/`, `/insurances-saudi-arabia/`, `/types-of-leaves-saudi-arabia/`

## Owner next step

```text
Phase 01–10 complete for pittant.com. Loopback verify green per docs/10-GO-LIVE-VERIFY-CHECKLIST.md.
Owner: run docs/OPS-OWNER-CADDY-CUTOVER.md (port 5111, unit pittant, canonical https://pittant.com).
```

**Do not** reload `/etc/caddy` or install root units from this developer pass.
