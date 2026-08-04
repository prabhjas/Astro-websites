# Astro-websites fleet docs

Start with the root **[README.md](../README.md)** (architecture, install, CMS, local fleet).

| Doc | Purpose |
|-----|---------|
| **[CONNECT-FLOW-SITE-ONBOARDING.md](CONNECT-FLOW-SITE-ONBOARDING.md)** | **Primary** — clone → Astro fleet → FLOW CMS (posts, redirects, GTM/GA4, leads, attribution) |
| **[CURSOR-IMPORT-REDIRECTS.md](CURSOR-IMPORT-REDIRECTS.md)** | **Share with Cursor** — import CSV/JSON redirects into `imports/redirects/` (until FLOW) |
| **[CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md)** | Convert WP/static site into this fleet (shorter) |
| **[CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md)** | Clone, install, run sites locally |
| **[CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md)** | Scan WP clones for malware / injects |
| **[CLAUDE-CONNECTGROUP-HANDOFF.md](CLAUDE-CONNECTGROUP-HANDOFF.md)** | Connect Group GitHub + project context |
| **[TASK-CONNECTHR-AE-ASTRO-CLONE.md](TASK-CONNECTHR-AE-ASTRO-CLONE.md)** | Task: clone connecthr.ae WP → Astro fleet |
| [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Deep dive: forms, geo, Pipedrive, FLOW API |
| [server-side-work.md](server-side-work.md) | Server overview (units, ports, Tier 1/2) |
| [local-fleet-test.md](local-fleet-test.md) | Local pnpm fleet runner + smoke tests (detail) |
| [server-ops-only.md](server-ops-only.md) | Root/host checklist only |

Shared CMS package: [`packages/site-cms`](../packages/site-cms/README.md) (`@connect/site-cms`).

Per-site docs live under each `Astro-production/<domain>/docs/` (including `CONNECT-ASTRO-FLEET-STANDARD.md`).
