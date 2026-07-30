# 00 — Overview

## Goal

Migrate **CBSS** from a static HTML + PHP landing page to **Astro** while preserving design, forms, and Pipedrive lead capture.

## Architecture

Hybrid static Astro (same pattern as Connect Group Astro):

1. Marketing homepage rebuilt as Astro section components
2. `POST /api/contact` → file lead store → Pipedrive + optional SMTP
3. Lead ops dashboard at `/internal/operations`

## Source

| Artifact | Location |
|----------|----------|
| Original HTML/PHP | CBSS reference folder (`index.html`, `submit-form.php`) |
| Astro app | `src/`, `astro.config.mjs`, `package.json` |
| Assets | `public/assets/` |
| Lead store | `.data/leads/` (gitignored) |

## Status

| Module | Status |
|--------|--------|
| Scaffold + Node adapter | Done |
| Homepage sections | Done |
| Forms → `/api/contact` | Done |
| Pipedrive + email | Done (configure `.env`) |
| Lead ops dashboard | Done (leads / failures) |

## Next

1. Copy `.env.example` → `.env` and set `PIPEDRIVE_API_TOKEN`, dashboard secrets, SMTP
2. `npm run dev` and verify forms + dashboard
3. Set `PUBLIC_SITE_URL` to the production domain when known
4. For production cutover, follow [13-go-live-server-handoff.md](./13-go-live-server-handoff.md)
