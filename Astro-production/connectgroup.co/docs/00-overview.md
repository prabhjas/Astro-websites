# 00 — Overview

## Goal

Move **connectgroup.co** from WordPress (Elementor, Max Mega Menu, Contact Form 7, Rank Math, WP Rocket) to a **static Astro** site that:

- Matches current design and URLs (SEO parity)
- Does **not** depend on PHP / WordPress at runtime
- Is maintainable going forward (shared layout, clean components)

## Why this project exists

WordPress + Elementor works for editing, but:

- Performance and hosting cost are driven by a full WP stack
- The team wants static HTML delivery via Astro
- Headless WP does **not** preserve Elementor layouts (see [01-architecture-decision.md](01-architecture-decision.md))

## In scope

- Marketing / service landing pages built in Elementor
- Global header, mega menu, footer
- Lead capture forms (today: CF7 → Pipedrive)
- SEO metadata (Rank Math equivalents in Astro)
- Media assets currently under `/wp-content/uploads/`

## Out of scope (for now)

- Rebuilding every page as bespoke Astro components on day one
- Keeping Elementor as the long-term editor after cutover
- WooCommerce / logged-in WP features (not present as core need on the homepage dump)

## Strategy in one sentence

**Ship a cleaned static HTML mirror in Astro first, then progressively rebuild shared chrome and high-traffic pages into real Astro components.**

## Current artifacts

| Artifact | Location |
|----------|----------|
| Homepage WP Rocket dump | `source/wordpress-exports/homepage/index-https.html` |
| This plan | `docs/` |
| Astro app | `src/`, `astro.config.mjs`, `package.json` |
| Prepare pipeline | `scripts/prepare-homepage.mjs` |
| Cleaned homepage | `src/legacy/homepage.cleaned.html` (generated) |
| Localized assets | `public/wp-content/`, `public/wp-includes/` (generated) |

## Status

| Item | Status |
|------|--------|
| Planning docs | Done |
| Astro scaffold + homepage mirror | Done — run `npm run dev` |
| CF7 / Pipedrive replacement | Stub only (`ContactForm.astro`) |
| DNS / production cutover | Not started |

## Next document

→ [01-architecture-decision.md](01-architecture-decision.md)
