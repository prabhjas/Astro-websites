# CBSS Astro

Astro migration of the CBSS landing page (HTML/CSS/JS/PHP → Astro + Node adapter).

## Architecture

Follows the Connect Group Astro platform pattern:

- Static marketing page rebuilt as Astro components
- `POST /api/contact` with validation, rate limiting, file lead store
- Pipedrive person + lead creation + optional SMTP notifications
- Internal lead ops dashboard at `/internal/operations`

## Quick start

```bash
cp .env.example .env
# fill PIPEDRIVE_API_TOKEN, DASHBOARD_SESSION_SECRET, DASHBOARD_USERS_JSON, SMTP_*
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development server |
| `npm run build` | Production build (Node standalone) |
| `npm run preview` | Preview production build |
| `npm test` | Contact form unit tests |

## Source reference

Original site: HTML/PHP CBSS landing (`index.html` + `submit-form.php`).
