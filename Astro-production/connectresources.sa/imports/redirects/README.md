# Redirects import staging — connectresources.sa

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-04-live-probe.csv` | Seeded from live URL probe (no Rank Math CSV available yet) |
| `2026-08-04-redirection-log-3-de-august.csv` | User drop — **header only** (0 data rows) |
| `2026-08-04-redirection-log-august-3-sibling.csv` | Same-day Downloads sibling with hit-log rows; content is **connectstaff.ae / UAE** — not merged into SA YAML |
| Canonical rules | `src/data/redirects.yml` |
| Generated | `public/_redirects` via `pnpm run redirects:generate` |

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then merge into `redirects.yml`. Hit logs (`date,source,target,ip,…`) are not ideal — prefer a rules export. FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
