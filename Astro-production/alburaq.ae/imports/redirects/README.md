# Redirects import staging — alburaq.ae

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-07-redirection-log.csv` | User Redirection plugin hit log (`date,source,target,…`) — **header only / 0 hits** |
| `2026-08-07-redirection-log.unique.json` | Deduped source→target pairs from that log |
| Canonical rules | `src/data/redirects.yml` (common aliases + hit-log pairs) |
| Generated | `public/_redirects` + `public/_redirects.json` via `pnpm run redirects:generate` |

Drop Rank Math / Redirection **rules** exports here as `YYYY-MM-DD-<source>.csv` or `.json`, then:

```bash
node scripts/_merge-redirect-log.mjs path/to/export.csv
pnpm run redirects:generate
```

FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
