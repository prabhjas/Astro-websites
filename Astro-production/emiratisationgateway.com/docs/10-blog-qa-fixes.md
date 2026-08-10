# Blog / Author / Category QA Fixes

**Date:** 2026-08-06  
**Branch:** tabish-branch (no commit)

## Summary

Fixed all blog/author/category parity gaps on emiratisationgateway.com Astro site:

1. **Load More cards** — rewrote to use Elementor loop 276 (was 987)
2. **Category pages** — backfilled categories from WP REST API; new Astra blog-layout-1 card shell
3. **Author pages** — created mirrors from live site; fixed names, avatars, branding

---

## Phase 1: Initial Fixes

### A. Load More Card HTML
- Rewrote `buildInsightsCardHtml` in `src/lib/blog.ts` to match live loop 276 structure
- Updated load-more API and blog.astro: per-page & offset 15 → 9
- Updated `public/js/blog-load-more.js` fallback defaults to 9

### B. Category Backfill
- Fetched categories + tags from WP REST API for all 75 posts
- Categories: emiratisation (43), outsourcing (28), recruitment (6), nafis (1), uncategorized (3)
- Tags: 35 tags populated

### C. Author Shell
- Created `author-shell/template.html` from live binju-t-r page
- Switched author archive cards from buildPostCardHtml (244) → buildInsightsCardHtml (276)

---

## Phase 2: Pixel Parity Fixes

### D. Category Pages — Astra Blog Layout
**Problem:** Category pages reused `blog.cleaned.html` (Elementor ECS page) but live categories
use Astra `blog-layout-1` classic archive cards (`article.ast-article-post`).

**Fix:**
- Downloaded live `/category/emiratisation/` → created `src/legacy/category-shell/template.html`
  with markers: `ASTRO_CATEGORY:TITLE`, `ASTRO_CATEGORY:POSTS`, `ASTRO_CATEGORY:PAGINATION`
- Built `buildAstraCategoryCardHtml()` in `src/lib/archives.ts` matching live markup:
  - `article.ast-article-post` with `.blog-layout-1` inner
  - `.post-thumb` featured image link
  - `h2.entry-title` with post link
  - `.entry-meta` with category links + author link
  - `.ast-excerpt-container` with excerpt
  - `.read-more` link
- Built `buildAstraPaginationHtml()` matching live `.ast-pagination` markup
- Added `assembleCategoryHtml()` using category shell template
- Created paginated route: `src/pages/category/[slug]/page/[page].astro`
- Updated `ARCHIVE_POSTS_PER_PAGE` from 10 → 9 to match live

### E. Author Directory — Live Mirror
**Problem:** Generated directory showed wrong author list (email slugs, pittant avatars, wrong order).

**Fix:**
- Downloaded live `/author/` → `src/legacy/author.cleaned.html`
  - `src/pages/author/index.astro` already prefers this mirror via `serveLegacyPage('author')`
- Downloaded 14 author avatar images to `public/wp-content/uploads/2024/07/Author-*.png`
- Live directory shows: Nakul Sachdeva, Binju T. R, Cheyne Hogan, Tanzyn Giovanna,
  Siva Rama Krishna, Dylan Wesley Wright

### F. Author Single Pages — Live Mirrors
- Downloaded 11 individual author archive pages as `src/legacy/author/<slug>.cleaned.html`
- `src/pages/author/[slug].astro` already prefers mirror → pixel-perfect live parity
- All authors: nakul, binju-t-r, cheyne-hogan, tanzyn-giovanna, siva-rama-krishna,
  dylan-wesley-wright, liam-doherty, timothy-patridge, kate, prabhjas,
  muhammad-faieezvistaoutsourcing-com

### G. Author Data Cleanup
- Updated all 16 author JSON files with correct names from WP users API:
  - nakul → "Nakul Sachdeva", liam-doherty → "Liam Doherty",
  - muhammad-faieezvistaoutsourcing-com → "Muhammad Faieez", etc.
