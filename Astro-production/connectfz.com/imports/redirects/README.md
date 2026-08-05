# Redirect imports (audit trail) — connectfz.com

Place Rank Math / Redirection / SEO exports here as `YYYY-MM-DD-<source>.csv|json`.

| | |
|--|--|
| **Canonical rules** | `src/data/redirects.yml` |
| **Generate host copies** | `pnpm redirects:generate` → `public/_redirects` + `_redirects.json` |
| **Runtime (SSR)** | Middleware merges YAML + `.data/internal-admin/redirects.json` |
| **FLOW later** | `/api/internal/redirects/*` with bearer |

Monorepo doc: [CURSOR-IMPORT-REDIRECTS.md](../../../../docs/CURSOR-IMPORT-REDIRECTS.md)

Current scaffold sample: `2026-08-04-scaffold-smoke.csv` (home → `/`). Replace with live export when available.
