#!/usr/bin/env node
/**
 * Build src/data/posts-index.json from cleaned HTML mirrors + sitemap inventory.
 * Used by /api/blog/* listing, CAF, and law load-more (replaces WP admin-ajax).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INV = join(ROOT, 'src/data/sitemap-inventory.json');
const LEGACY = join(ROOT, 'src/legacy');
const OUT = join(ROOT, 'src/data/posts-index.json');

/** WP category IDs from /blogs/ CAF filter sidebar (data-id). */
export const CAF_CATEGORY_BY_ID = {
  44: { id: 44, name: 'Accountants Services', slug: 'accountants-services' },
  17: { id: 17, name: 'Business', slug: 'business' },
  37: { id: 37, name: 'Immigration Services', slug: 'immigration-services' },
  40: { id: 40, name: 'Legal Services', slug: 'legal-services' },
  150: { id: 150, name: 'News', slug: 'news' },
  121: { id: 121, name: 'Payroll Services', slug: 'payroll-services' },
  190: { id: 190, name: 'PRO Service', slug: 'pro-service' },
  14: { id: 14, name: 'Remote Working', slug: 'remote-working' },
  191: { id: 191, name: 'test', slug: 'test' },
  1: { id: 1, name: 'Uncategorized', slug: 'uncategorized' },
  23: { id: 23, name: 'Visa Services', slug: 'visa-services' },
};

const CAF_BY_NAME = Object.fromEntries(
  Object.values(CAF_CATEGORY_BY_ID).map((c) => [c.name.toLowerCase(), c]),
);
const CAF_BY_SLUG = Object.fromEntries(
  Object.values(CAF_CATEGORY_BY_ID).map((c) => [c.slug, c]),
);

function loadCleaned(slug) {
  // Nested CPT paths: law/foo → src/legacy/law/foo.cleaned.html
  const nested = join(LEGACY, ...String(slug).split('/')) + '.cleaned.html';
  if (existsSync(nested)) return readFileSync(nested, 'utf8');
  const flat = join(LEGACY, `${slug}.cleaned.html`);
  if (existsSync(flat)) return readFileSync(flat, 'utf8');
  return null;
}

function text($, el) {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function absolutizeLocal(src) {
  if (!src) return '';
  src = src.trim();
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('http')) {
    try {
      const u = new URL(src);
      if (u.hostname.includes('companyformationsaudi.com')) return u.pathname;
    } catch {
      /* ignore */
    }
    return src;
  }
  return src.startsWith('/') ? src : `/${src}`;
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCategory(name, href = '') {
  const n = (name || '').trim();
  if (!n) return null;
  const byName = CAF_BY_NAME[n.toLowerCase()];
  if (byName) return { ...byName };
  const slugFromHref = href.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
  const s = slugFromHref || slugify(n);
  const bySlug = CAF_BY_SLUG[s];
  if (bySlug) return { ...bySlug };
  return { id: 0, name: n, slug: s };
}

function publicUrl(slug, kind) {
  if (kind === 'law') return `/${slug.replace(/^\/+|\/+$/g, '')}/`;
  return `/${String(slug).replace(/^\/+|\/+$/g, '')}/`;
}

function extractMeta(slug, html, kind) {
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text() ||
    $('h1').first().text() ||
    slug;
  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';
  let image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('article img, .elementor-widget-theme-post-featured-image img, .post-thumbnail img')
      .first()
      .attr('src') ||
    '';
  image = absolutizeLocal(image);

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    '';
  const modifiedAt =
    $('meta[property="article:modified_time"]').attr('content') || publishedAt;

  /** @type {{id:number,name:string,slug:string}[]} */
  const categories = [];
  const pushCat = (cat) => {
    if (!cat) return;
    if (categories.some((c) => c.slug === cat.slug || (cat.id && c.id === cat.id))) return;
    categories.push(cat);
  };

  $('meta[property="article:section"]').each((_, el) => {
    pushCat(resolveCategory($(el).attr('content') || ''));
  });
  $('a[rel="category tag"], .elementor-post-info__terms-list a, .cat-links a, .rank-math-breadcrumb a').each(
    (_, el) => {
      const href = $(el).attr('href') || '';
      if (!/\/category\//i.test(href) && !$(el).attr('rel')?.includes('category')) return;
      pushCat(resolveCategory(text($, el), href));
    },
  );
  // JSON-LD Article / BreadcrumbList
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      if (!raw) return;
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const art =
          node['@type'] === 'Article' || node['@type'] === 'BlogPosting' ? node : null;
        if (art?.articleSection) {
          const sections = Array.isArray(art.articleSection)
            ? art.articleSection
            : [art.articleSection];
          for (const s of sections) pushCat(resolveCategory(String(s)));
        }
        if (node['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
          for (const item of node.itemListElement) {
            const name = item?.item?.name || item?.name || '';
            const href = item?.item?.['@id'] || item?.item?.id || '';
            if (href && /\/category\//i.test(String(href))) pushCat(resolveCategory(name, href));
          }
        }
      }
    } catch {
      /* ignore bad JSON-LD */
    }
  });

  const cleanTitle =
    title.replace(/\s*[|\-–—]\s*Company Formation Saudi.*/i, '').trim() || title.trim();

  return {
    slug,
    kind,
    title: cleanTitle,
    description: description.trim(),
    image,
    publishedAt: publishedAt || modifiedAt || '',
    modifiedAt: modifiedAt || publishedAt || '',
    categories,
    url: publicUrl(slug, kind),
    author: 'Company Formation Saudi',
  };
}

