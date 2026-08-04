# @connect/site-cms

Shared Connect Group **site CMS code** for Astro SSR sites (built for 30+ domains).

## Model

| Layer | Where |
|-------|--------|
| **Handlers** (all `/api/internal/*`) | This package — one codebase |
| **Leads / GTM / uploads / php / SEO / redirects stores** | This package (default file-backed) |
| **Posts / taxonomy data** | Per-site adapters (Evolution blog files vs SP JSON) registered in `src/cms.ts` |
| **Pipedrive / email / logger** | Per-site services injected via `configureSiteCms` |
| **Central CMS UI** | Separate app → HTTPS + `Bearer <INTERNAL_JOB_SECRET>` per domain |

Not a single Node process for all domains — **shared code, per-site bind + process**.

## Bind a site

```ts
// src/cms.ts — imported from middleware first
import { configureSiteCms, FEATURES_FULL_CMS /* or FEATURES_LEADS_ONLY */ } from '@connect/site-cms';
import * as postsStore from './lib/internal-posts/store';
import * as taxonomyStore from './lib/internal-posts/taxonomy-store';
// … pipedrive, email, logger, getServerEnv

configureSiteCms({
  siteId: 'example',
  features: FEATURES_FULL_CMS,
  getLeadEnv: () => getServerEnv() as any,
  createPipedriveLead,
  sendFormNotification,
  logFormSuccess,
  logPipedriveFailure,
  logWarn,
  posts: { /* PostsAdapter from local store */ },
  taxonomy: { /* TaxonomyAdapter */ },
});
```

Leads-only sites (CBSS, Iberia) omit `posts` / `taxonomy` and use `FEATURES_LEADS_ONLY`.

## Mount routes

Thin files under `src/pages/api/internal/…`:

```ts
export const prerender = false;
export { GET } from '@connect/site-cms/astro/posts/index';
```

(`prerender = false` must stay in the site file — Astro static analysis.)

## Features for site #5+

Follow the full playbook: [`docs/CONNECT-FLOW-SITE-ONBOARDING.md`](../../docs/CONNECT-FLOW-SITE-ONBOARDING.md).

1. Add `Astro-production/<domain>/`
2. Depend on `@connect/site-cms`: `workspace:*`
3. `src/cms.ts` bind + middleware `import './cms'`
4. Copy thin mounts from SP / connectgroup (full) or Iberia (leads-only)
5. Implement posts adapter only if the site needs blog CMS in FLOW
