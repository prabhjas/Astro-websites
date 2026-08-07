# SEO & AI crawler — full handoff (15 live sites)

**One document for:** final status vs `Astro_SEO_AI_Crawler_Audit_Live_Caddy_Sites_2026-08-06.pdf`, what engineering finished, what Aaron still owns, and the gate for the **next 6 websites**.

| | |
|--|--|
| **Source PDF** | `Astro_SEO_AI_Crawler_Audit_Live_Caddy_Sites_2026-08-06.pdf` (originally 5 sites) |
| **Fleet scope** | All **15 live** Astro sites (same set as security batch) |
| **Branch / commit** | `work/astro-sites` · SEO app fix `223fbee9` (+ prior security) |
| **Security companion** | [SECURITY-AARON-FULL-HANDOFF-2026-08-07.md](./SECURITY-AARON-FULL-HANDOFF-2026-08-07.md) |
| **New-site lifecycle** | [00-NEW-SITE-MASTER.md](./00-NEW-SITE-MASTER.md) Phase 05 |
| **Go-live curls** | [10-GO-LIVE-VERIFY-CHECKLIST.md](./10-GO-LIVE-VERIFY-CHECKLIST.md) §2 |

**Verdict (engineering):** Everything the PDF asked for that is **app/code** is **done** for the 15 live sites. What remains is **Cloudflare / Search Console / policy / monitoring** — not blocking the next 6 site builds if they follow the gate in §6.

---

## 1. The 15 live sites

1. evolutionmiddleast.com  
2. cbss.ae  
3. spheavyrental.ae  
4. iberiaworkforce.com  
5. connecthr.ae  
6. connectgroup.co  
7. connectfm.ae  
8. connectresources.sa  
9. iberiaeor.com  
10. eormiddleast.com  
11. connectstaff.ae  
12. c-uae.com  
13. kinzahr.com  
14. connectfz.com  
15. royalvisa.ae  

---

## 2. PDF checklist → status (honest)

### Already healthy before this pass (all 15 live)

Confirmed on public HTTPS (2026-08-07): homepage **200**, `/robots.txt` **200**, `/llms.txt` **200**, sitemap **200**, title + canonical + JSON-LD present. No catch-all soft-404 in sampled checks.

### PDF “within 7 days” — engineering (DONE)

| PDF ask | Status | Where |
|---------|--------|--------|
| CBSS Open Graph + Twitter + share image | **Done** | `cbss.ae/src/layouts/BaseLayout.astro` |
| Connect Group homepage `og:image` | **Done** | Inject via `absolutizeMirrorSeoHtml` + Frame.png |
| Absolute structured-data `@id` / URLs (CG + Evolution; extended to other mirrors) | **Done** | `@connect/site-cms` → `absolutizeMirrorSeoHtml` |
| Preserve Iberia EN/ES hreflang | **Preserve** (no regression) | iberiaworkforce.com |
| SP Heavy / Evolution / Iberia sampled social meta | **Already OK** | No code change required |
| Do not invent sitemap `lastmod` | **Policy kept** | Omit unless real dates exist |

### PDF “within 24 hours” / edge — Aaron (NOT app)

| PDF ask | Status | Owner |
|---------|--------|--------|
| Confirm CBSS AI agents (OAI-SearchBot / Claude-SearchBot / PerplexityBot) vs 403 | **Open** | Aaron / Cloudflare |
| Decide search vs AI-search vs training crawler policy | **Open** | Business + Aaron |
| GSC URL Inspection for CBSS homepage/sitemap | **Open** | Aaron / marketing |

### PDF “within 30 days” — monitoring (NOT required before next 6)

| PDF ask | Status |
|---------|--------|
| Automated rendered-HTML SEO regression per URL | Tracked (future) |
| Batch sitemap 200 / self-canonical audits | Tracked (future) |
| Monthly GSC + Bing + CF bot review | Ops |

### Explicitly out of scope (do not mix with SEO)

| Item | Why |
|------|-----|
| CSP **enforce** | Breaks GTM/Elementor — security handoff |
| Aggressive mirror script strip | Breaks menus/sliders — security handoff |
| Broad prerender / full WP SRI | Separate migrations |

---

## 3. Local final verify (2026-08-07)

| Check | Result |
|-------|--------|
| CBSS `:5081` og:image + twitter | **PASS** |
| Connect Group `:5085` og:image + absolute `@id` | **PASS** |
| Evolution `:5080` absolute `@id` + og:image | **PASS** |
| Iberia / SP Heavy homepage meta | **PASS** |
| Soft-404 (unknown path) CBSS / CG / Evolution | **404** (correct) |
| Helper present on mirror live sites | connectgroup, evolution, kinza, connectstaff, connectresources.sa, royalvisa |

---

## 4. Code map (what shipped)

| Piece | Path |
|-------|------|
| Shared absolutizer | `packages/site-cms/src/seo/absolutize-mirror-seo.ts` |
| Export | `packages/site-cms/src/index.ts` → `absolutizeMirrorSeoHtml` |
| CBSS social tags | `Astro-production/cbss.ae/src/layouts/BaseLayout.astro` |
| Connect Group default OG | `connectgroup.co/src/lib/legacy-page.js` (`DEFAULT_OG_IMAGE`) |
| Mirror wiring | `legacy-page.js` on connectgroup, evolution, kinzahr, connectstaff, connectresources.sa, royalvisa |

**Rule for mirrors:** absolutize SEO URLs/IDs only — never strip Elementor inline scripts/`on*` (see security handoff).

---

## 5. Aaron message (SEO leftovers only)

```text
SEO audit leftovers (app side is done on work/astro-sites):

1) CBSS — verify Cloudflare for genuine OAI-SearchBot / Claude-SearchBot /
   PerplexityBot (verified-bot / vendor IP, not UA alone). If AI search visibility
   is wanted, allow public GET/HEAD + robots.txt + sitemap before generic blocks.
2) Document fleet crawler policy: search vs AI-search vs training.
3) Confirm GSC can fetch CBSS homepage + sitemap.

Do not enforce CSP or strip mirror inline scripts as part of SEO work.
```

Short security ops remain in [SECURITY-OPS-AARON-HANDOFF.md](./SECURITY-OPS-AARON-HANDOFF.md).

---

## 6. Gate for the next 6 websites

Before marking any new site ready, require:

1. `/robots.txt`, sitemap(s), `/llms.txt` → **200** `text/plain` / XML as appropriate  
2. Homepage: title, description, absolute canonical, **`og:image`** (+ Twitter)  
3. If WP/Elementor mirror: wire `absolutizeMirrorSeoHtml({ siteOrigin, path })`  
4. Real **404** for unknown routes (no soft-404)  
5. Absolute Organization / Rank Math `@id` (helper or layout schema)  
6. No invented `lastmod`  
7. If Cloudflare bot rules are aggressive: same AI-search verify as CBSS  
8. Do **not** enable CSP enforce or aggressive mirror sanitizer  

Also follow [00-NEW-SITE-MASTER.md](./00-NEW-SITE-MASTER.md) Phase 05–07 (SEO + security harden).

---

## 7. One-line summary

**Engineering complete for the SEO/AI crawler PDF on all 15 live sites** (social meta, absolute schema IDs, fleet baseline). **Aaron still owns CBSS AI-bot CF verify + crawler policy + GSC.** Next 6 sites must pass §6 before go-live.
