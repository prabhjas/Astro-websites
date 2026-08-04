# Staff Outsourcing export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/staff-outsourcing/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-21 |
| Astro route | `/staff-outsourcing/` |

## Prepare

```bash
npm run prepare:page -- staff-outsourcing --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
- Mobile export also present (`index-mobile-https.html`) — desktop export used for Astro
