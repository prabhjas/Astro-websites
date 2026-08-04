# 04 — Phase 1: Static mirror runbook

Turn WordPress HTML exports into a static Astro site **without** headless CMS.

---

## Prerequisites

- Node.js **v22.12.0+** (even-numbered LTS; see [Astro install](https://docs.astro.build/en/install-and-setup/))
- Access to production/staging WordPress (to export pages and download assets)
- This repo’s exports under `source/wordpress-exports/`

---

## Target Astro layout (after scaffold)

```text
astro/
├── docs/                          ← plans (already here)
├── source/wordpress-exports/      ← raw dumps (already here)
├── public/
│   └── assets/
│       ├── uploads/               ← from wp-content/uploads
│       ├── plugins/               ← needed CSS/JS only
│       ├── themes/
│       └── fonts/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/                ← empty until Phase 3
│   ├── pages/
│   │   └── index.astro            ← cleaned homepage
│   └── styles/                    ← optional extracted CSS
├── astro.config.mjs               ← static output
├── package.json
└── tsconfig.json
```

---

## Step 1 — Scaffold Astro

From `/Users/prabhjasbajwa/Desktop/astro` (or a subfolder if you prefer isolating the app):

```bash
npm create astro@latest .
```

Recommended wizard choices:

- Empty / minimal template
- TypeScript: strict (or relaxed if team prefers)
- Install dependencies: yes
- Git: as preferred

Ensure config uses static output (Astro default for most starters):

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // output: 'static' is default
  site: 'https://connectgroup.co',
});
```

---

## Step 2 — Collect page exports

Store each export under:

```text
source/wordpress-exports/<page-slug>/index-https.html
```

Methods:

| Method | Pros | Cons |
|--------|------|------|
| WP Rocket / cache HTML | Matches production cache | May include logged-in junk |
| `wget` / HTTrack crawl | Full site | Large; may miss auth walls |
| Browser “Save As” | Quick for one page | Manual |

Homepage is already at:

`source/wordpress-exports/homepage/index-https.html`

---

## Step 3 — Localize assets

1. Parse HTML for `https://connectgroup.co/wp-content/...` and `wp-includes/...`
2. Download each file into `public/assets/...` mirroring path structure
3. Rewrite HTML URLs:

```text
https://connectgroup.co/wp-content/uploads/2025/09/Hero-Desktop.png
  → /assets/uploads/2025/09/Hero-Desktop.png
```

Optional later: a small Node script `scripts/localize-assets.mjs`.

---

## Step 4 — Clean HTML

Remove or disable:

- Admin bar CSS/markup
- `xmlrpc`, RSD, unnecessary feed links (optional)
- Scripts that only call WordPress ajax (or leave until Phase 2 and accept errors in console)

Preserve:

- Elementor markup and IDs
- Rank Math meta + JSON-LD
- Elementor + theme CSS/JS needed for layout

---

## Step 5 — Wire into Astro

### Option A — Thin wrapper (recommended early)

`src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
// Import cleaned fragment or read from file during build
---
<BaseLayout title="Company Setup & Corporate Services in Dubai | Connect Group">
  <!-- cleaned body from export -->
</BaseLayout>
```

### Option B — Full file in `public/`

Place cleaned `index.html` at `public/index.html` for an ultra-fast mirror.  
Downside: harder to share layouts later — migrate to Option A ASAP.

---

## Step 6 — QA checklist

- [ ] Desktop hero matches live site
- [ ] Mobile layout / hamburger
- [ ] Fonts load (no FOIT/FOUT disasters)
- [ ] Images not 404
- [ ] Tabs / carousel / counters / Lottie
- [ ] Internal links resolve (or are inventoried as TODO)
- [ ] `astro build` succeeds; preview with `astro preview`

---

## Priority order for mirroring

1. Homepage (`/`)
2. Top traffic service pages (from analytics)
3. Contact / thank-you pages
4. Remaining mega-menu URLs
5. Blog (decide: mirror vs headless vs Markdown)

---

## Next document

→ [05-forms-and-dynamic.md](05-forms-and-dynamic.md)
