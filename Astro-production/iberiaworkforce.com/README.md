# Iberia Workforce Solutions — website

Bilingual (English / Spanish) marketing site for **Iberia Workforce Solutions SL**,
an authorised *Empresa de Trabajo Temporal (ETT)* in Spain.

Aligned with **CONNECT-ASTRO-FLEET-STANDARD** (Astro 7.1.6, Node adapter, file-backed leads, Tier 1 deploy).

## Stack
- **Astro 7.1.6** static output + **@astrojs/node 11.0.3** standalone (`npm start`)
- **Tailwind CSS 4** via `@tailwindcss/vite`
- Self-hosted **Inter** font
- **@astrojs/sitemap** with EN/ES hreflang

## Pages
| Route | Spanish | Purpose |
|-------|---------|---------|
| `/` | `/es/` | Home |
| `/services/` | `/es/services/` | Services overview |
| `/services/{eor,payroll,labour-legal,compliance,staff-outsourcing}/` | `/es/services/…/` | Service detail |
| `/about/` | `/es/about/` | About us |
| `/contact/` | `/es/contact/` | Contact + form |
| `POST /api/contact` | — | Fleet contact / Pipedrive lead pipeline |
| `GET /api/health` | — | Liveness |
| `/api/internal/*` | — | Central CMS (bearer `INTERNAL_JOB_SECRET`) |

`POST /api/lead` remains as a thin alias of `/api/contact`.

## Content
- `src/i18n/content.ts` — nav, footer, home, about, contact, services-index (EN + ES)
- `src/data/services.ts` — five services in EN + ES
- `src/data/company.ts` — company name, contact details, ETT credential

## Develop
```bash
npm install
npm run dev      # http://localhost:4325
npm run build
npm start        # node ./dist/server/entry.mjs
npm test
```

## Env / deploy
See `.env.example`, `docs/CONNECT-ASTRO-FLEET-STANDARD.md`, and `deploy/ROOT_SETUP.md`.
Prod unit: **iberiaworkforce** on port **5083**. Never run `astro dev` in production.

## To confirm before launch
- Real **logo** (swap `src/components/Logo.astro` + `public/favicon.svg`)
- Final **email / phone / WhatsApp / city** in `src/data/company.ts`
- Pipedrive token, owner id, and any custom-field hashes in `.env.prod`
