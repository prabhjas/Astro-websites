# SEO & AI crawler audit remediation (2026-08-06 → 15 live sites)

**Source PDF:** `Astro_SEO_AI_Crawler_Audit_Live_Caddy_Sites_2026-08-06.pdf`  
**Original PDF scope:** 5 sites (CBSS, Connect Group, Evolution, Iberia Workforce, SP Heavy)  
**Fleet scope (this tracker):** all **15 live** Astro sites  
**Companion:** [10-GO-LIVE-VERIFY-CHECKLIST.md](./10-GO-LIVE-VERIFY-CHECKLIST.md) · [00-NEW-SITE-MASTER.md](./00-NEW-SITE-MASTER.md) Phase 05  
**Security (separate):** [SECURITY-AARON-FULL-HANDOFF-2026-08-07.md](./SECURITY-AARON-FULL-HANDOFF-2026-08-07.md)

This is **technical discoverability** (crawlers, robots, sitemaps, canonicals, metadata, JSON-LD, `llms.txt`) — not copy/keyword work.

---

## 1. Live baseline (2026-08-07 public HTTPS)

| Domain | home | robots | llms | sitemap | title | canonical | og:image | twitter:card | JSON-LD |
|--------|------|--------|------|---------|-------|-----------|----------|--------------|---------|
| cbss.ae | 200 | 200 | 200 | 200 | ✓ | ✓ | ✗ → **fixed in app** | ✗ → **fixed** | ✓ |
| connectgroup.co | 200 | 200 | 200 | 200 | ✓ | ✓ | ✗ → **fixed in app** | ✓ | ✓ |
| www.evolutionmiddleast.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ (absolute IDs in app) |
| iberiaworkforce.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| spheavyrental.ae | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| connecthr.ae | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| connectfm.ae | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| connectresources.sa | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| iberiaeor.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| eormiddleast.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| connectstaff.ae | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| c-uae.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| kinzahr.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| connectfz.com | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |
| royalvisa.ae | 200 | 200 | 200 | 200 | ✓ | ✓ | ✓ | ✓ | ✓ |

All 15 already serve robots + llms + a sitemap + title/canonical/JSON-LD on the homepage. Gaps called out in the PDF were concentrated on **CBSS** (social meta + AI-bot edge) and **Connect Group / Evolution** (share image / relative schema IDs).

---

## 2. Priority map (PDF §4–§13 expanded to 15)

### P0 — ops / Cloudflare (not app-only)

| ID | Item | Owner | Status |
|----|------|-------|--------|
| **SEO-P0-1** | CBSS AI crawler 403 vs permissive robots — verify genuine OAI-SearchBot / Claude-SearchBot / PerplexityBot in Cloudflare; allow AI **search** bots if desired; keep training bots per policy | Aaron / CF admin | **Open** |
| **SEO-P0-2** | Document crawler policy by purpose (search vs AI search vs training) for the whole fleet | Aaron + eng | **Open** (policy decision) |

### P1 — app (7-day PDF items) — engineering

| ID | Item | Sites | Status |
|----|------|-------|--------|
| **SEO-P1-1** | Add Open Graph + Twitter + absolute share image | cbss.ae | **Done** (`BaseLayout.astro`) |
| **SEO-P1-2** | Add homepage `og:image` / `twitter:image` | connectgroup.co | **Done** (`absolutizeMirrorSeoHtml` + default Frame.png) |
| **SEO-P1-3** | Absolute JSON-LD `@id` / `url` + absolute `og:image` on mirrors | connectgroup, evolution, kinza, connectstaff, connectresources.sa, royalvisa | **Done** (shared `@connect/site-cms` helper) |
| **SEO-P1-4** | Accurate sitemap `lastmod` where CMS/file dates exist; omit if unknown | cbss, iberiaworkforce (missing); others partial | **Tracked** — do not invent dates |
| **SEO-P1-5** | Remove stale WP-era robots rules when paths gone | per site `robots.txt` | **Tracked** |
| **SEO-P1-6** | Iberia EN/ES hreflang remains reference — do not regress | iberiaworkforce | **Preserve** |

### P2 — 30-day / monitoring

| ID | Item | Status |
|----|------|--------|
| Rendered-HTML SEO regression checks (title, canonical, og:url, share image, lang) | Tracked |
| Batch sitemap URL validation (200, self-canonical, indexable) | Tracked |
| GSC + Bing + CF bot monthly review | Ops |
| Do **not** treat CSP enforce / aggressive mirror sanitize as SEO work | See security handoff |

---

## 3. What we implemented in code (2026-08-07)

| Change | Where |
|--------|--------|
| Shared `absolutizeMirrorSeoHtml()` | `packages/site-cms/src/seo/absolutize-mirror-seo.ts` |
| CBSS OG/Twitter tags | `Astro-production/cbss.ae/src/layouts/BaseLayout.astro` |
| Connect Group default homepage share image | `connectgroup.co/src/lib/legacy-page.js` |
| Mirror sites use shared absolutizer | connectgroup, evolution, kinzahr, connectstaff, connectresources.sa, royalvisa |

**Safe rules (same spirit as security handoff):**

- Fix **metadata / absolute URLs / schema IDs** — do not strip Elementor inline scripts.
- Prefer smaller accurate JSON-LD over inventing FAQ/ratings markup.
- `llms.txt` stays curated brand links — not a full sitemap dump.

---

## 4. Acceptance checklist (all 15)

Copy of PDF §13, fleet-wide:

- [ ] Googlebot / Bingbot get 200 HTML on canonical pages; robots + sitemap 200 without challenge
- [ ] Allowed AI search bots (if policy says allow) get real content from **verified** vendor IPs — CBSS verified in CF
- [ ] Unknown routes → real 404/410 (no homepage soft-404)
- [ ] Sitemap = final HTTPS, 200, indexable, self-canonical URLs only
- [ ] `lastmod` only when content truly changed
- [ ] Translated pages: reciprocal hreflang + intentional x-default (Iberia pattern)
- [ ] Indexable page: one title, one canonical, nonconflicting robots, intentional description/share image
- [ ] Representative JSON-LD validates; images absolute HTTPS
- [ ] `/llms.txt` → 200 `text/plain`, brand-correct canonical links only
- [ ] GSC / Bing sitemap fetch OK

---

## 5. Future sites (gate)

Add to every new domain before go-live ([00-NEW-SITE-MASTER.md](./00-NEW-SITE-MASTER.md) Phase 05):

1. robots + sitemap + llms 200  
2. Absolute canonical + og:url + og:image (+ twitter) on homepage  
3. Organization `@id` absolute (`https://domain/#organization` or Rank Math absolutized via `absolutizeMirrorSeoHtml`)  
4. No soft-404; preserve Iberia-style hreflang if multilingual  
5. Do not invent `lastmod`  
6. CBSS-style AI-bot CF check if the zone uses aggressive bot rules  

---

## 6. Aaron one-liner (SEO P0)

```text
Please verify CBSS Cloudflare bot rules for genuine OAI-SearchBot / Claude-SearchBot /
PerplexityBot (vendor IP / verified-bot — not UA string alone). If AI search visibility
is desired, allow those on public GET/HEAD + robots + sitemap before generic blocks.
Document search vs AI-search vs training policy for the 15-site fleet.
App fixes for OG/share image + absolute schema IDs are on work/astro-sites.
```
