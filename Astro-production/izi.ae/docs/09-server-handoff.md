# Phase 09 — Server app sync handoff (izi.ae)

Developer stop point: **loopback verify green**. Do **not** edit live `/etc/caddy` or reload Caddy from a laptop.

| Item | Value |
|------|--------|
| Host path | `/opt/Astro-production/izi.ae/` |
| Port | `5121` |
| Unit | `izi.service` → `deploy/izi.service` |
| Unix user | `site-izi` |
| Canonical | `https://izi.ae` |
| Caddy git block | `caddy/Caddyfile.production` + `deploy/izi.ae.caddy` |

## Webdev / operator steps

1. Portable deploy: build on host (or Linux) — real `node_modules`, not laptop symlink tree.
2. Place `.env` (PUBLIC / build: `PUBLIC_SITE_URL=https://izi.ae`, `PUBLIC_GA4_ID=G-6FB28YLPSD`) and `.env.prod` (secrets, LF line endings).
3. Unique `INTERNAL_JOB_SECRET` for this domain only.
4. Loopback: `curl -sS http://127.0.0.1:5121/api/health/` → `{"ok":true,...}`
5. Re-run Phase 10 on loopback, then hand to owner for Caddy cutover.
