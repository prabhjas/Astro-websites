# emiratisationnafis.org (Astro fleet)

HR & Payroll software site for Saudi Arabia — WordPress/Elementor HTML mirror → Astro SSR.

| | |
|--|--|
| **Live** | https://emiratisationnafis.org/ |
| **Local** | http://127.0.0.1:5108 |
| **Peer** | `redo.ae` (`FEATURES_FULL_CMS`) |
| **Unit** | `emiratisationnafis.service` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up emiratisationnafis
node scripts/fleet-local.mjs smoke emiratisationnafis
```

Phase sign-off: `docs/10-phase-signoff.md`  
Owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md` (repo root)
