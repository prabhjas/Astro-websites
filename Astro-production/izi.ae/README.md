# izi.ae (Astro fleet)

IZI Rent a Car — WordPress/Elementor HTML mirror → Astro SSR (Connect Group fleet).

| | |
|--|--|
| **Live** | https://izi.ae/ |
| **Local** | http://127.0.0.1:5121 |
| **Peer** | `pittant.com` (`FEATURES_FULL_CMS`) |
| **Unit** | `izi.service` |
| **Mode** | Full CMS |

```bash
# From monorepo root
pnpm install
pnpm --filter izi-astro run import:sitemap:download
pnpm --filter izi-astro run migrate:posts
node scripts/fleet-local.mjs up izi
node scripts/fleet-local.mjs smoke izi
```

Owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md` (repo root)
