# Dropdown / Author / Image / Form Fixes — 2026-08-06

## Issue 1 — Category Dropdown (CRITICAL)

**Problem:** Blog sidebar category `<form>` had `action="https://emiratisationgateway.com"`, causing the dropdown to submit to the live WordPress site.

**Fix:**
- `src/legacy/blog.cleaned.html` — changed form action to `#`, added `onsubmit="return false;"`, replaced inline WP script with a `catMap` lookup that navigates to local `/category/<slug>/` paths.
- `public/js/astro-mirror-fixes.js` — added `interceptCategoryDropdown()` function called at boot. Intercepts `#cat` and `#wp-block-categories-1` selects, rewrites form action, navigates on change.
- `src/lib/archives.ts` — updated `CATEGORY_DROPDOWN_SCRIPT` with the same catMap approach.
- Cache version bumped to `?v=20260806-cat1` in `legacy-page.js` and `archives.ts`.

**Category map:** `26→emiratisation, 54→nafis, 35→outsourcing, 55→recruitment, 1→uncategorized`

## Issue 2 — Author Page Layout

**Problem:** Author image-box titles (names) missing/misaligned; `target="_blank"` on author links opened new tabs.

**Fix:**
- `src/legacy/author.cleaned.html`:
  - Removed `target="_blank"` from all `/author/*` links (kept on social/external).
  - Changed `data-ra-target="_blank"` → `"_self"` on clickable wrapper columns.
  - Injected `<style id="astro-author-page-fix">` with flexbox layout for `.auth-box` image boxes ensuring names are visible, centered, and vertically aligned.
- `public/js/astro-mirror-fixes.js` — added `.auth-box` image-box CSS rules to `injectMirrorCss()` for runtime coverage on all pages.

## Issue 3 — All Images Local

**Audit result:** No absolute `https://emiratisationgateway.com/wp-content/...` URLs remain in any `.cleaned.html` file. All referenced author images (`Author-3.png`, `Author.png`, `Author-1.png`, `Author-5.png`, `Author-4.png`, `Author-2-1.png`, `Author-2.png` + all `269x300` variants) exist under `public/wp-content/uploads/`. Logo and favicon also present.

## Issue 4 — Contact Form Submission

**Verification:** `POST /api/contact/` returns `200` with `{"success":true}`. The form intercept in `astro-mirror-fixes.js` (line ~2902) already correctly POSTs JSON to `/api/contact/`. CF7 selectors, intl-tel phone fields, and validation all functional.

## Verification Results

| Test | Result |
|---|---|
| Blog dropdown → live URL | **FIXED** — form action=`#`, JS catMap |
| Category/outsourcing/ loads | **200** |
| Author page names visible | **Yes** — CSS fix applied |
| Author links same-tab | **Yes** — target=_blank removed |
| Author-3.png (Nakul) | **200** |
| Logo image | **200** |
| POST /api/contact/ | **200** — success response |
| JS file served | **200** — interceptCategoryDropdown present |

## Files Changed

- `src/legacy/blog.cleaned.html` — form action + dropdown script
- `src/legacy/author.cleaned.html` — target attrs + CSS injection
- `public/js/astro-mirror-fixes.js` — interceptCategoryDropdown + auth-box CSS
- `src/lib/legacy-page.js` — cache bust version
- `src/lib/archives.ts` — CATEGORY_DROPDOWN_SCRIPT + cache bust
- `dist/client/js/astro-mirror-fixes.js` — copied from public
