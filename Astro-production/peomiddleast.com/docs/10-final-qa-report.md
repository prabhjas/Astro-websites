# PEO Middle East — Phase 1 mirror QA (2026-08-05)

**Local:** http://127.0.0.1:5118/ (trailing slashes on paths, e.g. `/contact/`)

**Live reference:** https://peomiddleast.com/

## Conversion

| Step | Result |
|------|--------|
| Scaffold (peer: kpmpro.ae → Impreza/Elementor mirror stack) | Done |
| Sitemap import | 286 URLs (138 pages + 148 posts) |
| Legacy mirrors | 276+ `src/legacy/*.cleaned.html` (+ `country/*`) |
| Assets | ~4.5k URLs localized under `public/wp-content/` |
| Posts JSON | 148 under `src/content/blog/` |
| Fleet port | **5118** · `node scripts/fleet-local.mjs up peomiddleeast` |

## Automated HTTP QA (`pnpm run qa:final`)

| Check | Result |
|-------|--------|
| Pages (inventory) | **138 / 138** HTTP 200 |
| Posts (inventory) | **148 / 148** HTTP 200 |
| Homepage smoke | PASS |
| Health `/api/health` | PASS |
| Canonical redirects (`redirects.yml`) | PASS after middleware fix |
| Hard-coded GTM in HTML | Stripped; runtime loader injected |
| `astro-mirror-fixes.js` on pages | Present |

## Remaining (local / parity)

1. **Forms** — `POST /api/contact` needs `PIPEDRIVE_*` (and related) in `.env` for successful submit; file lead store works once env validates.
2. **Internal API smoke** — set `INTERNAL_JOB_SECRET` in `.env` for bearer auth checks.
3. **Blog shell** — Impreza blog uses different markers than KPM Pro; listing uses legacy mirrors + `peomiddleast-blog-listing.js` (verify `/insights/` vs `/blog/`).
4. **Visual parity** — run `pnpm run qa:final:ui` (Playwright) when deps installed; manual section-by-section vs live still recommended for Impreza header/mega-menu/mobile.
5. **Redirects** — only 5 live-probed rules in `src/data/redirects.yml`; import Rank Math log when available.

## Commands

```bash
export PATH="$REPO/.local/node-v22/bin:$PATH"  # portable Node used for this conversion
cd Astro-production/peomiddleast.com
pnpm run qa:final          # QA_BASE=http://127.0.0.1:5118
node ../../scripts/fleet-local.mjs smoke peomiddleeast
```

Full machine-readable report: `docs/10-final-qa-report.json` (regenerate with `pnpm run qa:final`).
