# movey.ae — URLs from Rank Math sitemaps (source of truth)

Fetched from live:

- [page-sitemap.xml](https://movey.ae/page-sitemap.xml) — **8 pages**
- [post-sitemap.xml](https://movey.ae/post-sitemap.xml) — **92 posts**

Inventory: Rank Math sitemaps + **3 nav pages** (`about-us`, `contact-us`, `movey-faqs`) via `scripts/import-extra-pages.mjs`.

## Pages (11)

| URL |
|-----|
| https://movey.ae/about-us/ |
| https://movey.ae/contact-us/ |
| https://movey.ae/movey-faqs/ |
| https://movey.ae/apartment-movers-in-dubai/ |
| https://movey.ae/author/ |
| https://movey.ae/furniture-movers-in-dubai/ |
| https://movey.ae/house-movers-in-dubai/ |
| https://movey.ae/junk-removal-services/ |
| https://movey.ae/office-movers/ |
| https://movey.ae/single-item-movers-in-dubai/ |
| https://movey.ae/villa-movers-in-dubai/ |

## Posts (92)

See `post-sitemap.xml` or `src/data/sitemap-inventory.json` → `posts[]`.

Re-import from live:

```bash
pnpm --filter movey-ae-astro run import:sitemap:download
```

Only pages:

```bash
pnpm --filter movey-ae-astro run import:extra-pages
```

Only posts:

```bash
node scripts/import-from-sitemap.mjs --only posts --download --prepare
```
