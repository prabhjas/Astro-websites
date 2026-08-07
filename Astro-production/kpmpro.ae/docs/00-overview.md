# KPM Pro (kpmpro.ae) — Astro fleet

| | |
|--|--|
| **Port** | **5124** |
| **Unit** | `kpmpro` |
| **Peer** | Full CMS — `royalvisa.ae` / `kinzahr.com` |
| **Features** | `FEATURES_FULL_CMS` |
| **Live** | https://kpmpro.ae/ |
| **Local** | http://127.0.0.1:5124/ |

## Inventory (mirrored 2026-08-04+)

| Kind | Count |
|------|------:|
| Pages | Rank Math page-sitemap |
| Posts | 57+ (FLOW blog JSON) |
| CMS | `@connect/site-cms` `FEATURES_FULL_CMS` |

## Status

| Phase | Status |
|-------|--------|
| 01 Malware scan | Done — SAFE (`docs/01-malware-scan-report.md`) |
| 02 Convert / scaffold | Done |
| 03 Fleet + CMS + FLOW | Done — port **5124**, thin `/api/internal/*` |
| 04 Forms / attribution | Done — CF7 → `/api/contact`; Pipedrive website **862** |
| 05 Redirects / SEO | Done — imports + robots/sitemaps/llms; trailing slash always |
| 06 Local smoke | `fleet-local smoke kpmpro` |
| 07 Harden | Bearer deny/auth; unique `INTERNAL_JOB_SECRET` |
| 08 Deploy templates | `deploy/kpmpro.service` + `kpmpro.ae.caddy` + Caddyfile.production block |
| 09 Server cutover | **Ops** — see `docs/13-go-live-server-handoff.md` |
| 10 Final checks | Loopback verify — `docs/10-phase-signoff.md` |

## Local commands

```bash
# monorepo root
pnpm install
node scripts/fleet-local.mjs up kpmpro
node scripts/fleet-local.mjs smoke kpmpro
# → http://127.0.0.1:5124/
```
