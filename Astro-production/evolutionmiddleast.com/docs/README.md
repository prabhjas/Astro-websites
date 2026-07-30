# Docs

| Doc | Purpose |
|-----|---------|
| [00-overview.md](00-overview.md) | Migration goal and Phase 1 status |
| [12-lead-ops-dashboard.md](12-lead-ops-dashboard.md) | Internal operations dashboard (env, roles, GTM, redirects) |
| [13-wp-astro-mirror-playbook.md](13-wp-astro-mirror-playbook.md) | **Reusable task checklist** — enhancements/fixes from Connect + Evolution for upcoming mirrors |

Pipeline mirrors the Connect Group Astro project:

1. `npm run import:sitemap` — fetch live HTML from Rank Math sitemaps
2. `npm run prepare:page -- <slug>` — clean + rewrite URLs
3. `npm run assets:download-all` — localize `wp-content` / `wp-includes`
4. `npm run build` — static site + Rank Math–style sitemaps
5. Follow [13-wp-astro-mirror-playbook.md](13-wp-astro-mirror-playbook.md) for chrome, forms, blog, dashboard, and known failure modes
