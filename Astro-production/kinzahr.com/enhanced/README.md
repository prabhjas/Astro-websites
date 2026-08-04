# Enhanced conversion upload scripts (all brands → Kinza host for now)

Temporary setup: **all** brand PHP scripts run from `kinzahr.com` only.

Shared secrets live in this site’s `.env` / `.env.prod`:

- `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_COMPANY_DOMAIN`
- `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `ENHANCED_RUN_SECRET` (required on production; loopback needs no key)

**Do not set** `GOOGLE_ADS_CUSTOMER_ID` or `GOOGLE_ADS_CONVERSION_ACTION` in `.env` while hosting multiple scripts — each PHP file has its own built-in customer + conversion action.

## URLs (local)

| File | Local |
|------|--------|
| kinzahr.php | http://127.0.0.1:5093/enhanced/kinzahr.php |
| cr.php | http://127.0.0.1:5093/enhanced/cr.php |
| crb2b.php | http://127.0.0.1:5093/enhanced/crb2b.php |
| crnew.php | http://127.0.0.1:5093/enhanced/crnew.php |
| crb2bnew.php | http://127.0.0.1:5093/enhanced/crb2bnew.php |
| chr.php | http://127.0.0.1:5093/enhanced/chr.php |
| cfm.php | http://127.0.0.1:5093/enhanced/cfm.php |
| ib.php | http://127.0.0.1:5093/enhanced/ib.php |

## URLs (production, later)

`https://kinzahr.com/enhanced/<file>.php?key=<ENHANCED_RUN_SECRET>`

Astro Node runs these via `php` CLI (`src/pages/enhanced/[...path].ts`).
