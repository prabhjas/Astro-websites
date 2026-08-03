# Payroll Services export notes

| Field | Value |
|-------|-------|
| Live URL | https://connectgroup.co/payroll-services/ |
| File | `index-https.html` |
| Source | Live desktop HTML (fetched 2026-07-21) |
| Added | 2026-07-21 |
| Astro route | `/payroll-services/` |

## Prepare

```bash
npm run prepare:page -- payroll-services --download
```

## Caveats

- Original folder only had `index-mobile-https.html` for `/tag/payroll-services/` (tag archive); replaced with live `/payroll-services/` desktop export
- Absolute asset URLs rewritten to local `/wp-content/...` on prepare
- CF7 / Pipedrive / Instagram still need Phase 2 replacements
