# Phase 10 — Go-live verify (local) — emiratisationgate.org

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Port | **5105** |
| Canonical | `https://emiratisationgate.org` |
| Peer | `pittant.com` (FEATURES_FULL_CMS) |
| Branch | `tabish-branch` |
| Mode | Full CMS WP/Elementor HTML mirror |
| Verdict | **PASS (local)** — ready for owner Caddy cutover |

## Inventory

| Item | Count |
|------|-------|
| Pages (sitemap) | 8 |
| Posts (sitemap) | 77 |
| Legacy cleaned HTML | 85 |
| `public/wp-content` files | 684 |
| Missing assets after audit | **0** |

## Checklist results

### 1. Trailing slash — PASS

| Check | Result |
|-------|--------|
| `GET /about-us` | **301** → `/about-us/` |
| `GET /about-us/` | **200** |
| Assets (`.js`/`.css`/images) | **200**, no slash redirect |
| Config | `trailingSlash: "always"` in `astro.config.mjs` |

### 2. Canonical / SEO — PASS

| Check | Result |
|-------|--------|
| Homepage canonical | `https://emiratisationgate.org/` |
| `/robots.txt` | 200 |
| `/sitemap_index.xml` | 200 |
| `/page-sitemap.xml` | 200 |
| `/post-sitemap.xml` | 200 |
| `/llms.txt` | 200 |
| `PUBLIC_SITE_URL` | `https://emiratisationgate.org` (not localhost) |

### 3. GTM / GA4 — PASS (interim)

| Check | Result |
|-------|--------|
| Hardcoded GTM stripped from mirrors | yes |
| `/runtime-gtm.js` present | yes |
| `PUBLIC_GTM_ID` | empty until owner sets live container |

### 4. Forms / attribution — PASS

| Check | Result |
|-------|--------|
| CF7 fields match live (home + contact) | identical field names |
| `astro-mirror-fixes.js` injected | yes |
| `POST /api/contact/` | 200, lead stored under `.data/leads/` |
| Attribution (`gclid`, `campaignid`, `device`) | present on lead JSON |
| SMTP / `FORM_NOTIFICATION_EMAILS` | not used (skipped) |
| Pipedrive | attempted; local smoke token → 401 expected |

### 5. APIs / harden — PASS

| Check | Result |
|-------|--------|
| `GET /api/health/` | 200 |
| Unknown URL | **HTTP 404** (brand logo) |
| Internal deny (no auth) | 403 |
| Internal auth (bearer) | 200 |
| Fleet smoke | **All checks passed** |

### 6. Content / parity — PASS (structural)

| Check | Result |
|-------|--------|
| All 85 inventory URLs | **200** |
| Homepage stylesheets live vs local | **44 / 44** |
| Homepage style tags | **8 / 8** |
| Scripts | live 29 / local 31 (+mirror-fixes + runtime-gtm) |
| Nav menu-item count | **54 / 54** |
| Title match (home) | exact |
| Image counts (sampled pages) | match |
| 404 brand | Emiratisation Gate logo only (no peer brand) |

### 7. Deploy templates (git only) — PASS

| Artifact | Path |
|----------|------|
| systemd | `deploy/emiratisationgate.service` |
| Caddy snippet | `deploy/emiratisationgate.org.caddy` |
| Fleet Caddy block | `caddy/Caddyfile.production` (port 5105) |
| Live Caddy reload | **NOT done** (owner: `docs/OPS-OWNER-CADDY-CUTOVER.md`) |

### 8. Security Phase 01 — PASS

See `docs/01-malware-scan-report.md` — **CLEAN** (no PHP under public/, no webshells).

## Fleet

```json
{ "id": "emiratisationgate", "domain": "emiratisationgate.org", "port": 5105, "status": "scaffolded" }
```

## Owner next steps (not developer)

1. Set real `PIPEDRIVE_*` + `INTERNAL_JOB_SECRET` in host `.env.prod` (LF only).
2. Set `PUBLIC_GTM_ID` / GA4 if required.
3. Follow **[OPS-OWNER-CADDY-CUTOVER.md](../../../docs/OPS-OWNER-CADDY-CUTOVER.md)** — do not reload live Caddy from this branch alone.
4. Re-run this checklist on public HTTPS after cutover.

## Local commands

```bash
pnpm install
node scripts/fleet-local.mjs up emiratisationgate
node scripts/fleet-local.mjs smoke emiratisationgate
# http://127.0.0.1:5105/
```
