# emiratisationgateway.com (Astro fleet)

Emiratisation recruitment & Nafis services — WordPress/Elementor HTML mirror → Astro SSR.

| | |
|--|--|
| **Live** | https://emiratisationgateway.com/ |
| **Local** | http://127.0.0.1:5106 |
| **Peer** | `emiratisationgate.org` (`FEATURES_FULL_CMS`) |
| **Unit** | `emiratisationgateway.service` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up emiratisationgateway
node scripts/fleet-local.mjs smoke emiratisationgateway
```

Phase sign-off: `docs/10-phase-signoff.md`  
Owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md` (repo root)
