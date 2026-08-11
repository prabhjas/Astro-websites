# Overview — alburaq.ae Astro fleet site

WordPress/Elementor → Astro SSR HTML mirror of **https://alburaq.ae/**

| | |
|--|--|
| Fleet id | `alburaq` |
| Port | **5120** |
| Peer | `pittant.com` (`FEATURES_FULL_CMS`) |
| Package | `alburaq-astro` |
| Local | `http://127.0.0.1:5120/` |

## Lifecycle status (2026-08-07)

Phases **01–08** and **10** complete on loopback. Phase **09** handoff docs ready for host sync. **Owner** Caddy cutover not started.

See `docs/10-phase-signoff.md` and `docs/10-go-live-verify-report.json`.

## Commands

```bash
# monorepo root
pnpm install
pnpm --filter alburaq-astro run import:sitemap:download
pnpm --filter alburaq-astro run migrate:posts
pnpm --filter alburaq-astro run build
node scripts/fleet-local.mjs up alburaq
node scripts/fleet-local.mjs smoke alburaq
pnpm --filter alburaq-astro run verify:phase10
```
