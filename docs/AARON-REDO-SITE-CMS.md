# Aaron — Redo / `packages/site-cms` (AP-04) — CLOSED for package wait

**Updated:** 2026-08-26 evening  
**Status:** Package is **live in site builds**. Developer ships **Redo.ae site files** only.

---

## Aaron confirmation

> site-cms is committed/pushed as `159ff7081` and present in build artifacts — `packages/site-cms` is copied into every build. There is **no separate package publish step**. Ship Redo.ae site files; Redo's build will include the new normaliser. Other sites pick it up as they are next published.

---

## What the package does

`normalizeMirrorContentSeoHtml` (via `absolutizeMirrorSeoHtml`):

- Keeps **Article** markup for real posts
- Forces **website** / WebPage–style markup for commercial pages and listings
- `contentKind`: `auto` | `article` | `website` (default `auto`)

---

## Developer ship (site only)

From `work/astro-sites` (originally `f865df993` + favicon presentation):

- redirects / legacy link fixes
- `archives.ts` / `blog.ts` / `legacy-page.js` / `[...slug].astro` / `insights.astro` SEO absolutize wiring
- Redo favicon links in BaseLayout / 404 / `public/favicon.ico`

**Do not** include `packages/` in the automatic-lane signed commit (already on tip).

---

## Out of scope

- Backend robots/sitemap refresh (Aaron)
- Contact / lead APIs
- Lockfile / catalog / CI
