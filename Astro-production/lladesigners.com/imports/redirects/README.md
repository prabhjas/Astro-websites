# Redirects import staging — lladesigners.com

See monorepo docs: [`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md).

| File | Notes |
|------|--------|
| `2026-08-10-redirection-export.json` | Redirection plugin **rules** export (39 rows → **37** enabled unique) |
| `2026-08-05-redirection-log.csv` | Older hit log (`date,source,target,…`) |
| `2026-08-05-redirection-log.unique.json` | Deduped pairs from that log |
| Canonical rules | `src/data/redirects.yml` |
| Generated | `public/_redirects` + `public/_redirects.json` via `pnpm run redirects:generate` |

Import a Redirection JSON export:

```bash
node scripts/import-redirection-export.mjs path/to/redirection-export.json
pnpm run redirects:generate
```

FLOW will own day-to-day edits later via `/api/internal/redirects/*`.
