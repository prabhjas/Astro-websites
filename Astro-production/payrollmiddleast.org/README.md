# payrollmiddleast.org (Astro)

Payroll Middle East (https://payrollmiddleast.org/) — WordPress/Impreza → Astro SSR mirror.

| | |
|--|--|
| Fleet id | `payrollmiddleast` |
| Port | `5110` |
| Mode | Full CMS (`FEATURES_FULL_CMS`) |
| Peer | `peomiddleast.com` |
| Canonical | `https://payrollmiddleast.org` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up payrollmiddleast
node scripts/fleet-local.mjs smoke payrollmiddleast
```

Local: http://127.0.0.1:5110/  
Deploy templates: `deploy/` · owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md`
