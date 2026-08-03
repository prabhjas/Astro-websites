# WordPress HTML exports

Raw static HTML captured from WordPress (e.g. WP Rocket cache, crawler, or Save As).

These files are **source material** for Phase 1. They are not the Astro app.

## Layout

```text
wordpress-exports/
├── README.md
├── homepage/
│   └── index-https.html
├── about-us/
│   └── index-https.html
├── staff-outsourcing/
│   └── index-https.html
└── visa-services/
    └── index-https.html
├── payroll-services/
│   └── index-https.html
└── remote-workers-hire/
    └── index-https.html
├── global-workforce-solutions/
│   └── index-https.html
└── payroll-outsourcing/
    └── index-https.html
├── hr-payroll-software-uae/
│   └── index-https.html
├── hr-outsourcing/
│   └── index-https.html
├── professional-employer-organization-uae/
│   └── index-https.html
└── freelance-visa/
    └── index-https.html
```

## Naming convention

```text
<source-slug>/
  index-https.html            ← preferred: full HTML document
  notes.md                    ← optional: export date, WP user, caveats
```

Use the **URL slug** as the folder name:

| Live URL | Folder | Astro route |
|----------|--------|-------------|
| `https://connectgroup.co/` | `homepage/` | `/` |
| `https://connectgroup.co/about-us/` | `about-us/` | `/about-us/` |
| `https://connectgroup.co/staff-outsourcing/` | `staff-outsourcing/` | `/staff-outsourcing/` |
| `https://connectgroup.co/visa-services/` | `visa-services/` | `/visa-services/` |
| `https://connectgroup.co/payroll-services/` | `payroll-services/` | `/payroll-services/` |
| `https://connectgroup.co/remote-workers-hire/` | `remote-workers-hire/` | `/remote-workers-hire/` |
| `https://connectgroup.co/global-workforce-solutions/` | `global-workforce-solutions/` | `/global-workforce-solutions/` |
| `https://connectgroup.co/payroll-outsourcing/` | `payroll-outsourcing/` | `/payroll-outsourcing/` |
| `https://connectgroup.co/hr-payroll-software-uae/` | `hr-payroll-software-uae/` | `/hr-payroll-software-uae/` |
| `https://connectgroup.co/hr-outsourcing/` | `hr-outsourcing/` | `/hr-outsourcing/` |
| `https://connectgroup.co/professional-employer-organization-uae/` | `professional-employer-organization-uae/` | `/professional-employer-organization-uae/` |
| `https://connectgroup.co/freelance-visa/` | `freelance-visa/` | `/freelance-visa/` |
| `https://connectgroup.co/pro-services/` | `pro-services/` | `/pro-services/` |

## Prepare a page

```bash
npm run prepare:page -- <slug> --download
# examples:
npm run prepare:homepage:download
npm run prepare:about-us:download
npm run prepare:staff-outsourcing:download
npm run prepare:visa-services:download
npm run prepare:payroll-services:download
npm run prepare:remote-workers-hire:download
npm run prepare:global-workforce-solutions:download
npm run prepare:payroll-outsourcing:download
npm run prepare:hr-payroll-software-uae:download
npm run prepare:hr-outsourcing:download
npm run prepare:professional-employer-organization-uae:download
npm run prepare:freelance-visa:download
```


## Rules

1. **Never** put production secrets in these files.
2. Keep the original dump immutable; copy to a `working/` file before cleaning.
3. Record export date in `notes.md` when re-exporting after content changes.
4. After localization, Astro serves from `public/` + `src/pages/` — not from this folder at runtime.

## Related docs

- [Homepage analysis](../../docs/03-homepage-analysis.md)
- [Phase 1 runbook](../../docs/04-phase1-static-mirror.md)
