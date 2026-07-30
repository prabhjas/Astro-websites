# WP → Astro mirror playbook

Checklist of enhancements and fixes proven on **Connect Group Astro** (reference) and **Evolution Middle East Astro** (`astro-evolutionmiddleast.com`). Use this as the task list for every upcoming WordPress → Astro Phase‑1 mirror.

**Reference projects**

| Project | Path / URL |
|---------|------------|
| Connect Group (source pattern) | `~/Desktop/astro` |
| Evolution Middle East (this repo) | `~/Projects/astro-evolutionmiddleast.com` |
| Live Evolution | https://www.evolutionmiddleast.com/ |

---

## How to use

1. Copy this doc into the new site repo as `docs/13-wp-astro-mirror-playbook.md` (or keep a shared copy).
2. Work top‑to‑bottom; tick each item when verified on the new domain.
3. Prefer **copying working modules from Connect/Evolution** over rewriting — then adapt branding, `WEBSITE_ID`, URLs, and Elementor post CSS IDs.

---

## Phase 0 — Project scaffold

- [ ] Scaffold Astro (Node adapter, `output: 'static'` + SSR endpoints, Node ≥ 22)
- [ ] Set `PUBLIC_SITE_URL` / `SITE_URL` to the canonical live origin
- [ ] Add Rank Math–style public SEO routes (`robots.txt`, `sitemap_index.xml`, `page-sitemap.xml`, `post-sitemap.xml`) — do **not** add `@astrojs/sitemap`
- [ ] Create inventory from live sitemaps (`src/data/sitemap-inventory.json`)
- [ ] Wire scripts: `import:sitemap`, `prepare:page`, `assets:download-all`, `validate:sitemap`, `migrate:posts`, `redirects:generate`
- [ ] `.gitignore`: `.env`, `.data/`, secrets; never commit tokens

---

## Phase 1 — Content mirror pipeline

- [ ] Import all Rank Math **pages** + **posts** HTML dumps
- [ ] Run prepare/clean pipeline (absolute → root-relative URLs, strip WP admin chrome noise)
- [ ] Localize `wp-content` / `wp-includes` assets into `public/`
- [ ] Serve marketing pages via catch‑all `[slug].astro` + `serveLegacyPage()`
- [ ] Homepage: own chrome (exclude from shared header swap)
- [ ] Verify every inventory slug returns **200** (not “not prepared” 503)

### Evolution-specific inventory reminder

| Type | Approx. count |
|------|----------------|
| Pages | 24 |
| Posts | 59 |

---

## Phase 2 — Shared chrome & navigation

- [ ] Extract Elementor header/footer into `src/legacy/chrome/` (+ `public/chrome/`)
- [ ] `applySharedChrome()` injects header/footer on all non-homepage pages
- [ ] Ship **header Elementor CSS** (`post-{headerId}.css`) and **widget-nav-menu** CSS
- [ ] Copy **Elementor Pro nav-menu webpack chunk** (`nav-menu.*.bundle.min.js`) — without it, desktop dropdowns never open
- [ ] Fallback: `ensureNavMenus()` + SmartMenus init in `astro-mirror-fixes.js`
- [ ] White/readable header background CSS (transparent header over dark heroes looks “broken”)
- [ ] Mark current menu item by slug when injecting shared header (export often hard-codes Home as current)
- [ ] Verify every live mega/dropdown child exists as a prepared page and href matches Rank Math slug
- [ ] Footer service columns link to real paths (not `#`)

### Evolution nav children to verify

**HR Services:** EOR, Payroll Outsourcing, PEO, Staff Outsourcing, Visa Outsourcing, RPO, Emiratisation, Recruitment Agency, Insurance, HR Consultancy, Executive Search  

**Visa and government service:** Golden / Retirement / Job Seeker / Family / Freelance / Residence / Investor Visa

---

## Phase 3 — Contact forms & phone

- [ ] `/api/contact` store-first pipeline + Pipedrive (`WEBSITE_ID` per site — Evolution: `5060`)
- [ ] Client validation: required fields, no links/HTML in free text; support `f-name` / `l-name` aliases
- [ ] CF7 country phone plugin: neutralize WP `keyup` dial-code duplication bugs in cleaned HTML
- [ ] `nationalMode: true` + strip duplicate dial codes in `astro-mirror-fixes.js`
- [ ] Ship flag sprites at `/js/phone-flags/flags.png` + `flags@2x.png` **and** plugin `assets/img/`
- [ ] Inject flag sprite CSS (`injectFlagSpriteCss`) so grey boxes never appear
- [ ] IP → country: prefer first-party `/api/geo/country` (browser geo APIs hang); fallback public APIs with timeouts
- [ ] Cache-bust `astro-mirror-fixes.js?v=…` after phone/nav fixes

---

## Phase 4 — Blog / insights

- [ ] Migrate posts to dashboard-managed JSON (`src/content/blog/*.json`) + `npm run migrate:posts`
- [ ] Public routes: `/blog/`, `/blog/page/[n]/`, `/category/`, `/tag/`, `/author/`, `/{slug}/`
- [ ] Dashboard CRUD: `/internal/operations/posts/` (+ categories/tags)
- [ ] Match live Elementor archive layout (Evolution: **two** `.ecs-posts` loops — featured + grid; Connect often has one)
- [ ] Loop card builders + loop CSS (`buildFeaturedPostCardHtml` / `buildPostCardHtml` / archive inject)
- [ ] Inject runtime GTM loader into archive/blog shells too

---

## Phase 5 — Internal operations dashboard

Base path: `/internal/operations/` (alias `/internal/lead-operations/` → new path).

