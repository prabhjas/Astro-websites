# pittant.com (Astro fleet)

HR & Payroll software site for Saudi Arabia — WordPress/Elementor HTML mirror → Astro SSR.

| | |
|--|--|
| **Live** | https://pittant.com/ |
| **Local** | http://127.0.0.1:5111 |
| **Peer** | `redo.ae` (`FEATURES_FULL_CMS`) |
| **Unit** | `pittant.service` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up pittant
node scripts/fleet-local.mjs smoke pittant
```

Phase sign-off: `docs/10-phase-signoff.md`  
Owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md` (repo root)
