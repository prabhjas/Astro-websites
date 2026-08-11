# c-uae.com GSC coverage drilldown — spam / malware audit (2026-08-10)

**Source sheet:** `c-uae.com-Coverage-Drilldown-2026-08-10.xlsx` (SEO team)  
**GSC issue label:** Page with redirect  
**Astro content store:** `Astro-production/c-uae.com/src/data/{pages,posts}.json`

## Verdict

| Finding | Count |
|---------|------:|
| URLs in sheet | 1000 |
| Casino / gambling SEO-spam style paths | **656** |
| Those spam paths present in Astro `posts.json` / `pages.json` | **0** |
| Sheet paths that match current Astro pages/posts | **4** (legitimate) |
| Suspicious outbound malware links inside current Astro HTML | **0** (1 benign external image URL only) |

**Conclusion:** The spam/casino URLs are **not** in the live Astro content store. They are historical WordPress spam (or old index URLs) that Google Search Console still lists under “Page with redirect”. They do **not** indicate malware inside current `posts.json` / `pages.json`.

## What to do (SEO / ops)

1. Confirm on live Astro that spam paths **404** (or 410) — they should already, since they are not in the content store.
2. In GSC: use **Removals** / wait for crawl drop after 404/410; optionally add explicit `410` redirects for the worst clusters if crawl budget matters.
3. Do **not** re-import these slugs from any old WP dump into Astro.
4. If any spam still resolves on a leftover WP origin, take that origin offline or purge those posts there separately.

## Sample spam slugs (sheet only — not in Astro)

- `/the-fresh-new-ports-2020-gambler-journal-purely-harbors-mag-casino-gaming-tips/`
- `/online-casinos-2026-better-real-cash-casinos-on-the-internet/`
- `/top-ten-rated-mobile-casinos-with-totally-free-spins-also-offers-2026/`
- (650+ similar multilingual casino / slots / no-deposit paths)

## Clean content check

Astro store sizes at audit time: **72** pages, **242** posts. No casino/gambling slug or title matched in the store.
