# 08 — SEO strategy (Astro static)

How SEO works during migration, and how the SEO team can keep working without Rank Math inside WordPress after cutover.

---

## Homepage status first

| Layer | Status |
|-------|--------|
| Visual homepage (Elementor HTML mirror) | Ready locally via `npm run prepare:homepage:download` + `npm run.dev` |
| Rank Math tags baked into mirror HTML | Present (title, description, canonical, OG, Twitter, JSON-LD) |
| Forms / Pipedrive | **Not** production-ready (CF7 still needs WordPress) |
| Full site (other URLs) | Not migrated yet |
| DNS cutover | Not done |

So: **homepage demo / visual QA = yes**. **Production SEO cutover = not yet** (only one URL mirrored; forms incomplete).

---

## How SEO works in Phase 1 (current structure)

We did **not** throw SEO away. The WP Rocket export already includes Rank Math output in `<head>`:

- `<title>`
- `meta name="description"`
- `link rel="canonical"`
- Open Graph + Twitter tags
- `robots` directives
- JSON-LD schema (`Organization`, `WebSite`, `WebPage`, …)

That HTML is cleaned, asset URLs localized, and served by Astro as static files. Search engines see normal static HTML — same idea as a cached WordPress page.

**Important limitation for the SEO team in Phase 1:**

| If they change SEO in… | Effect on Astro |
|------------------------|-----------------|
| Rank Math in live WordPress | **Nothing**, until someone re-exports HTML and runs `npm run prepare:homepage:download` |
| The cleaned HTML / frontmatter in Astro | Takes effect on next build/deploy |

Phase 1 is a **snapshot**. Rank Math stops being the live editor once traffic moves to Astro.

---

## Target model (Phases 3–4): SEO as data, not Rank Math

When pages are rebuilt as Astro (not raw Elementor HTML), SEO should live in **structured files** the SEO team can edit (or request via PR), not in WordPress plugins.

### Recommended layout

```text
src/
  data/
    seo/
      home.yml              # homepage SEO fields
      pro-services.yml
      …
  layouts/
    BaseLayout.astro        # renders title, meta, OG, JSON-LD from props
  pages/
    index.astro             # Phase 1 mirror (or rebuilt page using SEO YAML)
```

### Example SEO file (`src/data/seo/home.yml`)

```yaml
title: "Company Setup & Corporate Services in Dubai | Connect Group"
description: "Connect Group offers Company Setup, PRO, HR Outsourcing, Payroll, & Visa services in Dubai, UAE helping businesses grow with compliance."
canonical: "https://connectgroup.co/"
robots: "index, follow"
og:
  title: "Company Setup & Corporate Services in Dubai | Connect Group"
  description: "Connect Group offers Company Setup, PRO, HR Outsourcing…"
  type: website
  image: "/wp-content/uploads/2025/09/Frame.png"
schema:
  type: WebPage
  # optional extras; BaseLayout builds Organization/WebSite once globally
```

`BaseLayout.astro` already has basic title/description/canonical props — extend it to read these files and emit full OG + JSON-LD.

### Site-wide SEO plumbing in Astro

| Piece | Astro approach |
|-------|----------------|
| Per-page meta | Frontmatter / YAML / MDX frontmatter |
| Sitemap | Official `@astrojs/sitemap` integration |
| `robots.txt` | `public/robots.txt` |
| Canonicals | From `site` in `astro.config.mjs` + per-page path |
| Redirects | Host config (`_redirects`, `vercel.json`, Cloudflare) + keep WP redirect map |
| Structured data | JSON-LD component in layout |
| Analytics | GTM/GA in `BaseLayout` (not Rank Math) |

---

## Who does what (team workflow)

### Phase 1 (mirror period — now)

| Role | How they work |
|------|----------------|
| SEO | Audit live WP Rank Math; freeze titles/descriptions that must not change at cutover; fill `docs/inventory/urls.md` |
| Dev | Re-export pages after SEO signs off; keep paths identical |
| SEO changing a title on a mirrored page | Request re-export **or** (temporary) edit cleaned HTML / script — prefer waiting for Phase 3 SEO files |

### After cutover (Astro is live)

| Role | How they work |
|------|----------------|
| SEO | Edit `src/data/seo/*.yml` (or MDX frontmatter) → open PR → preview deploy → merge → build |
| Content | Same files or Markdown/MDX body for copy |
| Dev | Maintain layout/schema components, sitemap, redirects |
| No Rank Math / WP admin for public SEO | WordPress is frozen or removed |

If SEO cannot use Git, options later:

1. **Headless CMS** only for blog/meta fields (Contentful, Sanity, etc.) — layout still Astro  
2. **Decap/Netlify CMS** on top of the YAML files (Git-backed, browser UI)  
3. Keep a small internal tool that edits YAML and opens PRs  

Do **not** bring Rank Math back as the long-term editor for static marketing pages.

---

## Migration rules so rankings do not drop

1. **Same URLs** — `/pro-services/` stays `/pro-services/`  
2. **Port Rank Math fields 1:1** into YAML before rebuilding a page  
3. **301 map** for any retired URLs  
4. **Sitemap** submitted in Google Search Console after cutover  
5. **Content freeze** → final re-export → cutover  
6. Monitor Search Console for 2–4 weeks  

Checklist detail: [06-risks-and-seo.md](06-risks-and-seo.md)

---

## Practical “are we SEO-ready?” answer

| Question | Answer |
|----------|--------|
| Does the Astro homepage have SEO tags today? | **Yes** — Rank Math tags are inside the static HTML mirror |
| Can SEO keep using Rank Math after DNS moves? | **No** — that workflow dies at cutover |
| What replaces Rank Math? | Per-page SEO YAML/MDX + Astro layout + `@astrojs/sitemap` |
| Can SEO work independently? | **Yes**, once SEO fields live in repo files (PR) or a Git-backed CMS UI |

---

## Next implementation steps

Completed for manager demo:

1. [x] Add `@astrojs/sitemap` + `public/robots.txt`
2. [x] Extend `BaseLayout` for OG + JSON-LD
3. [x] Extract homepage Rank Math fields into `src/data/seo/home.yml`
4. [x] Drive demo/rebuild pages from SEO YAML — see `/demo/seo/`

Still Phase 2+: wire forms; mirror more URLs; rebuild homepage sections in Astro.
