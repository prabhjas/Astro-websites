# Astro-websites fleet docs

Start with the root **[README.md](../README.md)** (architecture, install, CMS, local fleet).

| Doc | Purpose |
|-----|---------|
| **[CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md)** | **Share with Cursor** — convert WP/static site into this fleet |
| **[CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md)** | **Share with Cursor** — clone, install, run sites locally |
| **[CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md)** | **Share with Cursor** — scan WP clones for malware / injects |
| [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Deep dive: forms, geo, Pipedrive, FLOW API |
| [server-side-work.md](server-side-work.md) | Server overview (units, ports, Tier 1/2) |
| [local-fleet-test.md](local-fleet-test.md) | Local pnpm fleet runner + smoke tests (detail) |
| [server-ops-only.md](server-ops-only.md) | Root/host checklist only |

Shared CMS package: [`packages/site-cms`](../packages/site-cms/README.md) (`@connect/site-cms`).

Per-site docs live under each `Astro-production/<domain>/docs/` (including `CONNECT-ASTRO-FLEET-STANDARD.md`).
