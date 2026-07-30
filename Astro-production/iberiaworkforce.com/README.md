# Iberia Workforce Solutions — website

Bilingual (English / Spanish) marketing site for **Iberia Workforce Solutions SL**,
an authorised *Empresa de Trabajo Temporal (ETT)* in Spain. Built with Astro + Tailwind
for fast loading and strong SEO.

## Stack
- **Astro** (static output) with the **Node** standalone adapter (only `/api/lead` runs on-demand)
- **Tailwind CSS** for styling, self-hosted **Inter** font (no external requests)
- **@astrojs/sitemap** for `sitemap-index.xml` with EN/ES hreflang

## Pages
| Route | Spanish | Purpose |
|-------|---------|---------|
| `/` | `/es/` | Home |
| `/services/` | `/es/services/` | Services overview |
| `/services/{eor,payroll,labour-legal,compliance,staff-outsourcing}/` | `/es/services/…/` | Service detail |
| `/about/` | `/es/about/` | About us |
| `/contact/` | `/es/contact/` | Contact + form |
| `POST /api/lead` | — | Pipedrive lead capture |

## Content
All copy lives in two places — edit these, not the components:
- `src/i18n/content.ts` — nav, footer, home, about, contact, services-index copy (EN + ES)
- `src/data/services.ts` — the five services (name, SEO meta, intro, bullets, why) in EN + ES
- `src/data/company.ts` — company name, contact details, ETT credential

## Develop
```bash
npm install
npm run dev      # http://localhost:4325
npm run build    # outputs to dist/
npm run preview
```

## Contact form → Pipedrive
`POST /api/lead` creates a Person, optional Organization, a Lead and a Note.
Configure via env (see `.env.example`):
```
PIPEDRIVE_API_TOKEN=…        # required
PIPEDRIVE_OWNER_ID=…         # optional — the Iberia Workforce owner
PIPEDRIVE_VISIBLE_TO=3
PIPEDRIVE_LEAD_TITLE=Website lead — iberiaworkforce.com
```
Without a token the form returns a friendly "not configured" message.

## To confirm before launch
- Real **logo** (swap `src/components/Logo.astro` + `public/favicon.svg`)
- Final **email / phone / WhatsApp / city** in `src/data/company.ts`
- Pipedrive **owner id** and any custom-field mapping
