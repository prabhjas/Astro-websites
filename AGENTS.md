# AGENTS.md — WordPress to Astro Migration

## What This Project Is

We are converting **all** WordPress websites to Astro (latest version), one by one.

- **WP backups (raw tarballs)**: `/opt/WP-sites-backup/wp_backups_260627/<site-name>/public_html_*.tar.gz`
- **Extracted WP files**: `/opt/Exported-wp/<site-name>/public_html/` (gitignored — large files)
- **Work in progress**: `/opt/Astro-staging/<site-name>/`
- **Live production**: `/opt/Astro-production/<site-name>/`
- **Live websites**: `/url of the website ` (all the wordpress are live currently in another server WP rendering to the web)

Each WP site in `/opt/WP-sites-backup/wp_backups_260627/` gets its own Astro project in `/opt/Astro-staging/`.

### Sites to Convert (in order)

1. `alburaq-ae` → `/opt/Astro-staging/alburaq/` ← **current**
2. `connectbusinesscenter-com`
3. `connectresources-ae`
4. `connectgroup-co`
5. `izi-ae`
6. `royalvisa-ae`
7. `movey-ae`
8. `emiratiguard-com`
9. `digitizengrow-com`
10. *(remaining sites in `/opt/WP-sites-backup/wp_backups_260627/`)*

---

## The Only Goal: Look Identical to the WordPress Site

Do **not** redesign, do not improve, do not be creative.

The Astro version must look **exactly** like the WordPress original — same colors, same fonts, same layout, same sections, same animations, same floating elements.

**Before writing any code**, extract the real design from the WP source:

1. Read the Elementor CSS from `/opt/Exported-wp/<site>/public_html/wp-content/uploads/elementor/css/post-*.css`
2. Extract real colors (background, text, buttons, accents)
3. Extract real fonts (check for custom `.ttf`/`.woff` files in uploads)
4. Understand real section layouts and backgrounds

Do **not** invent colors from Elementor's global kit — the kit defaults are often overridden per-page.

---

## How to Extract the Real Design

```bash

# Go to website real url to see how it is in real
Go to url 
# Find homepage post ID
zcat /opt/WP-sites-backup/.../alburaq_*.sql.gz | grep "page_on_front"

# Read homepage CSS
cat /opt/Exported-wp/<site>/public_html/wp-content/uploads/elementor/css/post-<ID>.css

# Extract real colors
grep -oE '#[0-9a-fA-F]{3,8}' post-<ID>.css | sort | uniq -c | sort -rn

# Find custom fonts
find /opt/Exported-wp/<site>/public_html -name "*.ttf" -o -name "*.woff*"

# Get all uploaded images
ls /opt/Exported-wp/<site>/public_html/wp-content/uploads/
```

Images are already pre-copied to the Astro `public/images/` folder for each site.

---

## Project Structure for Each Astro Site

```
/opt/Astro-staging/<site-name>/
├── public/
│   ├── images/          ← all WP uploads already here
│   └── fonts/           ← custom fonts (copy from WP exports)
├── src/
│   ├── layouts/
│   │   └── Base.astro   ← HTML shell, Header, Footer, floating buttons
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about-us/index.astro
│   │   ├── contact-us/index.astro
│   │   └── <service>/index.astro
│   ├── content/
│   │   └── blog/        ← MDX blog posts (CMS-ready)
│   ├── styles/
│   │   └── global.css
│   └── content.config.ts
├── tailwind.config.mjs
├── astro.config.mjs
└── package.json
```

The content collection for blog is already set up for future CMS integration.

---

## What to Replicate — Checklist

Every migrated site must have:

- [ ] Top bar (address, phone, email)
- [ ] Sticky header with correct logo and navigation (including dropdowns)
- [ ] Mobile hamburger menu
- [ ] Hero section matching the original
- [ ] All homepage sections in the correct order
- [ ] Service/feature cards
- [ ] Testimonials section
- [ ] Stats/numbers section
- [ ] Contact form (working — do not use Formspree; use mailto or a first-party backend)
- [ ] Footer with all columns (services, links, contact, social)
- [ ] WhatsApp floating button (bottom-right)
- [ ] Scroll-to-top button (bottom-left, appears after scroll)
- [ ] Correct colors, fonts, border-radius, spacing
- [ ] Favicon
- [ ] All inner pages (About, Contact, each Service)
- [ ] Blog listing and blog post pages

---

## Dev Server and Deployment

**Staging (local):**
```bash
cd /opt/Astro-staging/<site-name>
npm run dev     # starts on port 4321, accessible at http://<server-ip>:4321
```

**After every change or completed section:**
1. Run `npm run build` — fix all TypeScript/Astro errors before continuing
2. `git add` specific files, commit with a descriptive message, push
3. Restart (or start) the dev server so the user can see it live immediately:
   ```bash
   pkill -f "astro dev" || true
   cd /opt/Astro-staging/<site-name> && npm run dev -- --host 0.0.0.0 &
   ```
4. Report the local URL so the user can verify the change

**Dev server port:** Astro defaults to `4321`. If building multiple sites simultaneously, use `--port 4322`, etc.

**Production:** When a site is approved, copy to `/opt/Astro-production/<site-name>/` and Caddy serves it on its domain (Cloudflare → this server → Caddy → Astro static files).

---

## Rules

- Always run `npm run build` and fix all errors before committing
- Always commit after completing work on a page or feature
- Keep image paths as `/images/2024/12/filename.webp` — they are pre-copied
- Copy custom fonts to `public/fonts/` and reference them in `global.css`
- Use Tailwind for all styling — set real colors in `tailwind.config.mjs`
- No inline styles unless strictly necessary
- Do not ask implementation questions — use the WP source files as the source of truth
- Never use Formspree for contact forms.
- For local/static Astro staging, contact forms must work without third-party form services. Use `mailto:` as the default fallback unless a first-party backend/API endpoint is available.

---
