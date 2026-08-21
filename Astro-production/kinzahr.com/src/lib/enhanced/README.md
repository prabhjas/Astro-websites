# Enhanced offline conversions (Node)

Same URL paths as the old PHP jobs (basename still ends in `.php` for cron compatibility).
**Runtime is Astro/Node only — PHP is not executed.**

Legacy PHP sources (reference only): `src/lib/enhanced/legacy-php/` — not URL-reachable.

Jobs (all six, same path): `kinzahr.php` · `cfm.php` · `chr.php` · `ib.php` · `cr.php` · `crb2b.php`

## Two ways to run

### 1. Regular hit — last 2 days (default)

No date query. Used by the 12-hour timer and by a manual run like the one we just did.

```bash
cd Astro-production/kinzahr.com
BASE_URL=http://127.0.0.1:5093 ./scripts/run-enhanced-jobs.sh
```

Window comes from `jobs.ts`: `{ kind: 'last_n_days', days: 2 }` (overlap covers timezone edges, Pipedrive lag, and one missed run).

### 2. Dated hit — you name the day or range

When you say “hit 6 Aug” or “6–10 Aug”, pass that window. Invalid dates return **400** (they do not silently fall back to 2 days).

| What you want | Script | URL query |
|---------------|--------|-----------|
| One day | `--date 2026-08-06` | `?date=2026-08-06` |
| Inclusive range | `--from 2026-08-06 --to 2026-08-10` | `?start=2026-08-06&end=2026-08-10` |
| From a day through today | `--from 2026-08-06` | `?start=2026-08-06` |

```bash
cd Astro-production/kinzahr.com

# One day
./scripts/run-enhanced-jobs.sh --date 2026-08-06

# Range (covers the missed 6–10 Aug window)
./scripts/run-enhanced-jobs.sh --from 2026-08-06 --to 2026-08-10

# Same via env
DATE=2026-08-06 ./scripts/run-enhanced-jobs.sh
FROM_DATE=2026-08-06 TO_DATE=2026-08-10 ./scripts/run-enhanced-jobs.sh
```

`scripts/run-enhanced-backfill.sh` is a thin alias of the same script.

Query aliases: `day` = `date`; `from`/`to` = `start`/`end`.
Env fallback (no query): `ENHANCED_WINDOW_START` / `ENHANCED_WINDOW_END`.

## Manual hit URLs

Auth header required on every request:

```http
Authorization: Bearer <ENHANCED_RUN_SECRET>
```

Also accepted: `x-enhanced-key` or `x-internal-job-secret`.
**Rejected:** `?key=` / `?secret=`.

### Production

Public `https://kinzahr.com/enhanced/…` is **401** (frontend split). That is fine — hit the trusted backend on the Astro host (the runner rewrites the public URL to loopback automatically):

```bash
# On the Astro host (or with BASE_URL/HOST_HEADER set):
./scripts/run-enhanced-jobs.sh
```

`/enhanced/` is **noindex, nofollow** (`X-Robots-Tag` + HTML meta + `robots.txt` Disallow), including 401/404, so if the public URL ever starts serving these jobs they will not be indexed.

| Job | Path |
|-----|------|
| Kinza HR | `/enhanced/kinzahr.php` |
| Connect FM | `/enhanced/cfm.php` |
| Connect HR | `/enhanced/chr.php` |
| Iberia | `/enhanced/ib.php` |
| Connect Resources B2C | `/enhanced/cr.php` |
| Connect Resources B2B | `/enhanced/crb2b.php` |
| Connect Resources B2C (alias) | `/enhanced/crnew.php` |
| Connect Resources B2B (alias) | `/enhanced/crb2bnew.php` |

### Local (Kinza on :5093)

```bash
curl -fsS -H "Authorization: Bearer $ENHANCED_RUN_SECRET" \
  "http://127.0.0.1:5093/enhanced/kinzahr.php"

# Dated
curl -fsS -H "Authorization: Bearer $ENHANCED_RUN_SECRET" \
  "http://127.0.0.1:5093/enhanced/kinzahr.php?date=2026-08-06"
```

Successful responses include `X-Enhanced-Window: 2026-08-06/2026-08-06` and `X-Enhanced-Window-Source: override|default`.

Publish-safe runner URL (use this from the host): `/enhanced/job?file=kinzahr.php` plus optional `date` / `start` / `end`.

## Automate every 12 hours

Script: `scripts/run-enhanced-jobs.sh` (no date args → last 2 days).
Systemd templates (owner install on Astro host after deploy):

- `deploy/enhanced-conversions.service` (loopback `:15093` + `Host: kinzahr.com`)
- `deploy/enhanced-conversions.timer` (00:15 and 12:15 host local time)

```bash
# On server as root (after code deploy):
sudo cp /opt/Astro-production/kinzahr.com/deploy/enhanced-conversions.service /etc/systemd/system/
sudo cp /opt/Astro-production/kinzahr.com/deploy/enhanced-conversions.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now enhanced-conversions.timer
sudo systemctl list-timers enhanced-conversions.timer
```

Ensure `ENHANCED_RUN_SECRET` is set in the unit’s `EnvironmentFile` (site `.env.prod`).

Prefer systemd timer over putting the secret in crontab. The timer is **not** installed on the host until root enables it.

## Required env

`PIPEDRIVE_API_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `ENHANCED_RUN_SECRET`
Leave `GOOGLE_ADS_CUSTOMER_ID` / `GOOGLE_ADS_CONVERSION_ACTION` unset so each job uses its own defaults in `jobs.ts`.

## Failure alerts (email)

On **hard failures only** (HTTP 500 — token refresh, missing env, Pipedrive down, Ads API hard error / likely version bump), the route emails:

- To: `ENHANCED_ALERT_EMAIL` (default `prabhjas.s@connectgroup.co`)
- Subject includes category: `ads_api_version` | `ads_oauth` | `ads_auth` | `pipedrive` | `config` | `network` | `unknown`
- Body: reason + error detail + log tail

**Does not email** for Google Ads partial row warnings (`EXPIRED_EVENT`, etc.) that still return HTTP 200, or for HTTP 400 bad date queries.

Needs optional SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `FORM_FROM_EMAIL` or `ENHANCED_ALERT_FROM`). If SMTP is unset, the failure is logged and the alert is skipped — the job still returns 500.
