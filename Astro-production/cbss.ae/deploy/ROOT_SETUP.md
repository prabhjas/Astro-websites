# CBSS deploy notes (fleet Tier 1)

See `docs/CONNECT-ASTRO-FLEET-STANDARD.md` §6.

## On host (ops / root)

1. Create unix user/group `site-cbss` if missing.
2. Ensure tree `/opt/Astro-production/cbss.ae` is owned appropriately; `.env.prod` mode `600`.
3. Confirm free PORT (snippet uses `5081` — change if taken).
4. Install unit: copy `cbss.service` → `/etc/systemd/system/cbss.service` (or site-ctl equivalent).
5. Install Caddy site: copy `cbss.ae.caddy` → `/etc/caddy/sites.d/`.
6. `caddy validate` then reload Caddy.
7. Build + restart:

```bash
cd /opt/Astro-production/cbss.ae
npm ci   # or pnpm install after fleet cutover
npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now cbss
```

Preserve on deploy: `.env.prod`, `.data/`.

## Smoke (after deploy)

```bash
BASE=https://www.cbss.ae
SECRET=…   # INTERNAL_JOB_SECRET from .env.prod

curl -sS "$BASE/api/health"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"   # expect 404
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/api/internal/leads"          # expect 403
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/leads?limit=1"
```
