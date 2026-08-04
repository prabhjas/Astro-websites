# Documentation index

Migration planning for **Connect Group** (WordPress + Elementor → static Astro).

| Doc | Purpose |
|-----|---------|
| [00-overview.md](00-overview.md) | Goals, scope, high-level approach |
| [01-architecture-decision.md](01-architecture-decision.md) | Static vs headless — why we chose hybrid static |
| [02-migration-phases.md](02-migration-phases.md) | Phases 0–5 with exit criteria |
| [03-homepage-analysis.md](03-homepage-analysis.md) | Findings from the WP Rocket HTML dump |
| [04-phase1-static-mirror.md](04-phase1-static-mirror.md) | How to export, clean, and serve pages in Astro |
| [05-forms-and-dynamic.md](05-forms-and-dynamic.md) | CF7, Pipedrive, Instagram, ajax replacements |
| [06-risks-and-seo.md](06-risks-and-seo.md) | SEO, redirects, content freeze, risks |
| [07-first-sprint.md](07-first-sprint.md) | Concrete tasks for the first week |
| [08-seo-strategy.md](08-seo-strategy.md) | SEO today (mirror) + how SEO team works after cutover |
| [09-pagespeed-core-web-vitals.md](09-pagespeed-core-web-vitals.md) | PageSpeed / LCP / INP / CLS plan |
| [10-redirects.md](10-redirects.md) | 301 redirects (YAML → host + Astro) |
| [11-lead-ops-file-store.md](11-lead-ops-file-store.md) | File-backed lead store |
| [12-lead-ops-dashboard.md](12-lead-ops-dashboard.md) | Internal operations dashboard |
| [13-go-live-server-handoff.md](13-go-live-server-handoff.md) | **Go-live handoff for server/Cloudflare** (permissions, SEO allowlist, smoke tests) |
| [14-multi-site-astro-platform.md](14-multi-site-astro-platform.md) | **Multi-site plan (~30 webs):** admin → modifications → approvals → Astro server → Web N |
| [inventory/urls.md](inventory/urls.md) | Phase 0 URL / form inventory sheet |

## Source materials

| Path | Description |
|------|-------------|
| [`../source/wordpress-exports/homepage/index-https.html`](../source/wordpress-exports/homepage/index-https.html) | WP Rocket cached homepage HTML |
| [`../source/wordpress-exports/README.md`](../source/wordpress-exports/README.md) | How to add more page exports |

## Suggested reading order

1. Overview → Architecture → Phases  
2. Homepage analysis (understand what you have)  
3. Phase 1 runbook → Forms → Risks  
4. First sprint (start work)
