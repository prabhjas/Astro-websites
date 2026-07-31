# CBSS Astro

Astro migration of the CBSS landing page (HTML/CSS/JS/PHP → Astro + Node adapter).

Follows [Connect Astro fleet standard](docs/CONNECT-ASTRO-FLEET-STANDARD.md).

## Architecture

- Static marketing page rebuilt as Astro components
- `POST /api/contact` with JSON body, validation, rate limiting, file lead store
- Pipedrive person + lead creation + optional SMTP notifications
- Machine APIs under `/api/internal/*` (bearer `INTERNAL_JOB_SECRET`) for central CMS
- `GET /api/health` liveness

## Quick start

```bash
cp .env.example .env
# fill PIPEDRIVE_API_TOKEN and INTERNAL_JOB_SECRET as needed
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development server |
| `npm run build` | Production build (Node standalone) |
| `npm run start` | Run built `dist/server/entry.mjs` |
| `npm run preview` | Preview production build |
| `npm test` | Contact form unit tests |

## Source reference

Original site: HTML/PHP CBSS landing (`index.html` + `submit-form.php`).
