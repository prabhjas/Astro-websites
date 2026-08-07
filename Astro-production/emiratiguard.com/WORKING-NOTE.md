# emiratiguard.com — working note (2026-08-06)

| Field | Value |
|-------|--------|
| Domain | emiratiguard.com |
| Fleet id / unit | `emiratiguard` |
| Port | **5103** |
| Peer (structure) | c-uae.com |
| Live content | https://emiratiguard.com (WP REST + crawl) |
| Stack on live | Twenty Twenty + Visual Composer (+ CF7), not Hello Elementor |
| CMS mode | full (`FEATURES_FULL_CMS`) |
| Branch | mushtaq-branch |

## Phases

| Phase | Status |
|-------|--------|
| 01 Security scan | PASS — 0 PHP under `public/`; no `.htaccess` |
| 02 Convert / place | PASS — `Astro-production/emiratiguard.com/` |
| 03 Fleet + CMS + FLOW | PASS — fleet `scaffolded`, thin mounts, `siteId: emiratiguard` |
| 04 Forms / attribution | PASS — `POST /api/contact` + attribution; smoke contact OK |
| 05 Redirects / SEO / slash | PASS — `trailingSlash: always`, robots/sitemap/llms, absolute canonical |
| 06 Local run | PASS — `fleet-local` up + smoke all green |
| 07 Harden | PASS — no SMTP env; blank DET; unique local `INTERNAL_JOB_SECRET` |
| 08 Deploy templates (git) | PASS — `deploy/*` + `caddy/Caddyfile.production` :5103 (git only) |
| 09 App sync | Pending owner/webdev — see `deploy/ROOT_SETUP.md` |
| 10 Go-live verify | **PASS** (loopback) — see below |

## Local

```bash
pnpm install
node scripts/fleet-local.mjs up emiratiguard
node scripts/fleet-local.mjs smoke emiratiguard
node Astro-production/emiratiguard.com/scripts/_phase10-verify.mjs
```

Loopback: http://127.0.0.1:5103/

## Content extract notes

- **Full HTML mirrors** (preferred): `pnpm --filter emiratiguard-astro mirror:full` → `src/legacy/*.cleaned.html` (74 sitemap URLs)
- Routes serve mirrors via `serveLegacyPage()` (home, `[...slug]`, `/blog/`)
- **Blog grid:** Advanced Post Block uses `wp.ajax` → `POST /wp-admin/admin-ajax.php` `action=apbPosts` (not REST). Shim: `src/lib/wp-admin/admin-ajax.ts` via middleware (avoids Astro CSRF 403). Returns `{ success, data: { posts, totalPosts } }` from `posts.json`.
- Robots meta kept exactly from live HTML; GTM swapped to `/runtime-gtm.js`
- Forms: `/scripts/cf7-bridge.js` → `POST /api/contact`
- REST extract (`extract-wp.mjs`) still used for CMS/FLOW JSON inventory

## Secrets (do not commit)

- `.env` / `.env.prod` gitignored
- Set real Pipedrive + unique `INTERNAL_JOB_SECRET` before prod
- No `SMTP_*` / `FORM_NOTIFICATION_EMAILS` / `FORM_FROM_*`

## Owner next

- **Do not** reload live Caddy — follow [OPS-OWNER-CADDY-CUTOVER.md](../../docs/OPS-OWNER-CADDY-CUTOVER.md)
- App sync → `.env.prod` on host → loopback health → owner Caddy cutover → public smoke
