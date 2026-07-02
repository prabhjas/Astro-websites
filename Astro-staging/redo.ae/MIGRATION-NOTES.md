# Redo.ae — WordPress → Astro migration notes

Source: **https://redo.ae/** (WordPress + Elementor). Ported with the **faithful mirror**
method (see /opt/Agents.md): each page serves the original rendered HTML + its real CSS,
assets localized, all third-party JavaScript stripped.

## Scope ported
- **31 pages** + **71 blog posts** (posts at their live root-level URLs).
- **No filesystem backup existed** → all CSS is inline in the pages; **963 assets**
  (images, fonts, and the cache-`min` CSS files) were **downloaded from the live site**
  into `public/images` and `public/assets`.
- 4 pages missing from the sitemap but linked in content were captured too
  (office-renovation, redo-house-renovation, home-renovation-contractors,
  villa-renovation-dubai).

## Intentional differences (no silent losses)

### Images de-lazied
redo.ae lazy-loads images with **WP Rocket** (`data-lazy-src` / `data-bg`, blank
placeholder `src`). With JS stripped, those would stay blank, so the real URLs were
promoted to real `src`/`srcset`/`background-image` at build time. Service-grid tiles and
section images now render correctly.

### Security: ALL third-party JavaScript stripped
Every original `<script>` removed (including WP Rocket "delayed" `rocketlazyloadscript`
tags) and no `.js` shipped. **Audit: 102 scripts in the build = our one form handler, 0
with a real `src`.** Capture was read-only (GET only); nothing executed locally.

### Forms → Pipedrive (same Connect Group account as Al Buraq)
The Contact Form 7 form (first/last name, email, phone, message + Google-Ads tracking)
posts to `/api/lead` (`src/pages/api/lead.ts`), creating a **Person + Lead** in the same
Pipedrive account/owner as Al Buraq (custom fields are account-wide).
- Lead title `AD redo`; owner `13601147`; the visitor's **gclid** is captured into the
  "User Landed on" field. Verified end-to-end: a test lead landed with the right owner and
  custom fields.
- Needs `PIPEDRIVE_API_TOKEN` (in `.env`, gitignored) and a host that runs the endpoint
  (`@astrojs/node` locally; Netlify/Vercel/Cloudflare in prod). Same as Al Buraq.

### Redirects matched to the live site
27 old/removed slugs 301 on the live site; reproduced in `astro.config.mjs` — most → home,
some to specific pages (e.g. `/kitchen/` → `/kitchen-renovation/`, `/villa-renovation/` →
`/villa-renovation-dubai/`).

### Clean asset structure
Styles/fonts under `public/assets` (renamed from `wp-content`/`wp-includes`), media under
`public/images`. No `.php`, no `.js`.

### Section background images restored
### Section background images restored
redo.ae (WP Rocket "Remove Unused CSS") loads each page's Elementor background-image CSS
**lazily via JS**, so hero/section backgrounds were blank after stripping JS. Fixed by
downloading each page's full Elementor CSS (`/wp-content/uploads/elementor/css/post-<id>.css`,
localized) and linking it normally in the page `<head>` — pages by their page id, posts by
their template + post ids. Backgrounds now render with no JS.

### Videos restored as iframes
Elementor YouTube video widgets (click-to-play via JS) were converted to real `<iframe>` embeds so they play without JS — 6 widgets across 4 pages, including a vertical YouTube Short (reel-style).

### Dynamic widgets restored without JS
- **Counters** ("By the Numbers") now show their real final values (from each widget's
  `data-to-value`) instead of 0 — done statically, no JS.
- **Image carousels** ("Our Partners" etc.) auto-scroll via a pure-CSS marquee (slides
  duplicated for a seamless loop; pauses on hover). No third-party JS.
- Remaining: scroll-reveal animations don't fire (content is all visible anyway).

## Verified
- Build **0 errors**; `astro check` **0 errors/warnings/hints**.
- **0 broken** assets; internal links resolve (redirects work at runtime).
- Homepage screenshot-diffed against live — match.

## Not yet done
- Deploy host + set `PIPEDRIVE_API_TOKEN` there.
- Delete the "AD redo" test lead in Pipedrive.
- CMS-readiness (blog → Content Collection) — deferred, see Agents.md Phase 9.
