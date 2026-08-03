# 03 — Homepage analysis

Source file: [`source/wordpress-exports/homepage/index-https.html`](../source/wordpress-exports/homepage/index-https.html)

Site: **https://connectgroup.co/**  
Export type: WP Rocket–style cached HTML  
Approx size: **~612 KB** / **~4,474 lines**

---

## Stack detected

| Layer | Technology |
|-------|------------|
| CMS | WordPress 7.x (from asset versions) |
| Page builder | Elementor 4.1.4 |
| Theme | Essentials (`pixfort`) |
| Navigation | Max Mega Menu |
| SEO | Rank Math PRO |
| Forms | Contact Form 7 + Pipedrive integration + DnD file upload + country phone |
| Cache | WP Rocket markers (`data-rocket-*`) |
| Other | Instagram Feed Pro, honeypot, accordion plugins, GTM/GA |

---

## Elementor structure (homepage)

| Metric | Count (approx) |
|--------|----------------|
| Widgets | 131 |
| Sections | 34 |
| Containers | 31 |

### Top widget types

| Widget | Count |
|--------|------:|
| `image-box.default` | 93 |
| `heading.default` | 15 |
| `image.default` | 4 |
| `button.default` | 4 |
| `lottie.default` | 3 |
| `counter.default` | 3 |
| `shortcode.default` | 2 |
| `nested-tabs` / `tabs` / `testimonial-carousel` | present |

### Elementor IDs observed

| Role | `data-elementor-id` |
|------|---------------------|
| Page content | `26466` |
| Header template | `27554` |

CSS is heavily scoped as `.elementor-26466 …` and `.elementor-27554 …`. **Do not change Elementor HTML structure** until Phase 4 rebuild, or styles will break.

---

## Assets & dependencies

| Type | Approx count |
|------|-------------:|
| Stylesheet links | 42 |
| Script tags with `src` | 35 |
| Host mentions `connectgroup.co` | 500+ |

Almost all assets are absolute URLs to:

```text
https://connectgroup.co/wp-content/...
https://connectgroup.co/wp-includes/...
```

Phase 1 **must** download and rewrite these, or the “static” site still depends on live WordPress.

### Notable third parties

- Google Tag Manager / gtag (`G-9EPNW3RGQH`)
- Leadfeeder (`sc.lfeeder.com`)
- ZoomInfo (`js.zi-scripts.com`)
- YouTube embed reference
- Google Fonts (also self-hosted Elementor font files)

---

## What works as static HTML

- Hero and marketing sections (with Elementor CSS/JS kept)
- Rank Math `<title>`, meta description, Open Graph, JSON-LD
- Image boxes, headings, spacers
- Most layout if Elementor frontend JS remains

---

## What breaks without WordPress

| Feature | Why it breaks | Phase |
|---------|---------------|-------|
| Contact Form 7 | Posts to WP; Pipedrive plugin is WP-side | Phase 2 |
| File upload (CF7 DnD) | Plugin JS + WP endpoints | Phase 2 |
| Instagram Feed | Plugin API | Phase 2 |
| `admin-ajax.php` / `wp-json` | No PHP backend | Phase 2 |
| Absolute `/wp-content` URLs | Points at production WP | Phase 1 |
| WP admin-bar CSS | Leaked into dump | Phase 1 cleanup |

---

## Navigation surface (sample)

Mega menu includes many service URLs, for example:

- `/dubai-free-zone`, `/ajman-free-zone`, `/sharjah-freezone`, `/abu-dhabi-free-zone`
- `/dubai-mainland`, `/abu-dhabi-mainland`, …
- `/pro-services/`, `/hr-services`, `/employer-of-record`, …
- `/cybersecurity-solutions`, `/web-development`, …

Treat these as **Phase 0 inventory** — each likely needs its own export or rebuild.

---

## Cleanup checklist for this file

Before using as an Astro page:

1. [ ] Remove `#wpadminbar` / admin-bar CSS and markup
2. [ ] Remove logged-in-only or bot-protection noise if not needed
3. [ ] Rewrite `https://connectgroup.co/wp-content` → `/assets/...`
4. [ ] Rewrite `https://connectgroup.co/wp-includes` → `/assets/wp-includes/...` (or drop unused)
5. [ ] Download all referenced CSS, JS, fonts, images
6. [ ] Keep Rank Math head tags (or port into Astro `<head>`)
7. [ ] Replace CF7 block with placeholder until Phase 2 form is ready
8. [ ] Smoke-test: tabs, carousel, counters, mobile menu, Lottie

---

## Next document

→ [04-phase1-static-mirror.md](04-phase1-static-mirror.md)
