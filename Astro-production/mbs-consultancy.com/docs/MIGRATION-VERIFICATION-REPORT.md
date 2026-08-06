# MBS Consultancy — Migration Verification Report

**Date:** 2026-08-06  
**Live source:** https://mbs-consultancy.com/  
**Astro project:** `Astro-production/mbs-consultancy.com`  
**Fleet port:** `5099` · package `mbs-consultancy-astro` · status `scaffolded`  
**Branch:** `mushtaq-branch`  
**Status:** **AWAITING YOUR APPROVAL** — do not deploy until approved.

---

## Executive summary

Phase-1 WP → Astro mirror is scaffolded from the Connect fleet peer (`connectresources.ae`), content+assets extracted from live WordPress, and the Node SSR build runs locally. Homepage, key service pages, insights, blog, authors, categories, tags, sitemaps, and health respond **200**. Several items still need ops input or manual follow-up before cutover (listed under **Gaps**).

---

## Content inventory (migrated)

| Type | Count | Notes |
|------|------:|-------|
| Pages | **54** | All have `bodyHtml` from live `?nowprocket=1` |
| Blog posts | **148** | Paths preserved (no `/blog/` prefix on singles) |
| Categories | **8** | business, consulting, dubai, immigration, legal, news, uncategorized, visa |
| Tags | **157** | |
| Authors | **9** | IDs mapped via live post scrape (WP `/users` API is private) |
| CF7 form IDs (live) | **86, 311** | Bridged to `POST /api/contact/` |

### Migrated page paths

```
/
/about-us/
/accounting-services/
/audit-and-assurance/
/author/
/automotive/
/bank-account-opening/
/business-growth-strategy/
/business-setup-consultancy/
/commercial-law/
/consulting/
/consumer-market/
/contact-us/
/corporate-legal-services/
/corporate-pro-services/
/corporate-social-responsibility-strategy/
/criminal-law/
/crisis-management/
/digital-strategy-consulting/
/due-diligence-audit/
/energy-utilities-and-resources/
/engineering-and-construction/
/enterprise-risk-management/
/external-audit/
/family-business-governance/
/family-business-regulation/
/family-business/
/financial-statements-audit/
/financial/
/governance-risk-and-compliance/
/government-and-public/
/healthcare/
/hospitality-and-leisure/
/hr-consultancy/
/hr-strategy-development/
/ifrs-advisory-services/
/immigration-and-visa/
/immigration/
/insights/
/internal-audit/
/investment-consultancy/
/it-consultancy/
/legal/
/organization-design/
/people-and-organization/
/performance-measurement-programs/
/performance-optimization-strategy/
/pro-services/
/public-relation/
/regulatory-and-risk/
/relocation-services/
/services/
/strategy/
/visa-services/
```

### Authors

| Slug | Name | WP author id |
|------|------|-------------:|
| nakul | Nakul | 18 |
| kate | Kate Williams | 20 |
| harneet | Harneet | 21 |
| harneet-bhatia | Harneet Bhatia | 25 |
| sanjyam-dhingra | Sanjyam Dhingra | 26 |
| kane-barnard | Kane Barnard | 27 |
| riju-karappurath | Riju Karappurath | 28 |
| shakil-malik | Shakil Malik | 29 |
| muhammad-faieezvistaoutsourcing-com | muhammad-faieezvistaoutsourcing-com | 31 |

### Blog / taxonomy routes

| Route | Status |
|-------|--------|
| `/blog/`, `/blog/page/{n}/` | Working (page 2/3 smoke 200) |
| `/{post-slug}/` | Working (SSR catch-all) |
| `/insights/` | Working (WP page) |
| `/category/{slug}/` | Working |
| `/category/{slug}/page/{n}/` | Added |
| `/tag/{slug}/` | Working |
| `/tag/{slug}/page/{n}/` | Added |
| `/author/{slug}/` | Working |
| `/author/{slug}/page/{n}/` | Added |
| `/sitemap_index.xml`, `/page-sitemap.xml`, `/post-sitemap.xml` | Working |

---

## Header & Footer

| Item | Location | Notes |
|------|----------|-------|
| Header HTML | `src/data/header.html` | Impreza `#page-header` from live (~16 KB) |
| Footer HTML | `src/data/footer.html` | Impreza footer from live (~8 KB) |
| Components | `ElementorHeader.astro` / `ElementorFooter.astro` | Active-state marking for current path |
| Logo | `/wp-content/uploads/2026/06/logo-mbs.png` | Downloaded locally |

