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

**Full playbook:** [docs/CONNECT-FLOW-SITE-ONBOARDING.md](../../docs/CONNECT-FLOW-SITE-ONBOARDING.md)

1. Add `Astro-production/<domain>/`
2. Depend on `@connect/site-cms`: `workspace:*`
3. `src/cms.ts` bind + middleware `import './cms'`
4. Copy thin mounts from Evolution/SP (full) or Iberia (leads-only)
5. Implement posts adapter only if the site needs blog CMS
6. Prove with `fleet-local` smoke + Bearer GET posts / redirects / gtm / leads

## Lead retry compatibility — pending backend installation

Verified in source on 2026-09-18 UTC: explicit manual and bulk retries may
reattempt failed or exhausted destinations and bypass a scheduled delay.
Delivered and manually resolved destinations are always skipped, including
Pipedrive, which has no delivery idempotency key. Automatic retries retain
permanent-failure and maximum-attempt limits. With FLOW disabled or without
credentials, the existing Pipedrive/local-store path remains available and no
FLOW request is sent. This source change does not enable FLOW, backfill records,
remove enquiry-reading routes, or claim a live deployment.

## Sensitive GTM write authentication

`POST /api/internal/gtm/save` is intentionally stricter than legacy internal APIs.
It requires a site-scoped `site-v1` HMAC signature created from a strong,
per-site `INTERNAL_JOB_SECRET` (at least 32 UTF-8 bytes and not a documented
placeholder). The signature covers the configured site ID, `gtm:write` scope,
HTTP method, exact path/query, exact trimmed Content-Type, timestamp, nonce, and
SHA-256 of the exact body.
It expires after five minutes and a nonce cannot be reused within one process.

Rejected placeholder forms are deterministic: values beginning with
`change…` / `replace…`; `your…` / `my…` secret, token, or key labels; bare
secret/password/token/key defaults; test/dev/example/sample/dummy/placeholder/
todo variants; and a single character repeated for the whole value. Leading or
trailing whitespace and values over 512 bytes are also rejected. The code does
not contain the current fleet secret or a fingerprint deny-list.

Create the final `Request` first, then add the generated headers:

```ts
import { createSiteScopedInternalJobAuthHeaders } from '@connect/site-cms';

const form = new FormData();
form.set('gtmIds', 'GTM-ABCDEFG');
form.set('ga4Ids', 'G-ABCDEFGHIJ');
form.set('updatedBy', 'central-cms');

const request = new Request('https://example.com/api/internal/gtm/save', {
  method: 'POST',
  body: form,
});
const authHeaders = await createSiteScopedInternalJobAuthHeaders(request, {
  secret: process.env.INTERNAL_JOB_SECRET!,
  siteId: 'example', // must match configureSiteCms({ siteId }) on the server
  scope: 'gtm:write',
});
authHeaders.forEach((value, name) => request.headers.set(name, value));
const response = await fetch(request);
```

GTM writes accept only structured `gtmIds` / `ga4Ids` (comma-separated or
repeated form fields). Singular aliases `gtmId`, `ga4Id`, `containerId`, and
`measurementId` are also accepted. Non-empty legacy `headScript`, `bodyHtml`,
or `footerScript` fields return `422`; JavaScript is never persisted directly.

Existing files remain visible through authenticated `GET /api/internal/gtm`
for migration. Runtime injection executes version-2 structured configs and
exact canonical legacy snippets only; other legacy markup is ignored and the
runtime falls back to deploy-time environment configuration. Nonce replay
tracking is process-local, so deployments with multiple instances should use
sticky routing or a shared replay store if the five-minute cross-instance
replay window is material.

## Contact-request resource controls

Contact routes must enforce a streaming byte limit before parsing. Small routes
use `readRequestBodyLimited()` and then `replayRequestWithBody()`; large parser
routes use `requestWithLimitedBody()` so they do not retain an extra full-size
copy. Both paths enforce the limit while chunks arrive, cancel an oversized
stream, and do not rely on `Content-Length`. Body ceilings must also fit the
service's memory cgroup; per-file limits alone are not a safe total-body limit.

Fleet contact rate limiting is centralized in `@connect/site-cms/http/rate-limit`.
It retains at most 10,000 expiring per-process keys and preserves the existing
five-requests-per-minute behavior. Client IP headers are not independently
trustworthy until H-04 restricts the origin to Cloudflare and Caddy is configured
with reviewed trusted-proxy rules; the bounded store is not a substitute for an
edge or distributed rate limiter.
