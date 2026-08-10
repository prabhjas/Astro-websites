# Phase 10 — Go-live verify (local) — emiratisationgateway.com

| Field | Value |
|-------|-------|
| Date | 2026-08-06 (Step 2 deep QA) |
| Port | **5106** |
| Canonical | `https://emiratisationgateway.com` |
| Branch | `tabish-branch` |
| Mode | Full CMS WP/Elementor HTML mirror |
| Verdict | **PASS (local)** — ready for owner Caddy cutover |

## Inventory

| Item | Count |
|------|-------|
| Pages (sitemap) | **11** |
| Posts (sitemap) | **75** |
| Legacy cleaned HTML | **86** |
| `public/wp-content` files | **828** |
| Missing assets after audit | **0** |

## Checklist results

### 1. Trailing slash — PASS

| Check | Result |
|-------|--------|
| `GET /about-us` | **301** → `/about-us/` |
| `GET /about-us/` | **200** |
| `GET /blog` | **301** → `/blog/` |
| All 10 bare paths tested | **301** → trailing slash |
| Assets (`.js`/`.css`/images) | **200**, no slash redirect |
| Config | `trailingSlash: "always"` in `astro.config.mjs` |

### 2. Canonical / SEO — PASS

| Check | Result |
|-------|--------|
| Homepage canonical | `https://emiratisationgateway.com/` |
| All 11 page canonicals | ✅ absolute `https://emiratisationgateway.com/...` |
| OG:URL tags | ✅ absolute URLs |
| OG:image tags | ✅ absolute URLs |
| `/robots.txt` | ✅ 200, Sitemap directive correct |
| `/sitemap_index.xml` | ✅ 200, references page + post sitemaps |
| `/page-sitemap.xml` | ✅ 200, 11 pages |
| `/post-sitemap.xml` | ✅ 200, 75 posts |
| `/llms.txt` | ✅ 200 |
| `PUBLIC_SITE_URL` | `https://emiratisationgateway.com` (not localhost) |

### 3. GTM / GA4 — PASS (interim)

| Check | Result |
|-------|--------|
| Hardcoded GTM stripped from mirrors | ✅ yes |
| `/runtime-gtm.js` present | ✅ yes |
| `<script src="/runtime-gtm.js">` in HTML | ✅ injected |
| `PUBLIC_GTM_ID` | empty until owner sets live container |
| `window.dataLayer` initialized | ✅ yes (by runtime-gtm.js) |

### 4. Forms / attribution — PASS

| Check | Result |
|-------|--------|
| Homepage form fields | ✅ name, email, phone (intl-tel-input), country, message |
| Contact-us form fields | ✅ identical structure, 2 forms on page |
| `astro-mirror-fixes.js` injected | ✅ yes (all pages) |
| CF7 → `/api/contact/` redirect | ✅ intercepts all `wpcf7` forms |
| `POST /api/contact/` | ✅ 200, lead stored under `.data/leads/` |
| Attribution fields (gclid, utm_*, campaign) | ✅ present on lead JSON |
| Phone intl-tel-input flags | ✅ flag sprites loaded via astro-mirror-fixes.js |
| CF email decode | ✅ `cf-email-decode.js` decodes `__cf_email__` spans |
| SMTP / `FORM_NOTIFICATION_EMAILS` | not used (skipped) |
| Pipedrive | attempted; local smoke token → 401 expected |

### 5. APIs / harden — PASS

| Check | Result |
|-------|--------|
| `GET /api/health/` | ✅ 200 |
| `GET /api/health` (no slash) | 301 → `/api/health/` |
| `POST /api/contact/` | ✅ 200 |
| `GET /api/blog/listing/?page=2` | ✅ 200 (returns posts) |
| Unknown URL | **HTTP 404** (brand logo) |
| Internal deny (no auth) | ✅ 403 |
| Internal auth (bearer) | ✅ 200 |
| Fleet smoke | ✅ **All checks passed** |

### 6. Content / parity — PASS

| Check | Result |
|-------|--------|
| All 86 inventory URLs (11 pages + 75 posts) | **200** |
| Blog pagination (/blog/page/2/ through /8/) | **200** |
| Homepage CSS links | **36 files, 0 missing** |
| Homepage JS scripts | **21 local + 2 mirror (astro-mirror-fixes + runtime-gtm)** |
| Homepage images (wp-content/uploads) | **all present** |
| Background images (inline CSS) | **all present** |
| Partner logos (9) | ✅ all present |
| Nav menu structure | ✅ 7 top-level + 6 sub-menu items × 2 (desktop + mobile) |
| Title match (all pages) | ✅ exact match with live |
| H1 match (all pages) | ✅ exact match with live |
| FAQ accordions (home, services, recruitment, outsourcing) | ✅ present |
| Google Fonts (Source Sans Pro, Montserrat) | ✅ loading |
| Font Awesome (CDN) | ✅ loading |
| 404 brand | ✅ Emiratisation Gateway logo, branded page |
| Mobile menu trigger | ✅ `ast-mobile-menu-trigger` present |
| Social links (footer) | ✅ Facebook + LinkedIn |
| WhatsApp button | ✅ image present |
| Scroll-to-top | ✅ present |
| Skip-to-content | ✅ present |

### 7. Deploy templates (git only) — PASS

| Artifact | Path |
|----------|------|
| systemd | `deploy/emiratisationgateway.service` |
| Caddy snippet | `deploy/emiratisationgateway.com.caddy` |
| Fleet Caddy block | `caddy/Caddyfile.production` (port 5106) |
| Live Caddy reload | **NOT done** (owner: `docs/OPS-OWNER-CADDY-CUTOVER.md`) |

### 8. Security Phase 01 — PASS

See `docs/01-malware-scan-report.md` — **CLEAN** (no PHP under public/, no webshells).

## Fleet

```json
{ "id": "emiratisationgateway", "domain": "emiratisationgateway.com", "port": 5106, "status": "scaffolded" }
```

## Owner next steps (not developer)

1. Set real `PIPEDRIVE_*` + `INTERNAL_JOB_SECRET` in host `.env.prod` (LF only).
2. Set `PUBLIC_GTM_ID` / GA4 if required.
3. Follow **[OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md)** — do not reload live Caddy from this branch alone.
4. Re-run this checklist on public HTTPS after cutover.

## Local commands

```bash
pnpm install
node scripts/fleet-local.mjs up emiratisationgateway
node scripts/fleet-local.mjs smoke emiratisationgateway
# http://127.0.0.1:5106/
```
