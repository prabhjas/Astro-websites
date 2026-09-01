# Connect Group CMS — old per-site dashboard + FLOW APIs

**For:** Aaron  
**Repo:** [Connect-Group-Tech/Astro-websites](https://github.com/Connect-Group-Tech/Astro-websites)  
**Date:** 2026-08-18  
**Current working branch:** `work/astro-sites`

This note answers two questions:

1. In which commit can you still see the **dashboard that used to load on each site**?
2. Which **APIs** can FLOW consume against each live Astro origin?

---

## 1. Mental model

There are two layers. They are not the same thing.

| Layer | What it is | Status now |
|-------|------------|------------|
| **Per-site HTML dashboard** | Cookie-login UI at `/internal/operations/` on each domain | **Removed.** Middleware returns **404**. |
| **Per-site machine APIs** | JSON `/api/internal/*` on each domain | **Live.** This is what FLOW should call. |
| **Shared handlers** | `packages/site-cms` (`@connect/site-cms`) | One codebase, bound per site in `src/cms.ts` |

FLOW (central CRM/CMS UI) is the dashboard going forward. Each Astro site is only a host + JSON API + file store.

```text
FLOW (one UI for all domains)
        │
        │  HTTPS + Authorization: Bearer <per-site INTERNAL_JOB_SECRET>
        ▼
Astro origin  (evolutionmiddleast.com, connectgroup.co, …)
        │
        └──  /api/internal/*  →  @connect/site-cms handlers
             Content stays on the site (posts JSON, .data/, uploads)
```

---

## 2. Where to see the old dashboard (the HTML UI)

### Best commit to inspect

**`fba983f69031b315eb07939413d0e22fc35bf011`**  
Date: **2026-07-30**  
Message: `Add Astro-production sites and fix HTTPS form submissions`

GitHub:

- Connect Group: https://github.com/Connect-Group-Tech/Astro-websites/commit/fba983f69031b315eb07939413d0e22fc35bf011
- Personal mirror: https://github.com/prabhjas/Astro-websites/commit/fba983f69031b315eb07939413d0e22fc35bf011

That commit is the first fleet snapshot that includes the working per-site operations UI. It added:

**Evolution MEA (full CMS dashboard)**

- `/internal/operations/login`
- `/internal/operations/` (overview)
- `/internal/operations/leads/` and `/internal/operations/leads/[publicId]`
- `/internal/operations/posts/` (list, new, edit)
- `/internal/operations/posts/categories/` and `/internal/operations/posts/tags/`
- `/internal/operations/redirects/`
- `/internal/operations/seo/` (robots, llms, sitemap)
- `/internal/operations/gtm/`
- `/internal/operations/uploads/`
- `/internal/operations/php-files/`
- `/internal/operations/failures/`

**CBSS (leads-only dashboard)**

- `/internal/operations/login`
- `/internal/operations/`
- `/internal/operations/leads/`
- `/internal/operations/failures/`

### How to check out that UI

```bash
git fetch origin
git checkout fba983f69031b315eb07939413d0e22fc35bf011
# then run Evolution locally and open:
#   http://127.0.0.1:5080/internal/operations/login
```

That UI used **cookie login**, not bearer tokens. It is **not** the production path anymore.

### When it was removed (replaced by FLOW APIs)

**`4134247052815fd04b8992fe48aca31573c52d8a`**  
Date: **2026-07-31**  
Message: `Fleet: standardize four Astro sites with pnpm workspace and shared CMS.`

GitHub: https://github.com/Connect-Group-Tech/Astro-websites/commit/4134247052815fd04b8992fe48aca31573c52d8a

That commit:

- deleted the `/internal/operations/**` Astro pages
- introduced `packages/site-cms`
- mounted thin `/api/internal/*` routes for FLOW

From that point, each site **404s** `/internal/operations*` and `/internal/lead-operations*` in middleware. Ops belongs in FLOW.

### Later leftover files (do not treat as a live dashboard)

A few later sites still have unused `InternalDashboardLayout.astro` copies (`connectgroup.co`, `connectzone.ae`, `connecthr.ae`, `connectfm.ae`, `c-uae.com`, `spheavyrental.ae`, `emiratiguard.com`, `thefreelancergate.com`). Those are leftover layout files. The **page routes are gone**, and middleware still 404s `/internal/operations*`.

If you want the actual old screens, use commit **`fba983f69`**, not current `work/astro-sites`.

---

## 3. What FLOW should consume (current API contract)

**Source of truth in git (current branch):** `packages/site-cms`  
**Bind per site:** `Astro-production/<domain>/src/cms.ts`  
**Thin mounts:** `Astro-production/<domain>/src/pages/api/internal/**`

Use the **current tip of `work/astro-sites`** (or the live host pin) for integration. Do not integrate against `fba983f69` — that commit has the HTML dashboard, not the FLOW JSON contract.

### 3.1 Base URL

Call the **public HTTPS origin** of the site (Caddy → loopback Node):

```text
https://<domain>/api/internal/...
```

Local / loopback equivalent:

```text
http://127.0.0.1:<PORT>/api/internal/...
```

Ports are in `docs/FLEET-PORT-REGISTRY.md` / `scripts/fleet-sites.json` (5080–5124). Examples:

| Domain | Port | `siteId` in `src/cms.ts` |
|--------|------|--------------------------|
| evolutionmiddleast.com | 5080 | `evolutionmiddleast` |
| cbss.ae | 5081 | `cbss` |
| spheavyrental.ae | 5082 | `spheavyrental` |
| connectgroup.co | (see registry) | `connectgroup` |
| eormiddleast.com | 5090 | `eormiddleast` |
| connectfz.com | 5096 | `connectfz` |
| connectzone.ae | 5101 | `connectzone` |

### 3.2 Auth (almost all internal routes)

```http
Authorization: Bearer <INTERNAL_JOB_SECRET>
```

Also accepted:

```http
x-internal-job-secret: <INTERNAL_JOB_SECRET>
```

Rules:

- Secret is **unique per domain** (never reuse across sites).
- `?secret=` query strings are **rejected**.
- Unauthenticated calls return **403**.
- Successful JSON bodies typically look like `{ "success": true, ... }`.
- Writes return JSON, **not** HTML redirects.

`INTERNAL_JOB_SECRET` lives in each site’s server `.env.prod` (not in git). FLOW already needs that mapping per domain.

### 3.3 Special auth: GTM writes only

`POST /api/internal/gtm/save` does **not** accept the raw bearer secret.

It requires a **site-scoped HMAC** (`site-v1`) from `createSiteScopedInternalJobAuthHeaders()` in `@connect/site-cms`:

- secret ≥ 32 UTF-8 bytes, not a placeholder
- headers bind `siteId`, scope `gtm:write`, method, path/query, Content-Type, timestamp, nonce, body SHA-256
- signature expires after **5 minutes**
- nonce cannot be reused in the same process

Helper (from `packages/site-cms/README.md`):

```ts
import { createSiteScopedInternalJobAuthHeaders } from '@connect/site-cms';

const form = new FormData();
form.set('gtmIds', 'GTM-ABCDEFG');
form.set('ga4Ids', 'G-ABCDEFGHIJ');
form.set('updatedBy', 'flow');

const request = new Request('https://example.com/api/internal/gtm/save', {
  method: 'POST',
  body: form,
});
const authHeaders = await createSiteScopedInternalJobAuthHeaders(request, {
  secret: process.env.INTERNAL_JOB_SECRET!,
  siteId: 'example', // must match configureSiteCms({ siteId })
  scope: 'gtm:write',
});
authHeaders.forEach((value, name) => request.headers.set(name, value));
await fetch(request);
```

### 3.4 Feature flags

| Flag | Who | What FLOW can call |
|------|-----|--------------------|
| `FEATURES_LEADS_ONLY` | **cbss.ae**, **iberiaworkforce.com** | Leads + retries + export only |
| `FEATURES_FULL_CMS` | All other fleet sites that bind `src/cms.ts` | Leads **plus** posts, taxonomy, redirects, GTM, SEO, uploads |

If a leads-only site is called for posts/redirects, those mounts may be missing. Check the site’s `src/pages/api/internal/` tree.

---

## 4. Public endpoints (not FLOW, but useful)

These are unauthenticated.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/health` | Liveness `{ ok: true, service, ts }` |
| `POST` | `/api/contact` | Public lead capture. JSON body. Origin must match `allowedDomains`. |
| `GET` | `/api/geo` or `/api/geo/country` | Phone country hint (where present) |

Contact must send `Content-Type: application/json` (not multipart) so Origin checks work behind Caddy.

---

## 5. Internal API catalog (FLOW contract)

Unless noted, auth = Bearer `INTERNAL_JOB_SECRET`.  
Unless noted, request body for writes = `multipart/form-data`.

### 5.1 Leads (all sites)

| Method | Path | Query / body | Response |
|--------|------|--------------|----------|
| `GET` | `/api/internal/leads` | `q`, `status` | `{ success, count, leads }` |
| `GET` | `/api/internal/leads/[publicId]` | — | `{ success, lead, attempts }` |
| `GET` | `/api/internal/export-leads` | `q`, `format=csv\|json` | File download |
| `POST` | `/api/internal/retry-lead` | JSON `{ publicId }` **or** form `publicId` | `{ success, publicId, deliveryStatus }` |
| `GET` or `POST` | `/api/internal/run-retries` | `limit` (1–100, default 25) | Batch Pipedrive retries |

Lead records live on disk under the site `.data/` lead store. Delivery retries: 1m → 5m → 15m → 1h → 6h.

### 5.2 Posts (full CMS)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/internal/posts/` | List. Query: `q`, `status` (`published` / `draft` / `trash`). `{ success, count, posts }` |
| `GET` | `/api/internal/posts/[slug]` | One post. 404 if missing. |
| `POST` | `/api/internal/posts/save` | Create/update. Form fields below. |
| `POST` | `/api/internal/posts/delete` | Form: `slug`, `mode=trash\|restore\|permanent` |

**`POST /api/internal/posts/save` fields**

| Field | Required | Notes |
|-------|----------|--------|
| `title` | yes | |
| `slug` | yes | |
| `contentHtml` | yes | Sanitized HTML |
| `categoryName`, `categorySlug` | yes | |
| `originalSlug` | no | Set when renaming |
| `tagsCsv` | no | |
| `status` | no | `published` / `draft` / `trash` (default draft) |
| `publishDate` | no | ISO / parseable date |
| `metaTitle`, `metaDescription` | no | |
| `noIndex`, `noFollow` | no | `1` or `on` |
| `featuredImageFile` | no | File upload |
| `removeFeaturedImage` | no | `1` to clear |

### 5.3 Taxonomy (full CMS)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/internal/posts/categories/` | Query: `q`, `trash=1` |
| `POST` | `/api/internal/posts/categories/save` | Form: `name`, `slug`, `description`, `originalSlug` |
| `POST` | `/api/internal/posts/categories/delete` | Trash / restore / permanent (same `mode` pattern as posts) |
| `GET` | `/api/internal/posts/tags/` | Query: `q`, `trash=1` |
| `POST` | `/api/internal/posts/tags/save` | Same shape as category save |
| `POST` | `/api/internal/posts/tags/delete` | Same delete modes |

### 5.4 Redirects (full CMS)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/internal/redirects/` | `{ success, count, redirects, stats }` |
| `POST` | `/api/internal/redirects/save` | Form: `from`, `to`, `status` (default 301). Edit: `originalFrom` + `from:<old>` / `to:<old>` / `status:<old>` |
| `POST` | `/api/internal/redirects/delete` | Form: `from` or `deleteFrom` |
| `POST` | `/api/internal/redirects/bulk-delete` | Bulk remove |
| `POST` | `/api/internal/redirects/import` | Form file `file` — Rank Math CSV/JSON |

Save/delete/import regenerate redirect artifacts via `scripts/generate-redirects.mjs` on that site.

### 5.5 GTM / GA4 (full CMS)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `GET` | `/api/internal/gtm/` | Bearer secret | `{ success, config }` — includes legacy snippets for migration |
| `POST` | `/api/internal/gtm/save` | **HMAC `gtm:write`** | Form: `gtmIds` / `ga4Ids` (comma or repeated). Aliases: `gtmId`, `ga4Id`, `containerId`, `measurementId`. `updatedBy`. |

Do **not** send `headScript` / `bodyHtml` / `footerScript` with content — those return **422**. Runtime injects structured IDs only.

### 5.6 SEO (full CMS)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/internal/seo/text-files/save` | Form: `kind=robots\|llm`, `content`, `updatedBy` |
| `POST` | `/api/internal/seo/llms/save` | Form: `mode=auto\|override`, `siteTitle`, `summary`, `details`, `groupOrder` (newline list), `postsCount`, `optionalMarkdown`, `blogNote`, `content` (when override), `updatedBy` |
| `POST` | `/api/internal/seo/sitemap/save` | Form: `path`, `priority`, `changefreq`, `updatedBy`. Both priority+changefreq empty **deletes** the override. |
| `POST` | `/api/internal/seo/sitemap/delete` | Delete a sitemap override |

Public `/robots.txt`, `/llms.txt`, `/sitemap*.xml` stay normal Astro routes. FLOW edits **data**; the site serves the public files.

### 5.7 Uploads (full CMS)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/internal/uploads` | Form: `file`, `updatedBy` → `{ success, uploadId, originalName }` |
| `GET` | `/api/internal/uploads/[uploadId]` | Fetch stored file/metadata |
| `POST` | `/api/internal/uploads/delete` | Delete by id |

Oversize files return **413**.

### 5.8 PHP files (disabled)

| Method | Path | Status |
|--------|------|--------|
| `POST` | `/api/internal/php-files/save` | **410** — disabled (security). Do not consume. |
| `POST` | `/api/internal/php-files/upload` | Treat as disabled / do not use for executable PHP. |

---

## 6. Smoke tests Aaron can run

Replace origin + secret. Expect **403** without auth, **200** with Bearer.

```bash
BASE=https://evolutionmiddleast.com
SECRET='<INTERNAL_JOB_SECRET for that site>'

curl -sS "$BASE/api/health"
curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/api/internal/leads"          # 403
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/leads?limit=1"
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/posts/" | head
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/redirects/" | head
curl -sS -H "Authorization: Bearer $SECRET" "$BASE/api/internal/gtm/" | head
```

Local loopback uses `http://127.0.0.1:<PORT>` instead of HTTPS.

---

## 7. What FLOW should register per domain

| Field | Source |
|-------|--------|
| Domain / HTTPS origin | Live hostname |
| Loopback port (ops only) | `scripts/fleet-sites.json` |
| `siteId` | `configureSiteCms({ siteId })` in that site’s `src/cms.ts` |
| `INTERNAL_JOB_SECRET` | That site’s `.env.prod` (server-only) |
| Feature set | `FEATURES_FULL_CMS` vs `FEATURES_LEADS_ONLY` |
| Website / Pipedrive identity | Site env (`WEBSITE_ID`, form name, etc.) |

Do not read production `.env.prod` from the developer laptop. Secrets stay on the host.

---

## 8. Short answers for Aaron

**Q: In which commit can I see the dashboard that used to load on the sites?**  
**A:** Checkout **`fba983f69031b315eb07939413d0e22fc35bf011`** (2026-07-30). Open Evolution at `/internal/operations/login`. That HTML UI was deleted the next day in **`4134247052815fd04b8992fe48aca31573c52d8a`**. Current code 404s those routes on purpose.

**Q: Which APIs can FLOW consume?**  
**A:** Per-domain `https://<domain>/api/internal/*` from `@connect/site-cms`, authenticated with that site’s `INTERNAL_JOB_SECRET`. Full catalog is in §5 above. GTM **writes** need the extra HMAC helper. PHP-file save is disabled (410).

**Q: Is the old dashboard still the CRM?**  
**A:** No. The old UI was a temporary per-site admin. The CRM/CMS for operators is FLOW. The sites only expose machine APIs + public contact/health.

---

## 9. Related repo docs

- `packages/site-cms/README.md` — bind + GTM HMAC details
- `docs/CONNECT-FLOW-SITE-ONBOARDING.md` — §4 FLOW API contract
- `docs/CONNECT-ASTRO-NEW-SITE-PLAYBOOK.md` — security / smoke
- `docs/FLEET-PORT-REGISTRY.md` — ports
- `docs/CURSOR-IMPORT-REDIRECTS.md` — redirect CSV until FLOW UI owns it
