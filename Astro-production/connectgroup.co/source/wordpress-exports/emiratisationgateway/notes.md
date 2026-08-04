# Emiratisation Gateway export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/emiratisationgateway/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-22 |
| Astro route | `/emiratisationgateway/` |

## Prepare

```bash
npm run prepare:page -- emiratisationgateway --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
