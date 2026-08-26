# Aaron — Redo / `packages/site-cms` (AP-04)

**Date:** 2026-08-26  
**For:** Aaron (owner / package lane)  
**From:** developer presentation lane  
**Fleet tip context:** `astro-fleet-development` (pull before review if needed)  
**Developer branch:** `work/astro-sites`

---

## Ask

Originally for your review. **Update 2026-08-26:** you said only envs / leads / Caddy stay with you — we will **ship this package ourselves** on `astro-fleet-development` with the Redo site files unless you object.

---

## Why it needs you

`packages/site-cms` ships to **all fleet sites** on every build (leads storage/export, HTML sanitiser, rate limiting, shared SEO helpers). Package changes stay in your lane.

---

## Source commit (already on `work/astro-sites`)

| Item | Value |
|---|---|
| Commit | `f865df993` — *Improve Redo SEO absolutization, house-renovation routing, and legacy link fixes.* |
| Package files | `packages/site-cms/src/seo/normalize-mirror-content-seo.ts` (**new**) |
| | `packages/site-cms/src/seo/absolutize-mirror-seo.ts` (wires `contentKind`) |
| | `packages/site-cms/src/index.ts` (re-exports) |
| | `packages/site-cms/test/normalize-mirror-content-seo.test.mjs` |
| Site files (same commit, can ship after package) | Redo redirects, legacy HTML, `archives.ts` / `blog.ts` / `legacy-page.js`, `[...slug].astro`, `insights.astro` |

GitHub (work branch):

- https://github.com/Connect-Group-Tech/Astro-websites/commit/f865df9933f2f76a93d717ad5c5c82c3a8435cda

---

## What the package change does

Rank Math / Yoast often emit `og:type=article` and Article JSON-LD on **WordPress pages** (services, about, listings).

`normalizeMirrorContentSeoHtml`:

- Keeps **Article** markup for real posts (`single-post` / auto)
- Forces **website** / WebPage–style markup for commercial pages and listings
- Supports `contentKind`: `auto` | `article` | `website`
- Hooked from `absolutizeMirrorSeoHtml` via `contentKind`

Without this package release, Redo SEO presentation that depends on it cannot ship cleanly in the developer lane.

---

## Suggested publish order (your lane)

1. Review + release `packages/site-cms` (normalize + tests) on `astro-fleet-development`
2. Tell us when the package tip is live
3. We then publish **Redo.ae site-only** presentation pieces from the same commit (no package files in our signed site commit)

---

## Out of scope for this ask

- Contact / lead / submission API paths (still yours)
- Lockfile / catalog / `scripts/ci/`
- Other open presentation polish (handled in developer lane)

---

## Paste-ready reply

```text
Aaron — AP-04 Redo package handoff:

Please review/publish packages/site-cms SEO normalize from work/astro-sites
commit f865df993:

- packages/site-cms/src/seo/normalize-mirror-content-seo.ts (new)
- absolutize-mirror-seo.ts + index.ts exports + test

Purpose: stop article og/JSON-LD on commercial WP pages; keep Article for real posts.
Redo site files in the same commit wait until the package is released.

Doc: docs/AARON-REDO-SITE-CMS.md on work/astro-sites (and fleet when synced).
```
