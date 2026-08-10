# snapsale.ae — URLs from Rank Math sitemaps (source of truth)

Fetched from live:

- [page-sitemap.xml](https://snapsale.ae/page-sitemap.xml) — **8 pages**
- [post-sitemap.xml](https://snapsale.ae/post-sitemap.xml) — **92 posts**

Inventory: Rank Math sitemaps + **3 nav pages** (`about-us`, `contact-us`, `snapsale-faqs`) via `scripts/import-extra-pages.mjs`.

## Pages (11)

| URL |
|-----|
| https://snapsale.ae/about-us/ |
| https://snapsale.ae/contact-us/ |
| https://snapsale.ae/snapsale-faqs/ |
| https://snapsale.ae/apartment-movers-in-dubai/ |
| https://snapsale.ae/author/ |
| https://snapsale.ae/furniture-movers-in-dubai/ |
| https://snapsale.ae/house-movers-in-dubai/ |
| https://snapsale.ae/junk-removal-services/ |
| https://snapsale.ae/office-movers/ |
| https://snapsale.ae/single-item-movers-in-dubai/ |
| https://snapsale.ae/villa-movers-in-dubai/ |

## Posts (92)

See `post-sitemap.xml` or `src/data/sitemap-inventory.json` → `posts[]`.

Re-import from live:

```bash
pnpm --filter snapsale-ae-astro run import:sitemap:download
```

Only pages:

```bash
pnpm --filter snapsale-ae-astro run import:extra-pages
```

Only posts:

```bash
node scripts/import-from-sitemap.mjs --only posts --download --prepare
```
