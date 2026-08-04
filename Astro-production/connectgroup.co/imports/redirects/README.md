# Redirects imports (staging)

Drop Rank Math / SEO redirect exports (**CSV or JSON**) here.

Cursor / agents: follow the monorepo prompt  
[`docs/CURSOR-IMPORT-REDIRECTS.md`](../../../../docs/CURSOR-IMPORT-REDIRECTS.md)

```text
imports/redirects/YYYY-MM-DD-<source>.csv
imports/redirects/YYYY-MM-DD-<source>.json
```

## How redirects work (until FLOW)

| Layer | File | Role |
|-------|------|------|
| **Committed rules** | `src/data/redirects.yml` | Repo source of truth (git) |
| **Generated static** | `public/_redirects` + `public/_redirects.json` | Generated via `pnpm redirects:generate` |
| **Runtime JSON** | `.data/internal-admin/redirects.json` | Live SSR store (gitignored). Middleware reads this + YAML. **JSON wins** on the same `from`. |
| **Hit stats** | `.data/internal-admin/redirect-stats.json` | Counters only — **not** the redirect rules |

Seed / interim: copy rules into `.data/internal-admin/redirects.json` (array of `{ from, to, status }`). Middleware applies them immediately after restart (no YAML edit required for runtime-only tests). Prefer also merging into `redirects.yml` so deploys stay in sync.

When FLOW is live, manage redirects via `/api/internal/redirects/*` — that API writes `redirects.json` (and syncs YAML). Keep files under `imports/redirects/` only as an audit trail.
