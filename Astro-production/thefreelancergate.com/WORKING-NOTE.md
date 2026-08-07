# thefreelancergate.com — working note

| Field | Value |
|-------|--------|
| Domain | thefreelancergate.com |
| Peer | emiratiguard.com (full CMS) |
| Mode | `FEATURES_FULL_CMS` |
| Port | **5100** (reserved; not 5124) |
| Content | Hybrid: page-sitemap + `/blog/` HTML mirrors; 98 posts from WP REST JSON |
| Live stack | Impreza + WPBakery + CF7 + Rank Math |
| GTM (interim) | GTM-NV2FQD8 · GA4 G-CJLGN69JBJ |
| Local | http://127.0.0.1:5100/ |

## Phase checklist

| Phase | Status |
|-------|--------|
| 01 Scan | PASS — 0 PHP / shells / .htaccess (`_crawl/malware-scan-phase01.md`) |
| 02 Convert | PASS — under `Astro-production/thefreelancergate.com/` |
| 03 Fleet+CMS | PASS — `fleet-sites.json` status scaffolded; full CMS mounts |
| 04 Forms | PASS — `/api/contact` + attribution; Pipedrive via env; no SMTP |
| 05 Redirects/SEO/slash | PASS — `trailingSlash: always`; Rank Math robots/sitemaps; dynamic GTM |
| 06 Local smoke | PASS — `node scripts/fleet-local.mjs smoke thefreelancergate` |
| 07 Harden | PASS — unique `INTERNAL_JOB_SECRET`; blank DET; no SMTP/`FORM_NOTIFICATION_*` |
| 08 Deploy templates | PASS — `deploy/*` + `caddy/Caddyfile.production` git only |
| 09 App sync | Handoff — owner/webdev syncs code + `.env.prod`; **no live Caddy reload** |
| 10 Go-live verify | PASS — see `_crawl/phase10-report.json` |

## Owner next

Follow [OPS-OWNER-CADDY-CUTOVER.md](../../docs/OPS-OWNER-CADDY-CUTOVER.md) after app sync + loopback health on host.
Do **not** reload live Caddy from this laptop.

## Rules

- No `SMTP_*` / `FORM_NOTIFICATION_EMAILS` / `FORM_FROM_*` committed
- Do not commit `.env` / `.env.prod` / `.data`
- Deleted peer junk: `public/runtime-gtm.js` HTML dump (shadowed SSR loader)
