# Al Buraq — Astro static site

A static **Astro** copy of alburaq.ae (originally WordPress + Elementor), built with the
"faithful mirror" method: each page serves the original rendered HTML + its real CSS, with
all assets localized and **all third-party JavaScript stripped** for safety.

## Develop & build

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs dist/ (static pages + the form server)
npm run preview    # serve the build
npx astro check    # type-check (should be 0 errors)
```

## Project structure

```
public/
  images/        media library (from the WP "uploads")
  assets/        stylesheets + fonts the pages link to (NOT WordPress; no .php, no .js)
  fonts/         the heading webfont
src/
  pages/         one Astro route per page/post — each renders its mirror via set:html
    index.astro            home
    <slug>/index.astro     static pages + blog posts (posts use their live root URLs)
    api/lead.ts            server endpoint → Pipedrive (the only dynamic route)
  mirror/        the localized, script-stripped HTML each page renders (?raw imported)
  layouts/ components/  shared shell used by the terms/privacy placeholder pages
  styles/global.css     design tokens + heading @font-face
```

## Forms → Pipedrive

Contact forms post to `/api/lead`, which creates a **Person + Lead** in Pipedrive with the
exact field mapping the old WordPress CF7→Pipedrive plugin used (owner, label, custom
fields). It needs:

- **`PIPEDRIVE_API_TOKEN`** in `.env` (see `.env.example`) — never commit it (it's gitignored).
- A host that can run the endpoint (the `@astrojs/node` adapter locally; Netlify/Vercel/
  Cloudflare in production). Static-only hosting serves the pages but not the form.

## Run in a container (isolated)

```bash
docker build -t alburaq .
docker run -e PIPEDRIVE_API_TOKEN=xxxxx -p 4321:4321 alburaq
```

Or open the folder in VS Code → "Reopen in Container" (`.devcontainer/`).

See **MIGRATION-NOTES.md** for every intentional difference from the live site.
