# Remote Workers Hire export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/remote-workers-hire/ |
| File | `index-https.html` |
| Source | WP Rocket–style static HTML |
| Added | 2026-07-21 |
| Astro route | `/remote-workers-hire/` |

## Prepare

```bash
npm run prepare:page -- remote-workers-hire --download
```

## Caveats

- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
- Mobile export also present (`index-mobile-https.html`) — desktop export used for Astro
