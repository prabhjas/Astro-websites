# Iberia Workforce — overview

Production site under `Astro-production/iberiaworkforce.com`.

| Item | Value |
|------|-------|
| Domain | `iberiaworkforce.com` |
| Unit | `iberiaworkforce` |
| Port | `5083` |
| Stack | Astro 7.1.6 + Node 11.0.3 + Tailwind 4 |
| Languages | EN (default) + ES (`/es/`) |
| Forms | `POST /api/contact` → file store + Pipedrive retries |
| CMS | Central only via `/api/internal/*` (no per-site dashboard) |

See `CONNECT-ASTRO-FLEET-STANDARD.md` and `deploy/ROOT_SETUP.md`.