Desktop / tablet / mobile nav behaviour depends on Impreza + Elementor JS bundles under `public/wp-content/`. Visual parity QA across breakpoints is still recommended before go-live.

---

## Downloaded assets (local paths)

**Root:** `Astro-production/mbs-consultancy.com/public/`

| Directory | File count (approx) | Purpose |
|-----------|--------------------:|---------|
| `public/wp-content/uploads/` | 1164 | Media, Elementor CSS (`uploads/elementor/css/post-*.css`), fonts |
| `public/css/` | 900 | Cached/min CSS copies from extract |
| `public/wp-content/plugins/` | 71 | CF7, Elementor, phone field, etc. |
| `public/wp-content/themes/` | 17 | Impreza + child |
| `public/wp-includes/` | 6 | Core JS/CSS stubs |
| `public/scripts/` + `public/js/` | 11 | CF7 bridge, mirror fixes, Swiper |
| `public/media/signatures/` | **0** | Preserve folder ready (empty) |
| **Total under `public/`** | **~2181** | |

Crawl / inventory artefacts: `_crawl/` (sitemaps, homepage HTML, `inventory.json`, extract logs).

### Remaining absolute WordPress asset URLs

On local homepage HTML, **2** absolute `https://mbs-consultancy.com/wp-content/...` refs remain — both are SEO/OG absolute URLs for logo/hero (`og:image` / schema), which is correct for production on the same hostname. Content bodies were rewritten to root-relative paths. No third-party WP CDN hostnames observed in the home body.

---

## Email signatures

| Check | Result |
|-------|--------|
| `/media/signatures/`, `/signatures/`, `/wp-content/uploads/signatures/` on live | Soft-404 → homepage |
| WP media search “signature” | Blog images about UAE e-signature cards only |
| `connectgroup.co/public/media/signatures/` | No MBS files |

**Inventory of staff email signature files:** **none found on live WP.**

**Preserve path (ready for drops):**  
`Astro-production/mbs-consultancy.com/public/media/signatures/`  
→ public URL `https://mbs-consultancy.com/media/signatures/<filename>`

If signatures live elsewhere (email tool, Drive, another host), provide the files/URLs and they will be placed under that path with exact public URLs.

Blog (non-email) assets mentioning “e-signature” are stored under normal uploads, e.g.  
`public/wp-content/uploads/2024/05/E-Signature-Card.webp`.

---

## Analytics / GTM

| Item | Live finding | Astro implementation |
|------|----------------|----------------------|
| GTM container | **None** found (`GTM-*` absent; gtag loads GA4 directly) | `PUBLIC_GTM_ID=` empty; `/runtime-gtm.js` ready for FLOW |
| GA4 | **`G-ZBM6WBL0ZX`** | `PUBLIC_GA4_ID` + gtag in `BaseLayout.astro` |
| Hotjar | **`3535132`** | Injected in `BaseLayout.astro` |
| dataLayer | Present via gtag | Initialised with gtag |

---

## Pipedrive

| Item | Detail |
|------|--------|
| Live WP | CF7 + **Contact Form 7 Pipedrive Integration** plugin (`cf7-pipedrive-theme-js`) |
| Reused from | **`connectresources.ae`** fleet stack (`src/services/pipedrive/`, `src/pages/api/contact.ts`, attribution, `@connect/site-cms`) |
| Env template | `.env.example` (company domain `connectgroup2`, field key comments from Connect Group) |
| Token | **Not present** in peer local `.env` (empty). Must be supplied in `.env` / `.env.prod` before forms deliver to Pipedrive |
| Copied non-secret config from peer `.env` | `PIPEDRIVE_COMPANY_DOMAIN`, `PIPEDRIVE_OWNER_ID`, `PIPEDRIVE_PERSON_LABEL_IDS`, `PIPEDRIVE_PERSON_VISIBLE_TO`, `INTERNAL_JOB_SECRET` |
| Placeholders needing ops confirmation | `WEBSITE_ID`, `FORM_SOURCE`, `PIPEDRIVE_LEAD_SOURCE_ID` (temporarily set to `5099` locally) |
| Where implemented | `src/services/pipedrive/index.ts`, `src/pages/api/contact.ts`, `src/env/server.ts`, `public/scripts/cf7-bridge.js` |

