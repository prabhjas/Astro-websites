# Redirect import — 2026-08-07 (v2)

| Field | Value |
|-------|--------|
| Domain | thefreelancergate.com |
| Mode | **merge** (default) |
| File | `Downloads/redirection-log-August 7, 2026.csv` → `imports/redirects/2026-08-07-redirection-log-v2.csv` |

## Parse result

| Metric | Count |
|--------|------:|
| Imported (valid from→to) | **0** |
| Bad / empty data rows skipped | **0** (no data rows at all) |
| Existing rules kept | **4** |
| Total in `redirects.yml` after merge | **4** |

CSV content is only:

```text
date,source,target,ip,referrer,agent
```

That is a **Redirection plugin hit-log** template with no hits — not a rules export. Per docs §6.3, do **not** overwrite `redirects.yml` with an empty import.

## Still active (unchanged)

- `/about/` → `/about-us/` 301
- `/about` → `/about-us/` 301
- `/contact/` → `/contact-us/` 301
- `/contact` → `/contact-us/` 301

## Need instead

WordPress admin → **Redirection → Import/Export → Export**  
Export **redirects** (JSON or CSV with `source`/`url` + `target`/`action_data`), **not** “Download log”.
