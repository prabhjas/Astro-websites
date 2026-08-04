# 02 — Migration phases

Each phase has a clear **goal** and **exit criteria**. Do not skip Phase 0 inventory or Phase 2 forms before DNS cutover.

---

## Phase 0 — Inventory

**Goal:** Know the full surface area of the WordPress site.

### Tasks

- [ ] Export full sitemap (Yoast / Rank Math / `wp-sitemap.xml` / crawl)
- [ ] Classify URLs: marketing, service landing, blog, legal, redirects
- [ ] List all forms and where leads go (Pipedrive, email, etc.)
- [ ] List third-party scripts (GTM/GA, Leadfeeder, ZoomInfo, etc.)
- [ ] Note URL patterns that must stay identical for SEO
- [ ] Decide content freeze date before cutover

### Exit criteria

- Spreadsheet or markdown inventory of all public URLs + priority (P0/P1/P2)
- Form and analytics inventory complete

---

## Phase 1 — Static mirror

**Goal:** Astro can serve a visual clone of key pages without WordPress at runtime.

### Tasks

- [ ] Scaffold Astro with `output: 'static'` ([install guide](https://docs.astro.build/en/install-and-setup/))
- [ ] Export pages (WP Rocket cache, HTTrack, or authenticated crawl)
- [ ] Localize `/wp-content` assets into `public/assets/`
- [ ] Strip WP admin-bar / logged-in junk from HTML
- [ ] Rewrite absolute `connectgroup.co/wp-content` URLs to local paths
- [ ] Put homepage (then priority pages) into Astro routes

Details: [04-phase1-static-mirror.md](04-phase1-static-mirror.md)

### Exit criteria

- Homepage loads locally via `astro dev` with local assets
- No dependency on live WordPress for CSS/JS/images on mirrored pages
- Visual QA vs live site (desktop + mobile)

---

## Phase 2 — Replace dynamic features

**Goal:** Forms and dynamic widgets work without WordPress.

### Tasks

- [ ] Replace Contact Form 7 with Astro-friendly form + Pipedrive (or similar)
- [ ] Replace Instagram feed plugin (embed or static screenshots)
- [ ] Remove `admin-ajax.php` / `wp-json` client calls that fail offline
- [ ] Re-verify GTM / GA

Details: [05-forms-and-dynamic.md](05-forms-and-dynamic.md)

### Exit criteria

- Test lead reaches Pipedrive (or chosen CRM)
- No console errors from missing WP endpoints on critical pages

---

## Phase 3 — Extract shared chrome

**Goal:** One Header / Footer / Mega Menu for all pages.

### Tasks

- [ ] Extract Header (Elementor header `27554` from dump) → `Header.astro`
- [ ] Extract Footer → `Footer.astro`
- [ ] Rebuild Max Mega Menu as accessible Astro/nav component
- [ ] Apply shared layout via `BaseLayout.astro`

### Exit criteria

- Changing nav once updates all routes
- Mobile menu works without Max Mega Menu PHP/JS stack (or minimal retained JS)

---

## Phase 4 — Rebuild top pages

**Goal:** High-traffic pages become maintainable Astro sections (no Elementor HTML).

### Tasks

- [ ] Rebuild homepage sections as Astro components
- [ ] Create reusable templates for similar service landings
- [ ] Move copy into Markdown/MDX or structured data where useful
- [ ] Delete legacy HTML for rebuilt routes

### Exit criteria

- Homepage (and agreed P0 pages) no longer use Elementor markup
- Performance budget improved (fewer CSS/JS files)

---

## Phase 5 — Cutover

**Goal:** Production traffic serves Astro only.

### Tasks

- [ ] Deploy to static host (Netlify, Cloudflare Pages, Vercel, etc.)
- [ ] 301 map for any path changes
- [ ] DNS cutover
- [ ] Freeze WordPress (read-only) or decommission
- [ ] Monitor Search Console / analytics for 2–4 weeks

Details: [06-risks-and-seo.md](06-risks-and-seo.md)

### Exit criteria

- Production domain serves Astro `dist/`
- No critical 404s vs inventory
- Forms and analytics verified in production

---

## Phase dependency diagram

```text
Phase 0 Inventory
       │
       ▼
Phase 1 Static mirror ──────────────┐
       │                            │
       ▼                            │
Phase 2 Forms / dynamic             │
       │                            │
       ▼                            │
Phase 3 Shared chrome ◄─────────────┘
       │
       ▼
Phase 4 Rebuild top pages
       │
       ▼
Phase 5 Cutover
```

Phases 3–4 can start on P0 pages while Phase 1 still mirrors long-tail URLs.

---

## Next document

→ [03-homepage-analysis.md](03-homepage-analysis.md)