Local smoke: `/api/contact` returns **500** until `PIPEDRIVE_API_TOKEN` (and valid lead source IDs) are set — expected.

---

## Redirects / robots / SEO

| Item | Status |
|------|--------|
| Yoast sitemaps mirrored as Astro routes | `sitemap_index.xml`, `page-sitemap.xml`, `post-sitemap.xml` (+ page variants) |
| `robots.txt` | `public/robots.txt` aligned with live AI bot allows + Astro `/api/` disallow |
| Canonical / meta / OG / JSON-LD | Carried from Yoast `yoast_head_json` into page/post `seo` + `BaseLayout` / `SEOHead` |
| Redirection plugin export | **Blocked** — `/wp-json/redirection/v1/redirect` → **401**. Need WP admin export or DB dump |
| `public/_redirects` | Present from peer template — **not yet populated with MBS rules** |

---

## Forms & interactive

| Item | Status |
|------|--------|
| CF7 forms 86 / 311 | Markup in page bodies; client bridge → `/api/contact/` |
| Country phone field assets | CSS downloaded; flag sprites may need parity QA |
| Testimonials / carousels / accordions | Elementor + Smart Slider CSS/JS partially downloaded — **device QA required** |
| Pipedrive delivery | Blocked on token + MBS lead-source IDs |

---

## Local verification smoke (2026-08-06)

Server: `http://127.0.0.1:5099`

| URL | HTTP |
|-----|-----:|
| `/` | 200 |
| `/about-us/` | 200 |
| `/contact-us/` | 200 |
| `/insights/` | 200 |
| `/blog/` | 200 |
| `/blog/page/2/` | 200 |
| `/services/` | 200 |
| `/how-to-get-rera-license-dubai/` | 200 |
| `/author/kate/` | 200 |
| `/category/business/` | 200 |
| `/tag/business-setup/` | 200 |
| `/sitemap_index.xml` | 200 |
| `/api/health/` | 200 |

Fleet smoke also: homepage 200, health 200, unknown URL 404. Contact/internal checks fail without Pipedrive token (expected).

---

## Gaps / manual review before approval

1. **Provide Pipedrive API token** + confirm `WEBSITE_ID` / `LEAD_SOURCE_ID` for MBS (do not reuse Connect Resources IDs in production).
2. **Export WordPress redirects** (Redirection plugin CSV/JSON) — API is auth-locked.
3. **Email signature image files** — none on live; supply files if they exist outside WP.
4. **Trade licence strip** — Connect licence cleared; add MBS DET licence JSON/PDF if required.
5. **Responsive / visual parity QA** — desktop/tablet/mobile pass against live (nav mega menus, sliders, forms).
6. **Hotjar / GA4** — confirm IDs with marketing (values taken from live HTML).
7. **Category/tag/author page-2+** — routes added; re-smoke after next `fleet-local up`.
8. **Leftover peer CSS** — `src/data/impreza-*.css` from Connect may be unused; safe to ignore or delete later.
9. **Rebuild after Hotjar + pagination** — run `pnpm --filter mbs-consultancy-astro run build` + `fleet-local up` after approval of remaining config.

---

## Directory map (key paths)

```
Astro-production/mbs-consultancy.com/
  .env.example
  .env                          # local only (gitignored)
  AGENTS.md
  astro.config.mjs
  package.json                  # mbs-consultancy-astro
  _crawl/                       # sitemaps, inventory, logs
  docs/MIGRATION-VERIFICATION-REPORT.md
  public/
    media/signatures/           # email signatures (empty — preserve)
    wp-content/uploads|themes|plugins/
    wp-includes/
    robots.txt
    scripts/cf7-bridge.js
  src/
    data/{pages,posts,authors,categories,tags,site,header,footer}.json|html
    layouts/BaseLayout.astro
    pages/[...slug].astro
    pages/blog/...
    pages/category|tag|author/...
    pages/api/contact.ts
    services/pipedrive/
  deploy/mbs-consultancy.service
  deploy/mbs-consultancy.com.caddy
```

---

## Approval gate

Per your instructions: **migration is not considered complete and deployment must not proceed** until you review this report and approve.

Please confirm or provide:

- [ ] Pipedrive token + MBS `WEBSITE_ID` / lead source  
- [ ] Redirect export  
- [ ] Email signature files (if any)  
- [ ] Approval to continue visual QA / go-live prep  
