# Redirects import staging — kpmpro.ae

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-04-live-probe.csv` | Live 301s + sensible aliases (same pattern as `connectresources.sa`) |
| `2026-08-04-redirection-log.csv` | User drop — header only; **0 rules** (hit log, not rules export) |
| Canonical rules | `src/data/redirects.yml` (**23** rules) |
| Generated | `public/_redirects` via `pnpm run redirects:generate` |

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then merge into `redirects.yml`. Hit logs (`date,source,target,ip,…`) are not ideal — prefer a rules export. FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
