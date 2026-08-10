# saudicompanyformation.com (Astro fleet)

WordPress/Elementor → Astro SSR mirror. Port **5115**. Peer: `kpmpro.ae` / `connecthr.ae` (`FEATURES_FULL_CMS`).

```bash
# From monorepo root
pnpm install
pnpm --filter saudicompanyformation-com-astro run build
node scripts/fleet-local.mjs up saudicompanyformation
node scripts/fleet-local.mjs smoke saudicompanyformation
```

- Forms: CF7 → `POST /api/contact` (attribution + Pipedrive; no SMTP)
- GTM/GA4: `/runtime-gtm.js` only (`PUBLIC_GA4_ID` / FLOW)
- Never commit `.env` / `.env.prod` / `.data/`
