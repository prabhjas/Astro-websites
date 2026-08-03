# Connect Staff export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/connect-staff/ |
| File | `index-https.html` (desktop fetched live 2026-07-21) |
| Source | Live fetch + mobile export (`index-mobile-https.html`) |
| Added | 2026-07-21 |
| Astro route | `/connect-staff/` |

## Prepare

```bash
npm run prepare:page -- connect-staff --download
```

## Caveats

- Desktop HTML fetched from live (original export was mobile-only)
- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
