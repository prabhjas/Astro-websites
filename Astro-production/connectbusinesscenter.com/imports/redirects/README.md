# Redirects import staging — connectbusinesscenter.com

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-04-*.csv` | Optional staging drops (probe / hit-log style); prefer a Rank Math **rules** export |
| Canonical rules | `src/data/redirects.yml` (interim: `/home/` → `/`) |
| Generated | `public/_redirects` via `pnpm run redirects:generate` |

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then merge into `redirects.yml`. Hit logs are not ideal — prefer a rules export. FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
