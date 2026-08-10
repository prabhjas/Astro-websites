# Redirects import staging — connectfreelance.ae

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-05-redirection-log.csv` | User drop — **header only, 0 hit rows** (not a rules export) |
| `2026-08-03-redirection-log-connectstaff-NOT-cf.csv` | Sibling download — **connectstaff.ae** hit log; do **not** merge into CF |
| Canonical rules | `src/data/redirects.yml` (trailing-slash only; middleware normalises bare paths) |
| Generated | `public/_redirects` via `pnpm run redirects:generate` |

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then merge into `redirects.yml`. Hit logs (`date,source,target,ip,…`) need rows with CF paths — empty exports add nothing. FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
