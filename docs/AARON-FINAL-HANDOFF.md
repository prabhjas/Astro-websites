# Aaron — final handoff (2026-08-26 wave)

**From:** developer presentation lane  
**Fleet tip now live:** `6edd7f7c5` (`astro-fleet-development`)  
**Developer branch:** `work/astro-sites` (has MBS + Redo + `packages/site-cms` ready; not all shipped)

You said only **envs / leads / Caddy** stay with you. Everything below is either blocked by the publisher for us, or still edge/env-owned.

---

## Shipped today (no action)

| Site | What | Live check |
|---|---|---|
| **spheavyrental.ae** | YAML redirects without env; exclude `power-generator-rental` from sitemap | `/power-generator-rental/` → **301** `/generator-rental/` · tip `6edd7f7c5` |
| **iberiaworkforce.com** | `/sitemap.xml` SSR 301 in source | tip live on homepage; **`/sitemap.xml` still backend** (see §3b) |
| **iberiaeor.com** | Insights load-more cards + `/eor-services/` chrome hide | tip `6edd7f7c5` |
| **kpmpro.ae** | Blog API `listing/` + `load-more/` + middleware `/api/` skip | `/api/blog/listing/` **200** |

---

## Needs you (owner lane)

### 1) `packages/site-cms` — Redo SEO normalize (**publisher blocked us**)

Automatic lane error:

`BLOCKED: automatic lane cannot change protected control/dependency path: packages/site-cms/…`

Ready on `work/astro-sites` (same as `f865df993` / `cb3d86586`):

- `packages/site-cms/src/seo/normalize-mirror-content-seo.ts` (**new**)
- `absolutize-mirror-seo.ts` + `index.ts` + test
- small `sanitize-html.ts` touch

**Ask:** release package on `astro-fleet-development`, then tell us — we ship **Redo.ae site files** next.

Doc detail: [AARON-REDO-SITE-CMS.md](AARON-REDO-SITE-CMS.md)

### 2) SP Heavy GTM `GTM-PL2CQ48T`

Needs prod `.env` `PUBLIC_GTM_ID=GTM-PL2CQ48T` and/or `INTERNAL_ADMIN_DIR/gtm.json` (`scripts/seed-gtm.mjs`). Loader already in layout.

### 3) SP / fleet robots still **backend**

After AP-02, `spheavyrental.ae/robots.txt` is still:

- `x-astro-fleet-route: backend`
- ~338-byte Aug-13 body

Git tip already has the full Tabish `public/robots.txt`. **Ask:** make source robots win at Caddy / clear stale backend override (fleet-wide robots wave depends on this).

### 3b) Iberia Workforce `/sitemap.xml` still **backend**

We shipped SSR `prerender = false` + **301** in `src/pages/sitemap.xml.ts`, but live still returns:

- `x-astro-fleet-route: backend`
- HTML meta-refresh body with `content-type: application/xml` (Chrome XML parse error)

Real sitemap works: https://iberiaworkforce.com/sitemap-index.xml  

**Ask:** route `/sitemap.xml` to front (or Caddy 301 → `/sitemap-index.xml`) so crawlers stop seeing fake XML.

### 4) Leads / contact `/api/` (non-blog) + Caddy / TLS

Unchanged — stay with you.

### 5) Connect Freelance favicon (edge)

Git tip already has **1257**-byte `favicon.ico`; live still serves **~655**. No site file diff left to publish. **Ask:** purge CF/edge cache for `/favicon.ico` (or confirm asset switch).

---

## Blocked for us until fixed (then we republish)

| Item | Why blocked | What’s ready |
|---|---|---|
| **Redo.ae** site SEO / routing / redirects | Astro check +51 vs baseline=0 without package `contentKind`; needs package first | On `work/astro-sites` |
| **MBS** Rajpal `438abd447` authors/contact | Astro check 23→25 (+ `whatsappUrl`, author `title`, etc.) | On `work/astro-sites`; omit until check baseline clean |
| **Fleet-wide robots (AP-06)** | Edge still backend on SP; mega-stash unsafe (deletes many `public/robots.txt`) | Do per-site `public/robots.txt` waves of ≤8 **after** edge serves source |

---

## Paste-ready

```text
Aaron — final handoff after tip 6edd7f7c5:

Shipped by us: SP redirect+sitemap exclude, Iberia WF sitemap route, Iberia EOR load-more/chrome, KPM blog API.

Still need you:
1) packages/site-cms normalize (publisher blocked automatic lane) — then we ship Redo site
2) SP GTM-PL2CQ48T env / gtm.json seed
3) Robots still backend on SP despite AP-02 + new public/robots.txt in git — please fix edge
3b) Iberia Workforce /sitemap.xml still backend HTML-as-XML — please front route or Caddy 301 → /sitemap-index.xml
4) CF favicon edge cache (git tip already correct bytes)
5) Leads APIs + Caddy as usual

MBS authors/contact ready on work/astro-sites but Astro check regressions — we will republish after types fixed or baseline waived.
Docs: docs/AARON-FINAL-HANDOFF.md
```
