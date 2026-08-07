# peomiddleast.com (Astro)

PEO Middle East (https://peomiddleast.com/) — WordPress/Impreza → Astro SSR mirror.

| | |
|--|--|
| Fleet id | `peomiddleeast` |
| Port | `5118` |
| Mode | Full CMS (`FEATURES_FULL_CMS`) |
| Peer | `eormiddleast.com` |
| Canonical | `https://peomiddleast.com` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up peomiddleeast
node scripts/fleet-local.mjs smoke peomiddleeast
```

Local: http://127.0.0.1:5118/  
Deploy templates: `deploy/` · owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md`
