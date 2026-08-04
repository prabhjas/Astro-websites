# Connect Zone export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/connect-zone/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-21 |
| Astro route | `/connect-zone/` |

## Prepare

```bash
npm run prepare:page -- connect-zone --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
