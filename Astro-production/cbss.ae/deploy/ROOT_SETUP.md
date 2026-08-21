# CBSS deploy notes (fleet Tier 1)

App path: `/opt/Astro-production/cbss.ae`  
Unit: `cbss` · PORT **5081** · user **`site-cbss`**  
See `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · `docs/server-ops-only.md`.

## Env (two files)

| File | Mode / owner | Contents |
|------|----------------|----------|
| `.env.prod` | `root:site-cbss` **0640** | Runtime secrets. **Required** by unit (`EnvironmentFile=` **without** `-`). |
| `.env` | `root:webdev` **0644** | Build-only — `PUBLIC_SITE_URL` (no secrets). |

No `HOST`/`PORT` in env files.

## On host (ops / root)

1. Create `site-cbss` if missing; own `.data/` for that user.
2. Install unit from `deploy/cbss.service` (fail-loud `.env.prod`).
3. Merge the complete deploy Caddy block into `caddy/Caddyfile.production` and the reviewed single `/etc/caddy/Caddyfile`; do not create a `sites.d` import.
4. `caddy validate` then reload (keep Caddyfile group-readable).
5. Build + restart:

```bash
cd /opt/Astro-production
pnpm --filter astro-cbss run build
sudo site-ctl restart cbss
```

Preserve on deploy: `.env.prod`, `.data/`.

## Smoke

```bash
BASE=https://cbss.ae   # or www — match PUBLIC_SITE_URL
curl -sS "$BASE/api/health/"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/this-should-404-fleet-test"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/api/internal/leads/"   # expect 403
```
