#!/usr/bin/env node
/**
 * Migrate KPM Pro posts from cleaned HTML mirrors into
 * src/content/blog/<slug>.json for the internal posts dashboard.
 *
 * Usage:
 *   node scripts/migrate-posts-from-legacy.mjs
 *   node scripts/migrate-posts-from-legacy.mjs --slug wage-protection-system
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const TAX_DIR = join(ROOT, 'src/content/taxonomies');
const INVENTORY = join(ROOT, 'src/data/sitemap-inventory.json');
const ORIGIN = 'https://www.payrollmiddleast.org';

const args = process.argv.slice(2);
const onlySlug = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractHeadingText($el) {
  const $clone = $el.clone();
  $clone.find('script, style, noscript, img, svg, picture, video, iframe, source').remove();
  const text = $clone.text().replace(/\s+/g, ' ').trim();
  if (!text || /<[a-z][\s\S]*>/i.test(text)) return '';
  return text;
}

function processContentHeadings(html) {
  const $ = cheerio.load(`<div id="root">${html}</div>`, { decodeEntities: false }, false);
  const toc = [];
  const headings = [];
  const usedIds = new Set();

  $('#root')
    .find('h2, h3')
    .each((_, el) => {
      const $el = $(el);
      const tag = (el.tagName || 'h2').toLowerCase();
      const level = tag === 'h3' ? 3 : 2;
      const text = extractHeadingText($el);
      if (!text) return;

      let id = $el.attr('id') || '';
      if (!id || id.startsWith('img-') || id.length > 120) {
        id = slugify(text);
        let n = 2;
        while (usedIds.has(id)) id = `${slugify(text)}-${n++}`;
      }
      usedIds.add(id);
      $el.attr('id', id);

      toc.push({ id, text, level });
      headings.push({ level: tag, text, id });
    });

  return { html: $('#root').html() || '', toc, headings };
}

function meta($, name) {
  const byName = $(`meta[name="${name}"]`).attr('content');
  if (byName) return byName.trim();
  const byProp = $(`meta[property="${name}"]`).attr('content');
  return byProp ? byProp.trim() : '';
}

function extractPost(slug, html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const titleTag = $('title').first().text().trim();
  const h1 = $('[data-widget_type="theme-post-title.default"] h1').first();
  const imprezaTitle = $('.w-post-elm.post_title, h1.entry-title, h1.post_title').first();
  const title =
    h1.text().trim() ||
    imprezaTitle.text().replace(/\s+/g, ' ').trim() ||
    titleTag.replace(/\s*[|\-–].*$/, '').trim() ||
    slug;

  const description =
    meta($, 'description') ||
    meta($, 'og:description') ||
    '';

  const publishedAt =
    meta($, 'article:published_time') ||
    new Date().toISOString();
  const modifiedAt =
    meta($, 'article:modified_time') ||
    publishedAt;

  const ogImage = meta($, 'og:image') || '';
  const featuredSrc = ogImage.startsWith('http')
    ? new URL(ogImage).pathname
    : ogImage;
  const featuredAlt =
    $('[data-widget_type="theme-post-featured-image.default"] img').attr('alt') ||
    $('.w-post-elm.post_image img').first().attr('alt') ||
    title;

  // Hello Elementor / Elementor Theme Builder
  const contentWidget = $('[data-widget_type="theme-post-content.default"]').first();
  let contentHtml = '';
  if (contentWidget.length) {
    const container = contentWidget.find('.elementor-widget-container').first();
    contentHtml = (container.length ? container.html() : contentWidget.html()) || '';
  }
  // Impreza / WPBakery single template (KPM Pro posts)
  if (!contentHtml.trim()) {
    const impreza = $('.w-post-elm.post_content').first();
    if (impreza.length) {
      contentHtml = impreza.html() || '';
    }
  }
  // Fallback: classic post content wrappers
  if (!contentHtml.trim()) {
    const classic = $('.post-content, .entry-content, article .content').first();
    if (classic.length) {
      contentHtml = classic.html() || '';
    }
  }

  const processed = processContentHeadings(contentHtml);

  const categories = [];
  // Prefer the post-info widget immediately after the title (single-post meta), not sidebar lists.
  const titleWidget = $('[data-widget_type="theme-post-title.default"]').first();
  let termsRoot = titleWidget.nextAll('[data-widget_type="post-info.default"]').first();
  if (!termsRoot.length) {
    termsRoot = $('[data-widget_type="post-info.default"]').first();
  }
  // Only the first terms list in that widget (avoid related-posts / footer taxonomies).
  termsRoot
    .find('.elementor-post-info__terms-list')
    .first()
    .find('.elementor-post-info__terms-list-item')
    .each((_, el) => {
      const name = $(el).text().replace(/\s+/g, ' ').trim();
      if (!name) return;
      const catSlug = slugify(name);
      if (!catSlug) return;
      categories.push({
        name,
        slug: catSlug,
        url: `/category/${catSlug}/`,
      });
    });

  // Impreza taxonomy links
  if (!categories.length) {
    $('.w-post-elm.post_taxonomy a[href*="/category/"]').each((_, el) => {
      const name = $(el).text().replace(/\s+/g, ' ').trim();
      if (!name) return;
      const href = $(el).attr('href') || '';
      const m = href.match(/\/category\/([^/]+)/);
      const catSlug = m ? m[1] : slugify(name);
      if (!catSlug) return;
      categories.push({
        name,
        slug: catSlug,
        url: `/category/${catSlug}/`,
      });
    });
  }

  // Deduplicate categories
  const seen = new Set();
  const uniqueCategories = categories.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });

  const authorHref = $('a[href*="/author/"]').first().attr('href') || '';
  let authorSlug = 'connect-staff';
  let authorName = 'KPM Pro';
  const authorMatch = authorHref.match(/\/author\/([^/]+)/);
  if (authorMatch) {
    authorSlug = authorMatch[1];
    authorName =
      $('a[href*="/author/"]').first().text().replace(/\s+/g, ' ').trim() || authorSlug;
  }

  const robots =
    $('meta[name="robots"]').attr('content') ||
    'index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large';

  const canonicalMeta = $('link[rel="canonical"]').attr('href') || `/${slug}/`;
  let canonical = canonicalMeta;
  try {
    canonical = canonical.startsWith('http')
      ? new URL(canonical).pathname
      : canonical;
  } catch {
    canonical = `/${slug}/`;
  }
  if (!canonical.endsWith('/')) canonical += '/';

  return {
    slug,
    title,
    description,
    canonical,
    robots,
    status: 'published',
    publishedAt: new Date(publishedAt).toISOString(),
    modifiedAt: new Date(modifiedAt).toISOString(),
    author: {
      name: authorName,
      slug: authorSlug,
      url: `/author/${authorSlug}/`,
    },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/insights/' },
      { name: title },
    ],
    categories: uniqueCategories,
    tags: [],
    featuredImage: featuredSrc
      ? {
          src: featuredSrc,
          alt: featuredAlt,
          originalUrl: featuredSrc,
        }
      : null,
    contentHtml: processed.html,
    toc: processed.toc,
    headings: processed.headings,
    images: [],
    links: [],
    linkAudit: {
      brokenInternal: [],
      wordpressSpecific: [],
      external: [],
      unresolved: [],
    },
    og: {
      title: meta($, 'og:title') || title,
      description: meta($, 'og:description') || description,
      image: featuredSrc || undefined,
      type: 'article',
    },
    twitter: {
      card: meta($, 'twitter:card') || 'summary_large_image',
      title: meta($, 'twitter:title') || title,
      description: meta($, 'twitter:description') || description,
      image: meta($, 'twitter:image') || featuredSrc || undefined,
    },
    sourceUrl: `${ORIGIN}/${slug}/`,
    migratedAt: new Date().toISOString(),
  };
}

async function upsertAuthor(author) {
  await mkdir(AUTHORS_DIR, { recursive: true });
  const path = join(AUTHORS_DIR, `${author.slug}.json`);
  if (existsSync(path)) return;
  await writeFile(
    path,
    JSON.stringify(
      {
        slug: author.slug,
        name: author.name,
        url: author.url,
        bio: '',
        avatar: null,
        migratedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

async function writeTaxonomies(posts) {
  const categories = new Map();
  const tags = new Map();
  for (const post of posts) {
    for (const c of post.categories || []) {
      categories.set(c.slug, {
        name: c.name,
        slug: c.slug,
        status: 'published',
        createdAt: new Date().toISOString(),
      });
    }
    for (const t of post.tags || []) {
      tags.set(t.slug, {
        name: t.name,
        slug: t.slug,
        status: 'published',
        createdAt: new Date().toISOString(),
      });
    }
  }
  await mkdir(TAX_DIR, { recursive: true });
  await writeFile(
    join(TAX_DIR, 'categories.json'),
    JSON.stringify([...categories.values()].sort((a, b) => a.slug.localeCompare(b.slug)), null, 2) +
      '\n',
  );
  await writeFile(
    join(TAX_DIR, 'tags.json'),
    JSON.stringify([...tags.values()].sort((a, b) => a.slug.localeCompare(b.slug)), null, 2) + '\n',
  );
}

async function main() {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8'));
  let slugs = inventory.posts.map((p) => p.slug);
  if (onlySlug) slugs = slugs.filter((s) => s === onlySlug);

  await mkdir(BLOG_DIR, { recursive: true });
  const migrated = [];
  let ok = 0;
  let fail = 0;

  for (const slug of slugs) {
    const legacyPath = join(LEGACY, `${slug}.cleaned.html`);
    if (!existsSync(legacyPath)) {
      console.warn('SKIP missing legacy HTML:', slug);
      fail++;
      continue;
    }
    try {
      const html = await readFile(legacyPath, 'utf8');
      const post = extractPost(slug, html);
      if (!post.contentHtml || post.contentHtml.length < 50) {
        console.warn('SKIP thin content:', slug, post.contentHtml.length);
        fail++;
        continue;
      }
      const outPath = join(BLOG_DIR, `${slug}.json`);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, JSON.stringify(post, null, 2) + '\n', 'utf8');
      await upsertAuthor(post.author);
      migrated.push(post);
      ok++;
      console.log('OK', slug, `(${post.contentHtml.length} chars, cats=${post.categories.length})`);
    } catch (err) {
      console.warn('FAIL', slug, err.message || err);
      fail++;
    }
  }

  await writeTaxonomies(migrated);
  console.log(`\nMigrated ${ok} posts, ${fail} failed/skipped`);
  console.log(`Blog JSON files: ${readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json')).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
