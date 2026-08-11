# Astro-websites fleet docs

## Start here

| Priority | Doc | Use |
|----------|-----|-----|
| **1** | **[00-NEW-SITE-MASTER.md](00-NEW-SITE-MASTER.md)** | **Numbered lifecycle** + **[34-site work queue](00-NEW-SITE-MASTER.md#fleet-work-queue--34-sites)** (geo, nanoid, memory, peer-copy) |
| **Aaron rules** | **[AARON-RULES.md](AARON-RULES.md)** | Security + deploy + FQ-04 source-review four findings + canary — what we follow |
| **Claude** | **[CLAUDE-FLEET-QUEUE-PROMPT.md](CLAUDE-FLEET-QUEUE-PROMPT.md)** | **Paste-ready prompt** — FQ-00 script veto · FQ-01 nanoid · FQ-02 CF geo · FQ-04 source review · FQ-03 memory |
| **canary** | **[AARON-CANARY-RELEASE.md](AARON-CANARY-RELEASE.md)** | Private `:5999` test of a new release before `switch` |
| **ports** | **[FLEET-PORT-REGISTRY.md](FLEET-PORT-REGISTRY.md)** | **All 44 domains + ports + scaffolded vs placeholder** (share with developers) |
| **WEBSITE_ID** | **[WEBSITE-ID-REGISTRY.md](WEBSITE-ID-REGISTRY.md)** | FLOW website picker IDs for `.env` / `.env.prod` (`WEBSITE_ID=`) |
| **verify** | **[10-GO-LIVE-VERIFY-CHECKLIST.md](10-GO-LIVE-VERIFY-CHECKLIST.md)** | Trailing slash, canonical, GTM, forms, APIs, redirects, **404 brand**, content/media parity — before/after cutover |
| **security** | **[SECURITY-AUDIT-REMEDIATION-2026-08-06.md](SECURITY-AUDIT-REMEDIATION-2026-08-06.md)** | Audit P0–P2: auth, Node enhanced conversions, HTML sanitize, Caddy headers, CA history / ops |
| **Aaron full** | **[SECURITY-AARON-FULL-HANDOFF-2026-08-07.md](SECURITY-AARON-FULL-HANDOFF-2026-08-07.md)** | **One doc for Aaron:** done vs don’t (CSP enforce / prerender / SRI / mirror sanitize), ops steps, verify |
| **security ops** | **[SECURITY-OPS-AARON-HANDOFF.md](SECURITY-OPS-AARON-HANDOFF.md)** | Short copy-paste runbook (CA, firewall, Caddy reload, secrets) |
| **SEO / AI crawl** | **[SEO-AI-CRAWLER-AUDIT-REMEDIATION-2026-08-06.md](SEO-AI-CRAWLER-AUDIT-REMEDIATION-2026-08-06.md)** | **One SEO handoff:** PDF → 15 sites done (app) · Aaron CF leftover · gate for next 6 sites |
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
| **[SECURITY-AARON-FULL-HANDOFF-2026-08-07.md](SECURITY-AARON-FULL-HANDOFF-2026-08-07.md)** | Full Aug 2026 security handoff (done / don’t break Elementor / ops). |
| **[SECURITY-OPS-AARON-HANDOFF.md](SECURITY-OPS-AARON-HANDOFF.md)** | Short P0 ops checklist + copy-paste commands. |
| **[OPS-OWNER-DYNAMIC-GTM-GA4.md](OPS-OWNER-DYNAMIC-GTM-GA4.md)** | Dynamic GTM/GA4 via `/runtime-gtm.js` + `.env` → FLOW override. Do **not** paste static tags into pages/posts. |

Keep Caddy/root and GTM/GA4 ownership here — do not fold live `/etc/caddy` reloads into developer Phase 06.