function extractLawListingOrder() {
  const page = join(LEGACY, 'law.cleaned.html');
  if (!existsSync(page)) return [];
  const html = readFileSync(page, 'utf8');
  const $ = cheerio.load(html);
  const slugs = [];
  $('.ecs-posts article.ecs-post-loop a[href*="/law/"]').each((_, el) => {
    const href = ($(el).attr('href') || '').split('?')[0].replace(/\/$/, '');
    const m = href.match(/\/law\/([^/]+)$/);
    if (!m) return;
    const slug = `law/${decodeURIComponent(m[1])}`;
    if (!slugs.includes(slug)) slugs.push(slug);
  });
  return slugs;
}

function main() {
  const inv = JSON.parse(readFileSync(INV, 'utf8'));
  const posts = [];
  const law = [];
  let missing = 0;

  const lawSlugs = new Set((inv.law || []).map((l) => l.slug));

  for (const item of inv.posts || []) {
    if (lawSlugs.has(item.slug)) continue;
    if (String(item.slug).startsWith('law/') || String(item.slug).startsWith('ar/law/')) continue;
    const html = loadCleaned(item.slug);
    if (!html) {
      missing++;
      continue;
    }
    posts.push(extractMeta(item.slug, html, 'post'));
  }

  for (const item of inv.law || []) {
    // English listing only (AR mirrors optional separately)
    if (String(item.slug).startsWith('ar/')) continue;
    const html = loadCleaned(item.slug);
    if (!html) {
      missing++;
      continue;
    }
    law.push(extractMeta(item.slug, html, 'law'));
  }

  const byDate = (a, b) => {
    const da = Date.parse(a.publishedAt || a.modifiedAt || 0) || 0;
    const db = Date.parse(b.publishedAt || b.modifiedAt || 0) || 0;
    return db - da;
  };
  posts.sort(byDate);

  // Keep /law/ Load More contiguous with the static first page widgets.
  const listingOrder = extractLawListingOrder();
  const lawBySlug = new Map(law.map((p) => [p.slug, p]));
  const orderedLaw = [];
  for (const s of listingOrder) {
    const p = lawBySlug.get(s);
    if (p) {
      orderedLaw.push(p);
      lawBySlug.delete(s);
    }
  }
  const rest = [...lawBySlug.values()].sort(byDate);
  const lawFinal = [...orderedLaw, ...rest];

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        categories: Object.values(CAF_CATEGORY_BY_ID),
        posts,
        law: lawFinal,
        counts: { posts: posts.length, law: lawFinal.length, missing },
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        posts: posts.length,
        law: lawFinal.length,
        lawPage1: listingOrder.length,
        missing,
        out: OUT,
      },
      null,
      2,
    ),
  );
}

main();
