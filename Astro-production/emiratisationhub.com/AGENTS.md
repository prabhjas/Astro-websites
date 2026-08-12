# Agent notes — emiratisationhub.com

Follow `docs/00-NEW-SITE-MASTER.md` and this site's `docs/CONNECT-ASTRO-FLEET-STANDARD.md`.

- Use **pnpm** from the monorepo root (`pnpm --filter …`), not npm.
- Never commit `.env`, `.env.prod`, `.data/`, `dist/`, or `node_modules/`.
- Lead notify is **file store + Pipedrive** only — do not require SMTP / `FORM_NOTIFICATION_*`.
- Machine APIs use `Authorization: Bearer $INTERNAL_JOB_SECRET`.
