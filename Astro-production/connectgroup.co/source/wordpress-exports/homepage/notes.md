# Homepage export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/ |
| File | `index-https.html` (updated 2026-07-16 from `index-https (1).html`) |
| Backup | `index-https.html.bak-2026-07-13` |
| Source | WP Rocket–style static HTML |
| Astro route | `/` |

## Prepare

```bash
npm run prepare:homepage:download
```

## Known mirror fixes

- `#arrow` scroll script guarded (missing element caused 1000+ console errors)
- Background video `builtforpeople.mp4` localized under `public/wp-content/uploads/2025/08/`
- `/js/astro-mirror-fixes.js` — counter + video fallbacks if Elementor init is slow
