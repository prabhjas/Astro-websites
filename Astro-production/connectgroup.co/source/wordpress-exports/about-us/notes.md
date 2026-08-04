# About Us export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/about-us/ |
| File | `index-https.html` |
| Source | Live fetch + WP Rocket–style static HTML |
| Added | 2026-07-16 |
| Updated | 2026-07-21 (live re-fetch for videos/animations) |
| Astro route | `/about-us/` |

## Prepare

```bash
npm run prepare:page -- about-us --download
```

## Media & animations (from live)

| Asset | Path | Section |
|-------|------|---------|
| Hero video (desktop) | `/wp-content/uploads/2025/12/About-Us-Final.mp4` | IMPACT hero |
| Hero video (mobile) | same | Mobile hero |
| Flow video | `/wp-content/uploads/2025/12/Cg-Flow.mp4` | “What we do” |
| Scrollsequence | `/wp-content/uploads/2025/12/Global-0.jpg` … `Global-71.jpg` (72 frames) | Our Global Footprint |
| Scrollsequence JS | GSAP + ScrollTrigger + `ssq-lib__premium_only.js` | Canvas scrub animation |

`prepare-page.mjs` unwraps WP Rocket lazy scripts, localizes Scrollsequence frame URLs in `ssqInput`, and downloads mp4 + Global-* frames with `--download`.

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
- Mobile export also present (`index-mobile-https.html`) — desktop export used for Astro
