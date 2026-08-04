# Import redirects (CSV / JSON) — interim until FLOW

**Audience:** developers + Cursor agents when someone shares a Rank Math / Redirection / SEO export.  
**Until Aaron’s FLOW dashboard is live**, redirects are applied in the repo. After FLOW: manage via bearer `/api/internal/redirects/*` — stop hand-editing YAML for day-to-day changes.

| Field | Value |
|-------|--------|
| **Updated** | 2026-08-03 |
| **Staging folder** | `Astro-production/<domain>/imports/redirects/` |
| **Live source of truth (now)** | `Astro-production/<domain>/src/data/redirects.yml` |
| **Runtime (SSR)** | `.data/internal-admin/redirects.json` (gitignored) + YAML sync |
| **FLOW later** | `POST /api/internal/redirects/import` + save/delete APIs |

Paste into Cursor (fill in the blanks):

```text
Follow docs/CURSOR-IMPORT-REDIRECTS.md for site <domain>.

I am attaching / dropping a redirects export (CSV or JSON).
1. Save the file under Astro-production/<domain>/imports/redirects/ with a dated name.
2. Parse Rank Math / from-to CSV or JSON (same rules as @connect/site-cms parseRankMathRedirectImport).
3. Merge into src/data/redirects.yml (dedupe by `from`; keep existing rules unless I say replace-all).
4. Run that site’s redirects:generate (or pnpm --filter <pkg> run redirects:generate).
5. Summarize: how many imported, how many total, any bad rows skipped.
6. Do NOT invent a per-site dashboard. FLOW will own redirects later via /api/internal/redirects/*.

Domain: _______________
Mode: merge | replace-all
File: _______________
```

---

## 1. Folder layout (every site)

```text
Astro-production/<domain>/
  imports/
    redirects/
      README.md                 # points here
      .gitkeep
      2026-08-03-rank-math.csv  # dated exports (keep for audit)
      2026-08-03-rank-math.json
  src/data/redirects.yml        # committed canonical rules
  .data/internal-admin/
    redirects.json              # runtime store (gitignored) — FLOW / import API
```

**connectgroup.co example:** `Astro-production/connectgroup.co/imports/redirects/`

Name exports:

```text
YYYY-MM-DD-<source>.csv
YYYY-MM-DD-<source>.json
```

Examples: `2026-08-03-rank-math.csv`, `2026-08-03-redirection-plugin.json`.

---

## 2. Accepted file shapes

Parser matches `@connect/site-cms` (`parseRankMathRedirectImport`):

### CSV

Header row required. Accepted column aliases:

| Role | Headers (any of) |
|------|------------------|
| From | `from`, `source`, `url_from`, `url`, `match_url`, `regex_url` |
| To | `to`, `target`, `destination`, `url_to` (or Rank Math `action_data.url`) |
| Status | `action_code`, `code`, `header_code`, `statusCode`, `status` → `301`/`302`/`307`/`308` (else 301) |

Common Rank Math style:

```csv
source,destination,type,status
/old-page/,/new-page/,301,active
```

or:

```csv
from,to,status
/old-page/,/new-page/,301
```

Inactive / `enabled=false` / `status=inactive|disabled` rows are **skipped**.

### JSON

- Array of objects with the same field names, **or**
- Rank Math export object that contains a redirects array (parser accepts typical Rank Math JSON)

Paths are normalised to start with `/` and preferably end with `/` (fleet style). Absolute `https://domain/...` sources are stripped to path-only.

---

## 3. Agent steps (do in order)

1. **Confirm domain** and that `Astro-production/<domain>/` exists in the monorepo.
2. **Save** the attached export into `imports/redirects/` (never leave it only in chat Downloads).
3. **Parse** the file; list count of valid rules and skipped rows.
4. **Merge** into `src/data/redirects.yml`:
   - Default **merge**: existing + new, dedupe by `from` (newer import wins on conflict).
   - **replace-all** only if the user explicitly asks.
5. **Regenerate** host artifacts:

```bash
# from monorepo root — use the site’s package name
pnpm --filter connectgroup-astro run redirects:generate
# or inside the site:
cd Astro-production/<domain> && pnpm run redirects:generate
```

6. Optionally sync runtime for local SSR smoke (if site is running):

```bash
# FLOW-compatible import (needs site up + INTERNAL_JOB_SECRET)
curl -sS -X POST "http://127.0.0.1:<PORT>/api/internal/redirects/import" \
  -H "Authorization: Bearer $INTERNAL_JOB_SECRET" \
  -F "file=@Astro-production/<domain>/imports/redirects/<file>"
```

Or write `.data/internal-admin/redirects.json` to match YAML (middleware reads both YAML + runtime JSON).

7. **Smoke** a couple of `from` URLs locally (`fleet-local`) — expect 301/302 to `to`.
8. **Report** counts + path to the saved export + note that FLOW will supersede hand merges later.

---

## 4. YAML shape (canonical)

```yaml
# Permanent redirects — SEO / migration
redirects:
  - from: /old-slug/
    to: /new-slug/
    status: 301
```

`astro.config.mjs` loads this file. `scripts/generate-redirects.mjs` writes `public/_redirects` + `public/_redirects.json`.

---

## 5. FLOW (when Aaron’s dashboard is ready)

| Action | API |
|--------|-----|
| List | `GET /api/internal/redirects/` |
| Create/update | `POST /api/internal/redirects/save` |
| Delete | `POST /api/internal/redirects/delete` |
| Bulk delete | `POST /api/internal/redirects/bulk-delete` |
| Import file | `POST /api/internal/redirects/import` (`multipart` field `file`) |

Auth: `Authorization: Bearer <INTERNAL_JOB_SECRET>` (unique per domain).

Then day-to-day redirect edits happen in **FLOW**, not by pasting CSV into Cursor — keep `imports/redirects/` only for audit / one-shot migrations.

---

## 6. What not to do

1. Do not rebuild a per-site redirects UI under `/internal/operations`.
2. Do not put secrets in the CSV/JSON.
3. Do not overwrite `redirects.yml` with an empty file.
4. Do not skip saving the export under `imports/redirects/` (audit trail).
5. Do not use SMTP / FormData contact patterns for this — redirects are file/API only.

---

## 7. Quick checklist

- [ ] Export saved under `imports/redirects/YYYY-MM-DD-…`
- [ ] Parsed; skipped inactive/bad rows noted
- [ ] Merged into `src/data/redirects.yml`
- [ ] `redirects:generate` run
- [ ] Sample URLs smoke-checked
- [ ] Summary given to the requester
