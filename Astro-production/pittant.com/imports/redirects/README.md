# Redirects import staging — pittant.com

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-05-redirection-log.csv` | User Redirection plugin hit log (`date,source,target,…`) |
| `2026-08-05-redirection-log.unique.json` | Deduped source→target pairs from that log |
| `2026-08-04-live-probe.csv` | Earlier alias probe |
| Canonical rules | `src/data/redirects.yml` (**20** rules: 12 aliases + 8 from hit log) |
| Generated | `public/_redirects` + `public/_redirects.json` via `pnpm run redirects:generate` |

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then merge into `redirects.yml`. Hit logs work when `source`/`target` columns are present (dedupe by `from`). FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
