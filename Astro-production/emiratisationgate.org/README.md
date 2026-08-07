# emiratisationgate.org (Astro fleet)

HR & Payroll software site for Saudi Arabia — WordPress/Elementor HTML mirror → Astro SSR.

| | |
|--|--|
| **Live** | https://emiratisationgate.org/ |
| **Local** | http://127.0.0.1:5105 |
| **Peer** | `redo.ae` (`FEATURES_FULL_CMS`) |
| **Unit** | `emiratisationgate.service` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up emiratisationgate
node scripts/fleet-local.mjs smoke emiratisationgate
```

Phase sign-off: `docs/10-phase-signoff.md`  
Owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md` (repo root)
