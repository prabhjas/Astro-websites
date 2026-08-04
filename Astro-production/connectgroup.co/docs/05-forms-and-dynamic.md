# 05 — Forms and dynamic features

WordPress plugins that **cannot** ship as pure static HTML without replacement.

---

## Contact Form 7 (critical)

### Current state (from homepage dump)

- Contact Form 7 JS/CSS loaded
- Pipedrive integration script
- Drag-and-drop file upload plugin
- Country / phone field plugin
- Honeypot plugin

CF7 posts to WordPress. On a static host this **fails**.

### Replacement options

| Option | Fit | Notes |
|--------|-----|-------|
| Astro Actions / API route + Pipedrive API | Best if hosting supports functions | Needs SSR/adapter or separate worker |
| Formspree / Basin / Getform | Fast | May need Pipedrive Zapier |
| Static form → Pipedream / Make → Pipedrive | Fast | Good interim |
| Keep a tiny WP subdomain only for forms | Temporary | Avoid if goal is full exit |

### Requirements to recreate

Capture from live CF7:

- [ ] Field list (name, email, phone, company, message, file, checkboxes)
- [ ] Validation rules
- [ ] Pipedrive pipeline / stage / field mapping
- [ ] Success / error UX copy
- [ ] Spam strategy (honeypot, Turnstile/hCaptcha)

### Cutover rule

**Do not switch DNS until at least one primary lead form works end-to-end in staging.**

---

## Instagram Feed

Plugin: Instagram Feed Pro (+ Elementor bridge CSS).

### Replacement options

- Official Instagram embed
- Static screenshot / curated images in Astro
- Third-party embed (Behold, etc.)
- Remove section if low value

---

## Elementor interactive widgets

These can often keep working **if** Elementor frontend JS + markup stay in Phase 1:

- Tabs / nested tabs
- Testimonial carousel (Swiper)
- Counters
- Lottie

If JS is stripped too aggressively, re-test each widget.

Prefer rebuilding in Phase 4 with lighter Astro islands (e.g. small client script) instead of full Elementor JS forever.

---

## Max Mega Menu

PHP-driven menu HTML is already in the dump. Behavior depends on Mega Menu CSS/JS.

### Phase 1

Keep mega menu markup + CSS/JS from export.

### Phase 3

Rebuild as accessible `<nav>` in Astro with data from a JSON/YAML menu file:

```text
src/data/menu.json
src/components/Header.astro
src/components/MegaMenu.astro
```

---

## Analytics & marketing tags

Preserve carefully:

| Tag | Action |
|-----|--------|
| Google / GTM (`G-9EPNW3RGQH`) | Re-add in `BaseLayout` |
| Leadfeeder | Confirm still needed; add if yes |
| ZoomInfo | Confirm privacy/compliance; add if yes |

Do **not** rely on WP plugins to inject tags after cutover.

---

## WordPress REST / ajax

Homepage dump references `wp-json` and `admin-ajax`. After static cutover:

- Remove or stub any client calls that 404
- Do not leave silent lead-loss bugs (forms)

---

## Next document

→ [06-risks-and-seo.md](06-risks-and-seo.md)
