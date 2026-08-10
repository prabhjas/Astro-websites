# alburaq.ae (Astro fleet)

HR & Payroll software site for Saudi Arabia — WordPress/Elementor HTML mirror → Astro SSR.

| | |
|--|--|
| **Live** | / |
| **Local** | http://127.0.0.1:5120 |
| **Peer** | `redo.ae` (`FEATURES_FULL_CMS`) |
| **Unit** | `alburaq.service` |

```bash
# From monorepo root
pnpm install
node scripts/fleet-local.mjs up alburaq
node scripts/fleet-local.mjs smoke alburaq
```

Phase sign-off: `docs/10-phase-signoff.md`  
Owner Caddy: `docs/OPS-OWNER-CADDY-CUTOVER.md` (repo root)
