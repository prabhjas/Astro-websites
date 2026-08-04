# Visa Services export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/visa-services/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-21 |
| Astro route | `/visa-services/` |

## Prepare

```bash
npm run prepare:page -- visa-services --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
- Mobile export also present (`index-mobile-https.html`) — desktop export used for Astro