- [ ] Auth: signed cookie session, roles (`viewer` / `developer` / `seo` / `super_admin`)
- [ ] Leads list/detail, CSV/JSON export, failure queue + retry
- [ ] Global **GTM** editor → `/runtime-gtm.js` injected on **all** public pages (strip legacy GTM from dumps)
- [ ] Redirects manager: add / edit / delete / bulk delete / hit stats
- [ ] Redirect **import**: Rank Math **JSON and CSV** (map `url` + `action_data.url` / `source`+`target`+`code`)
- [ ] Ship `scripts/generate-redirects.mjs` and call it after redirect mutations (missing script → white “Not found” after save)
- [ ] Dashboard POSTs: always return explicit **303** `Location` (`dashboardSeeOther`) — never leave the browser on `/api/internal/...`
- [ ] Flash query params (`?imported=`, `?deleted=`, `?saved=`, `?error=`)
- [ ] SEO workspace: robots, llm/llms, sitemap priority overrides
- [ ] Uploads + enhanced PHP file panel (if site uses them)
- [ ] `X-Robots-Tag: noindex` on all internal UI + APIs
- [ ] Env: `INTERNAL_ADMIN_DIR`, `DASHBOARD_*`, `INTERNAL_JOB_SECRET`, Pipedrive keys, `WEBSITE_ID`

---

## Phase 6 — Redirects & middleware

- [ ] Runtime redirects from `INTERNAL_ADMIN_DIR/redirects.json` + `src/data/redirects.yml`
- [ ] Middleware applies redirects on public GET/HEAD (skip `/api/internal/` and dashboard)
- [ ] Generate `public/_redirects` (+ JSON) for Netlify/CF Pages hosts
- [ ] After first Rank Math import, **spot-check** `from !== to` (bad parsers create self-redirects)
- [ ] Record hit stats for dashboard

---

## Phase 7 — Runtime JS hardening (`astro-mirror-fixes.js`)

Copy from Connect/Evolution, then site-tune:

- [ ] Patch Elementor null-DOM crashes
- [ ] Counter / background video / Lottie / Swiper / accordion / tabs fallbacks
- [ ] Nested carousels, share buttons, stretched sections, Scrollsequence
- [ ] Phone country + flags
- [ ] Nav SmartMenus fallback
- [ ] Rocket LazyLoad script unwrap if dumps still contain it
- [ ] Nudge Elementor frontend init after late scripts

---

## Phase 8 — Assets & Elementor Pro bundles

Common failure: webpack lazy chunks referenced but not downloaded.

- [ ] Download **nav-menu** bundle matching `webpack-pro.runtime.min.js` hash for that site
- [ ] Audit other referenced `*.bundle.min.js` (carousel, lottie, forms…) if widgets break
- [ ] After `npm run build`, confirm `public/` → `dist/client/` includes new assets (or sync manually when running `node dist/server/entry.mjs`)
- [ ] Flag PNGs, chrome CSS, and plugin CSS must exist under **both** `public/` and served `dist/client/`

---

## Bugs we hit (and must not repeat)

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Phone shows `+971971…` | CF7 keyup prepends dial code; digits-only cleaner strips `+` | Neutralize keyup; nationalMode; strip dial codes in fixes JS |
| Grey boxes instead of flags | Missing `flags.png` / wrong CSS url | Ship sprites + inject absolute `/js/phone-flags/…` CSS |
| Geo country never applies | Browser geolocation hangs | First-party `/api/geo/country` + timeouts |
| “Pages missing” / menu not linked | Nav dropdown JS chunk missing; header unreadable | Copy nav-menu bundle; header CSS; ensureNavMenus |
| Blog layout wrong vs live | Wrong number of Elementor loops filled | Match live loop structure (featured + grid) |
| Import/delete → white “Not found” | Missing `generate-redirects.mjs`; crash after persist; stay on API URL | Add script; try/catch; `dashboardSeeOther` 303 |
| Import “works” but wrong | Rank Math `url` used as destination | Use `action_data.url`; accept CSV `source`/`target`/`code` |
| Self-redirects in YAML | Bad import left `from === to` | Re-import; assert no self-maps |
| GTM only on some pages | Loader not injected into all HTML paths | `injectRuntimeGtmLoader` on legacy + archives + BaseLayout |

---

## Launch checklist

- [ ] Full sitemap URL crawl: 200 vs live
- [ ] Forms submit → lead store + Pipedrive lead id
- [ ] Phone: correct dial code by IP; flags visible; no doubled country code
- [ ] Desktop: HR + Visa (or site equivalent) dropdowns open and navigate
- [ ] Blog archive matches live layout
- [ ] Dashboard: GTM save returns to GTM page; redirects CSV+JSON import returns to redirects page
- [ ] Sample old URLs 301 to new destinations
- [ ] `npm run build` + restart Node server after chrome/API changes
- [ ] DNS / SSL cutover plan; monitor 404s and form failures

---

## Suggested copy order for a new site

1. Scaffold + env + inventory scripts (Phase 0–1)  
2. Shared chrome + nav chunks + mirror-fixes (Phase 2 + 7–8)  
3. Forms / phone / geo (Phase 3)  
4. Blog + dashboard posts (Phase 4)  
5. Full ops dashboard + GTM + redirects (Phase 5–6)  
6. Visual QA against live + launch (Phase 8 + Launch)

---

## Related docs in this repo

| Doc | Purpose |
|-----|---------|
| [00-overview.md](00-overview.md) | Evolution migration goal / status |
| [12-lead-ops-dashboard.md](12-lead-ops-dashboard.md) | Dashboard env, roles, GTM/redirects notes |
| [README.md](README.md) | Docs index |
