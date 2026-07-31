# Astro-websites fleet docs

Start with the root **[README.md](../README.md)** (architecture, install, CMS, local fleet).

| Doc | Purpose |
|-----|---------|
| **[CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md)** | Convert/add a site + FLOW API detail |
| [server-side-work.md](server-side-work.md) | Server overview (units, ports, Tier 1/2) |
| [local-fleet-test.md](local-fleet-test.md) | Local pnpm fleet runner + smoke tests |
| [server-ops-only.md](server-ops-only.md) | Root/host checklist only |

Shared CMS package: [`packages/site-cms`](../packages/site-cms/README.md) (`@connect/site-cms`).

Per-site docs live under each `Astro-production/<domain>/docs/` (including `CONNECT-ASTRO-FLEET-STANDARD.md`).
