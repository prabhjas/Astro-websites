# Redirects import staging — emiratisationgateway.com

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-06-redirection-log.csv` | User Redirection plugin hit log (header only — empty export) |
| `2026-08-06-emiratisation-redirection-pages.csv` | From `Emiratisation Redirection pages .xlsx` (6 rules) |
| `2026-08-06-emiratisation-redirection-pages.json` | Same rules as JSON |
| Canonical rules | `src/data/redirects.yml` (**25** rules: 19 aliases + 6 spreadsheet) |
| Generated | `public/_redirects` + `public/_redirects.json` via `pnpm run redirects:generate` |

```bash
node scripts/_merge-redirect-log.mjs "<path-to-hit-log.csv>"
pnpm run redirects:generate
```

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then merge into `redirects.yml`. Hit logs work when `source`/`target` columns are present (dedupe by `from`). FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