- Added real avatar paths from live (Author.png, Author-3.png, etc.)
- Created `cheyne-hogan.json` (missing author who appears on live directory)
- Updated 32 blog post author names to match
- Fixed `LIVE_AUTHOR_ORDER` and `LIVE_AUTHOR_OVERRIDES` in `authors.ts`
- Removed all pittant.com leftovers (KW.png fallback, Connect Group branding)

### H. Featured Images
- Audited all 75 posts: 75 OK, 0 missing, 0 no-image ✓

---

## Verification Results (20/20 pass)

| URL | Status | Card Type | Notes |
|-----|--------|-----------|-------|
| `/blog/` | 200 | elementor-276 | 9 initial cards ✓ |
| `/api/blog/load-more/?page=2` | 200 | elementor-276 | 9 cards, no 987 ✓ |
| `/category/emiratisation/` | 200 | Astra blog-layout-1 | 9 cards, pagination ✓ |
| `/category/outsourcing/` | 200 | Astra blog-layout-1 | pagination ✓ |
| `/category/recruitment/` | 200 | Astra blog-layout-1 | ✓ |
| `/category/nafis/` | 200 | Astra blog-layout-1 | ✓ |
| `/category/uncategorized/` | 200 | Astra blog-layout-1 | ✓ |
| `/category/emiratisation/page/2/` | 200 | Astra blog-layout-1 | pagination works ✓ |
| `/author/` | 200 | Live mirror | All 6 live authors shown ✓ |
| `/author/binju-t-r/` | 200 | Live mirror (276) | ✓ |
| `/author/nakul/` | 200 | Live mirror (276) | ✓ |
| `/author/cheyne-hogan/` | 200 | Live mirror | ✓ |
| `/author/tanzyn-giovanna/` | 200 | Live mirror | ✓ |
| `/author/siva-rama-krishna/` | 200 | Live mirror | ✓ |
| `/author/dylan-wesley-wright/` | 200 | Live mirror | ✓ |
| `/author/liam-doherty/` | 200 | Live mirror | ✓ |
| `/author/timothy-patridge/` | 200 | Live mirror | ✓ |
| `/emiratisation-uae/` | 200 | — | Single post ✓ |
| `/` | 200 | — | Homepage ✓ |
| `/api/health` | 200 | — | Health check ✓ |
| Smoke tests | All PASS | — | ✓ |

## Category Card Structure Match

```
Live:  article.ast-article-post > .blog-layout-1 > .post-thumb + h2.entry-title + .entry-meta + .ast-excerpt-container + .read-more
Local: article.ast-article-post > .blog-layout-1 > .post-thumb + h2.entry-title + .entry-meta + .ast-excerpt-container + .read-more ✓
```

## Files Changed

### Source code
- `src/lib/blog.ts` — rewrote `buildInsightsCardHtml` (987→276), ARCHIVE_POSTS_PER_PAGE 10→9
- `src/lib/authors.ts` — Gateway authors/avatars, buildInsightsCardHtml, branding
- `src/lib/archives.ts` — new Astra category card builder + category shell assembly
- `src/pages/api/blog/load-more.ts` — per-page/offset 15→9
- `src/pages/blog.astro` — data attributes 15→9
- `src/pages/category/[slug]/page/[page].astro` — new paginated category route
- `public/js/blog-load-more.js` — fallback defaults 15→9

### Content
- `src/content/blog/*.json` (75 files) — categories + tags + author names
- `src/content/taxonomies/categories.json` — 5 categories
- `src/content/taxonomies/tags.json` — 35 tags
- `src/content/authors/*.json` (16 files) — names + avatars
- `src/content/authors/cheyne-hogan.json` — new

### Legacy mirrors
- `src/legacy/author.cleaned.html` — new (live author directory)
- `src/legacy/author/<slug>.cleaned.html` (11 files) — new (live author pages)
- `src/legacy/author-shell/template.html` — new (generated shell)
- `src/legacy/category-shell/template.html` — new (from live)

### Assets
- `public/wp-content/uploads/2024/07/Author*.png` (14 files) — author avatars

### Utility scripts
- `scripts/_prepare-author-shell.mjs`
- `scripts/_prepare-author-directory.mjs`
- `scripts/_prepare-author-mirrors.mjs`
- `scripts/_prepare-category-shell.mjs`
