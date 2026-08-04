# 01 — Architecture decision

## Decision

**Adopt hybrid static Astro (Option D):**

1. **Phase 1:** Serve cleaned WordPress HTML exports as a static site via Astro.
2. **Phases 3–4:** Extract layout and rebuild important pages as Astro components.
3. **Do not** use headless WordPress for Elementor marketing pages.

WordPress may remain temporarily as a **media/content source** during migration, then be frozen or decommissioned after cutover.

---

## Options compared

| Option | Preserves Elementor look? | Editable later? | Verdict |
|--------|---------------------------|-----------------|---------|
| **A. Headless WP** (REST / GraphQL) | No — API returns content, not Elementor layout/CSS | Yes (WP admin) | Wrong for this site |
| **B. Static HTML lift into Astro** | Yes — pixel-close if assets are localized | Hard (editing giant HTML) | Best **Phase 1** |
| **C. Full Astro rebuild** | Yes — after rebuild | Excellent | Best **end state** |
| **D. Hybrid B → C** | Yes from day one | Improves over time | **Recommended** |

---

## Why headless WordPress fails here

Official guides ([Astro WordPress CMS](https://docs.astro.build/en/guides/cms/wordpress/), [Kinsta tutorial](https://kinsta.com/blog/wordpress-astro/)) assume **content-first** WordPress:

- Posts/pages as `title` + `content.rendered`
- Frontend layout owned by Astro

This site’s homepage is **Elementor page ID 26466**:

- Dozens of sections/containers
- 100+ widgets (image-boxes, headings, Lottie, counters, tabs, carousel)
- Page-specific Elementor CSS (`elementor-26466 …`)
- Theme + plugin CSS/JS (Essentials, Max Mega Menu, CF7, Instagram Feed, etc.)

That structure lives in Elementor’s data and compiled CSS — **not** in a useful form via `wp-json/wp/v2/pages`. Headless would mean rewriting the entire UI with zero free reuse of the current design.

### When headless *does* make sense later

Only for **blog / news / structured CPT** content where Astro owns the layout and WP (or another CMS) only supplies text and fields.

---

## Target architecture (end state)

```text
Editors / Devs
      │
      ▼
┌─────────────────┐     build      ┌──────────────────┐
│ Astro project   │ ─────────────► │ Static HTML/CSS  │
│ (src/pages,     │                │ + assets on CDN  │
│  components)    │                └──────────────────┘
└─────────────────┘
      │
      │ forms submit to
      ▼
┌─────────────────┐
│ Pipedrive /     │
│ serverless API  │
└─────────────────┘
```

No PHP runtime. No Elementor. No CF7.

---

## Interim architecture (Phase 1)

```text
source/wordpress-exports/*.html
        │
        │ clean + rewrite URLs
        ▼
public/assets/*  +  src/pages/*.astro (or public/legacy/*.html)
        │
        │ astro build
        ▼
dist/  → static host
```

Elementor markup and CSS are kept **intact** until Phase 4 rebuilds those routes.

---

## Non-goals of Phase 1

- Perfect long-term maintainability of raw Elementor HTML
- Keeping WordPress online forever for forms/assets
- Pixel-perfect rebuild of every landing page in week one

---

## Next document

→ [02-migration-phases.md](02-migration-phases.md)
