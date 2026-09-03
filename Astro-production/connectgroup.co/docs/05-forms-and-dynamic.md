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

## Lead delivery destinations

Enquiries from this site are delivered to **two independent destinations**:

| Destination | Notes |
|---|---|
| Pipedrive | As before. Has **no idempotency key** — every call creates a new person and lead, so a delivery is never re-sent once it has succeeded. |
| Flow | System of record. Signed requests, upserted on `(site_id, idempotency_key)`, so retries and backfills cannot duplicate. |

They succeed, fail and retry **independently**, and are dispatched in parallel so
neither adds latency to the visitor's page response. A failure at one does not
hold up or duplicate the other.

Configuration is per site, in `/etc/astro-fleet/backend-env/connectgroup.env`,
and is read by the **backend** at start-up:

```
FLOW_ENABLED=true
FLOW_INGEST_URL=https://flow.connectgroup.co   # base only; the adapter appends the paths
FLOW_SITE_ID=connectgroup
FLOW_SITE_DOMAIN=connectgroup.co
FLOW_TOKEN=…                                   # issued by Flow, shown once
FLOW_SIGNING_SECRET=…                          # issued by Flow, never transmitted
```

There is **no site-level code** for this — the adapter lives in
`@connect/site-cms`. Enabling a site is a config change plus a backend restart.

### Verifying a deployment

`GET /api/internal/run-retries?selftest=flow` with the site's
`INTERNAL_JOB_SECRET`. A `200` proves the running backend is on the release
carrying the adapter, holds working credentials, has a clock inside the signature
window, is posting from an allow-listed address, and can reach Flow.

This matters because **publish switches the front, not the backend**. A release
can report success while the backend still runs the previous code — in which case
this endpoint answers `404` rather than `200`, because the route would not exist.
Confirm at the destination, not at the release output.

Pipedrive stops accepting leads on **24 September 2026**. Retiring it is
`PIPEDRIVE_ENABLED=false` in the same env file — a config change, not a release.

---

## Next document

→ [06-risks-and-seo.md](06-risks-and-seo.md)
