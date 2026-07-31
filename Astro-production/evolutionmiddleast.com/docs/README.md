# Docs

| Doc | Purpose |
|-----|---------|
| [00-overview.md](00-overview.md) | Migration goal and Phase 1 status |
| [12-lead-ops-dashboard.md](12-lead-ops-dashboard.md) | Internal APIs for central CMS (bearer auth, leads/posts) |
| [13-wp-astro-mirror-playbook.md](13-wp-astro-mirror-playbook.md) | **Reusable task checklist** — enhancements/fixes from Connect + Evolution for upcoming mirrors |
| [14-multi-site-platform-review.md](14-multi-site-platform-review.md) | Fleet plan response: observability, Astro pin, harden gates, tokens, rollback, capacity |
| [15-platform-work-plan.md](15-platform-work-plan.md) | **Fleet execution runbook** (P0–P3 on the Astro host across all sites) |
| [16-server-side-work.md](16-server-side-work.md) | **Later on the server** — SSH checklist (units, Caddy, backups, pnpm, CMS package) |
| [CONNECT-ASTRO-FLEET-STANDARD.md](CONNECT-ASTRO-FLEET-STANDARD.md) | **Share with CBSS / SP Heavy / Iberia** — contract (pins, layout, APIs, gates) |

**How to use:** each site repo implements the [fleet standard](CONNECT-ASTRO-FLEET-STANDARD.md). Ops runs [15](15-platform-work-plan.md) on the shared host. This Evolution repo is the reference implementation; see `deploy/` for Tier 1 unit/Caddy templates.

Pipeline mirrors the Connect Group Astro project:

1. `npm run import:sitemap` — fetch live HTML from Rank Math sitemaps
2. `npm run prepare:page -- <slug>` — clean + rewrite URLs
3. `npm run assets:download-all` — localize `wp-content` / `wp-includes`
4. `npm run build` — static site + Rank Math–style sitemaps
5. Follow [13-wp-astro-mirror-playbook.md](13-wp-astro-mirror-playbook.md) for chrome, forms, blog, APIs, and known failure modes
6. Read [CONNECT-ASTRO-FLEET-STANDARD.md](CONNECT-ASTRO-FLEET-STANDARD.md) before freezing a factory template
7. Execute host-wide steps via [15-platform-work-plan.md](15-platform-work-plan.md) (not per-repo alone)