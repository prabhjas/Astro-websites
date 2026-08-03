# IZI Rent export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/izirent/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-21 |
| Astro route | `/izirent/` |

## Prepare

```bash
npm run prepare:page -- izirent --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
