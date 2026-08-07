# Enhanced offline conversions (Node)

Same URL paths as the old PHP jobs (basename still ends in `.php` for cron compatibility).  
**Runtime is Astro/Node only — PHP is not executed.**

Legacy PHP sources (reference only): `src/lib/enhanced/legacy-php/` — not URL-reachable.

## Manual hit URLs

Auth header required on every request:

```http
Authorization: Bearer <ENHANCED_RUN_SECRET>
```

Also accepted: `x-enhanced-key` or `x-internal-job-secret`.  
**Rejected:** `?key=` / `?secret=`.

### Production

| Job | URL |
|-----|-----|
| Kinza HR | `https://kinzahr.com/enhanced/kinzahr.php` |
| Connect FM | `https://kinzahr.com/enhanced/cfm.php` |
| Connect HR | `https://kinzahr.com/enhanced/chr.php` |
| Iberia | `https://kinzahr.com/enhanced/ib.php` |
| Connect Resources B2C | `https://kinzahr.com/enhanced/cr.php` |
| Connect Resources B2B | `https://kinzahr.com/enhanced/crb2b.php` |
| Connect Resources B2C (alias) | `https://kinzahr.com/enhanced/crnew.php` |
| Connect Resources B2B (alias) | `https://kinzahr.com/enhanced/crb2bnew.php` |

## Date window (12-hour automation)

**Recommendation: last 2 days** (not 1). With a twice-daily timer that overlap covers timezone edges, Pipedrive lag, and one missed run. A 1-day window is tighter but can miss late-synced deals. Long windows (30 days / 2 months) mostly produce Google `EXPIRED_EVENT` noise.

Configured in `jobs.ts` for every job: `{ kind: 'last_n_days', days: 2 }`.

### Local (Kinza on :5093)

Same paths on `http://127.0.0.1:5093`, e.g.:

```bash
curl -fsS -H "Authorization: Bearer $ENHANCED_RUN_SECRET" \
  "http://127.0.0.1:5093/enhanced/kinzahr.php"
```

Or run all jobs:

```bash
cd Astro-production/kinzahr.com
BASE_URL=http://127.0.0.1:5093 ENHANCED_RUN_SECRET=… ./scripts/run-enhanced-jobs.sh
```

## Automate every 12 hours

Script: `scripts/run-enhanced-jobs.sh`  
Systemd templates (owner install on Astro host after deploy):

- `deploy/enhanced-conversions.service`
- `deploy/enhanced-conversions.timer` (00:15 and 12:15 UTC-ish host local time)

```bash
# On server as root (after code deploy):
sudo install -m 755 /opt/Astro-production/kinzahr.com/scripts/run-enhanced-jobs.sh \
  /opt/Astro-production/kinzahr.com/scripts/run-enhanced-jobs.sh
sudo cp /opt/Astro-production/kinzahr.com/deploy/enhanced-conversions.service /etc/systemd/system/
sudo cp /opt/Astro-production/kinzahr.com/deploy/enhanced-conversions.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now enhanced-conversions.timer
sudo systemctl list-timers enhanced-conversions.timer
```

Ensure `ENHANCED_RUN_SECRET` is set in the unit’s `EnvironmentFile` (site `.env.prod`).

Cron alternative (webdev crontab):

```cron
15 */12 * * * BASE_URL=https://kinzahr.com ENHANCED_RUN_SECRET=… /opt/Astro-production/kinzahr.com/scripts/run-enhanced-jobs.sh >>/var/log/kinza-enhanced.log 2>&1
```

Prefer systemd timer over putting the secret in crontab.

## Required env

`PIPEDRIVE_API_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `ENHANCED_RUN_SECRET`  
Leave `GOOGLE_ADS_CUSTOMER_ID` / `GOOGLE_ADS_CONVERSION_ACTION` unset so each job uses its own defaults in `jobs.ts`.

## Failure alerts (email)

On **hard failures only** (HTTP 500 — token refresh, missing env, Pipedrive down, Ads API hard error / likely version bump), the route emails:

- To: `ENHANCED_ALERT_EMAIL` (default `prabhjas.s@connectgroup.co`)
- Subject includes category: `ads_api_version` | `ads_oauth` | `ads_auth` | `pipedrive` | `config` | `network` | `unknown`
- Body: reason + error detail + log tail

**Does not email** for Google Ads partial row warnings (`EXPIRED_EVENT`, etc.) that still return HTTP 200.

Needs optional SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `FORM_FROM_EMAIL` or `ENHANCED_ALERT_FROM`). If SMTP is unset, the failure is logged and the alert is skipped — the job still returns 500.
