# Astro-websites fleet docs

## Start here

| Priority | Doc | Use |
|----------|-----|-----|
| **1** | **[00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md)** | **Numbered lifecycle** — develop → test → forms → security → git deploy templates → verify → **owner Caddy last** |
| **ports** | **[FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)** | **All 44 domains + ports + scaffolded vs placeholder** (share with developers) |
| **verify** | **[10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md)** | Trailing slash, canonical, GTM, forms, APIs, redirects — before/after cutover |
| 2 | Root [README.md](../README.md) | Architecture, install, CMS overview |

Paste into Cursor: *Follow docs/00-NEW-SITE-MASTER.md for \<domain\>.*

---

## Phase detail (linked from the master)

| Phase | Doc | Purpose |
|-------|-----|---------|
| 01 | [CURSOR-WP-CLONE-MALWARE-SCAN.md](CURSOR-WP-CLONE-MALWARE-SCAN.md) | Scan WP clones for malware / injects |
| 02 | [CURSOR-CONVERT-STATIC-TO-ASTRO.md](CURSOR-CONVERT-STATIC-TO-ASTRO.md) | Convert WP/static site into this fleet |
| 03 | [CONNECT-FLOW-SITE-ONBOARDING.md](CONNECT-FLOW-SITE-ONBOARDING.md) | Clone → Astro fleet → FLOW CMS (posts, redirects, GTM, leads) |
| 04 | [CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md](CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md) | Deep dive: forms, geo, Pipedrive, FLOW API |
| 05 | [CURSOR-IMPORT-REDIRECTS.md](CURSOR-IMPORT-REDIRECTS.md) | Import CSV/JSON redirects (until FLOW) |
| 06 | [CURSOR-RUN-FLEET.md](CURSOR-RUN-FLEET.md) · [local-fleet-test.md](local-fleet-test.md) | Clone, install, run + smoke locally |
| 08 | [CONNECT-CADDY-DEPLOYMENT.md](CONNECT-CADDY-DEPLOYMENT.md) | Caddy **patterns** + git templates (not live reload) |
| 09 | [server-side-work.md](server-side-work.md) · [server-ops-only.md](server-ops-only.md) | App sync / server overview |
| 10 | **[10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md)** | Full go-live verify |

Also: [`caddy/`](../caddy/README.md) (Caddy archive) · [CLAUDE-CONNECTGROUP-HANDOFF.md](CLAUDE-CONNECTGROUP-HANDOFF.md) (GitHub context)

Shared CMS package: [`packages/site-cms`](../packages/site-cms/README.md) (`@connect/site-cms`).

Per-site docs live under each `Astro-production/<domain>/docs/` (including `CONNECT-ASTRO-FLEET-STANDARD.md` and `13-go-live-server-handoff.md`).

---

## Owner / ops only (not for day-to-day developers)

| Doc | Use |
|-----|-----|
| **[OPS-OWNER-CADDY-CUTOVER.md](OPS-OWNER-CADDY-CUTOVER.md)** | **Live Caddy + root systemd** — run at end of go-live. Includes Aaron one-liner for the nine-site batch. |
| **[OPS-OWNER-DYNAMIC-GTM-GA4.md](OPS-OWNER-DYNAMIC-GTM-GA4.md)** | Dynamic GTM/GA4 via `/runtime-gtm.js` + `.env` → FLOW override. Do **not** paste static tags into pages/posts. |

Keep Caddy/root and GTM/GA4 ownership here — do not fold live `/etc/caddy` reloads into developer Phase 06.