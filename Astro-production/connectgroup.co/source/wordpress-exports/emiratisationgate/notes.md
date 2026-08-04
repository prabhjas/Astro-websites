# Emiratisation Gate export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/emiratisationgate/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-22 |
| Astro route | `/emiratisationgate/` |

## Prepare

```bash
npm run prepare:page -- emiratisationgate --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements

- Desktop HTML fetched from live site (export folder had mobile-only `index-mobile-https.html`)
