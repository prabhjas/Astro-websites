#!/usr/bin/env node
/**
 * Migrate a live WordPress blog post into src/content/blog/<slug>.json
 * and download images into public/wp-content/uploads (deduped).
 *
 * Usage:
 *   node scripts/migrate-blog-post.mjs <slug-or-url> [--download]
 *   node scripts/migrate-blog-post.mjs --sitemap   # list sitemap URLs
 */
import { createWriteStream, readdirSync } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectgroup.co';
const SITEMAP_URL = `${ORIGIN}/post-sitemap1.xml`;
const CONCURRENCY = 6;
const PAGES_DIR = join(ROOT, 'src/pages');

const args = process.argv.slice(2).filter((a) => a !== '--');
const shouldDownload = args.includes('--download');
const input = args.find((a) => !a.startsWith('--'));

function slugifyHeading(text) {
  return text
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

  $('#root').find('h2, h3').each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || 'h2').toLowerCase();
    const level = tag === 'h3' ? 3 : 2;
    const text = extractHeadingText($el);
    if (!text) return;

    let id = $el.attr('id') || '';
    if (!id || id.startsWith('img-') || id.length > 120) {
      id = slugifyHeading(text);
      let n = 2;
      while (usedIds.has(id)) id = `${slugifyHeading(text)}-${n++}`;
    }
    usedIds.add(id);
    $el.attr('id', id);

    toc.push({ id, text, level });
    headings.push({ level: tag, text, id });
  });

  return { html: $('#root').html() || '', toc, headings };
}

function getReservedSlugs() {
  const reserved = new Set(['demo', 'status']);
  for (const name of readdirSync(PAGES_DIR)) {
    if (!name.endsWith('.astro')) continue;
    const base = name.replace(/\.astro$/, '');
    if (base === 'index') reserved.add('');
    else if (!base.startsWith('[')) reserved.add(base);
  }
  return reserved;
}

function toLocalPath(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  return pathname;
}

function decodeCfEmail(hex) {
  if (!hex || hex.length < 4) return '';
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
}

function decodeProtectedEmails(html) {
  let out = html.replace(
    /<span class="__cf_email__" data-cfemail="([^"]+)">[^<]*<\/span>/gi,
    (_, enc) => `<span class="__cf_email__">${decodeCfEmail(enc)}</span>`,
  );
  out = out.replace(/href="\/cdn-cgi\/l\/email-protection#[^"]+"/gi, 'href="mailto:contact@connectgroup.co"');
  return out;
}

function promoteLazyImages($, root) {
  root.find('img').each((_, img) => {
    const $img = $(img);
    const lazy = $img.attr('data-lazy-src');
    if (lazy) $img.attr('src', lazy);
    const lazySet = $img.attr('data-lazy-srcset');
    if (lazySet && !$img.attr('srcset')) $img.attr('srcset', lazySet);
    const lazySizes = $img.attr('data-lazy-sizes');
    if (lazySizes && !$img.attr('sizes')) $img.attr('sizes', lazySizes);
    $img.removeAttr('data-lazy-src data-lazy-srcset data-lazy-sizes');
  });
}

function cleanContentHtml(html) {
  const $ = cheerio.load(`<div id="wrap">${html}</div>`, { decodeEntities: false }, false);
  const root = $('#wrap').first();

  // Remove WP TOC plugins
  root.find('.wp-block-rank-math-toc-block, .rank-math-toc, #ez-toc-container, .ez-toc-container').remove();

  // Remove elementor editor artifacts
  root.find('[data-elementor-type="wp-post"]').removeAttr('data-elementor-type data-elementor-id');

  // Strip empty elementor motion wrappers noise — keep inner content
  promoteLazyImages($, root);

  // Rewrite connectgroup.co URLs to relative
  root.find('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.startsWith(ORIGIN)) $(a).attr('href', href.replace(ORIGIN, ''));
  });
  root.find('img[src]').each((_, img) => {
    const src = $(img).attr('src') || '';
    if (src.startsWith(ORIGIN)) $(img).attr('src', src.replace(ORIGIN, ''));
  });
  root.find('img[srcset]').each((_, img) => {
    const srcset = $(img).attr('srcset') || '';
    if (srcset.includes(ORIGIN)) $(img).attr('srcset', srcset.replaceAll(ORIGIN, ''));
  });

  return decodeProtectedEmails(root.html() || '');
}

function extractSchema(html) {
  const m = html.match(/<script[^>]*type="application\/ld\+json"[^>]*class="rank-math-schema-pro"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return undefined;
  try {
    return JSON.parse(m[1]);
  } catch {
    return undefined;
  }
}

function auditLinks($, root, reservedSlugs) {
  const links = [];
  const brokenInternal = [];
  const wordpressSpecific = [];
  const external = [];
  const unresolved = [];

  root.find('a[href]').each((_, a) => {
    const href = ($(a).attr('href') || '').trim();
    const text = $(a).text().replace(/\s+/g, ' ').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let type = 'external';
    if (href.includes('/wp-admin') || href.includes('/wp-login') || href.includes('xmlrpc')) {
      type = 'wordpress-admin';
      wordpressSpecific.push({ href, text, type });
    } else if (href.startsWith('/') || href.startsWith(ORIGIN)) {
      type = 'internal';
      const path = href.replace(ORIGIN, '').replace(/\/$/, '');
      const slug = path.replace(/^\//, '').split('/')[0];
      if (slug && !reservedSlugs.has(slug) && !path.startsWith('/wp-') && !path.startsWith('/category/') && !path.startsWith('/tag/') && !path.startsWith('/author/')) {
        // might be a blog post not yet migrated — flag for review
        unresolved.push({ href, text, type: 'internal' });
      }
    } else if (href.startsWith('http')) {
      external.push({ href, text, type: 'external' });
    }

    links.push({ href, text, type });
  });

  return { links, linkAudit: { brokenInternal, wordpressSpecific, external, unresolved } };
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(remoteUrl, destPath) {
  if (await fileExists(destPath)) return { status: 'skipped', remoteUrl, destPath };
  await mkdir(dirname(destPath), { recursive: true });
  const res = await fetch(remoteUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const file = createWriteStream(destPath);
  await pipeline(Readable.fromWeb(res.body), file);
  return { status: 'downloaded', remoteUrl, destPath };
}

async function localizeImages(html) {
  const urls = new Set();
  const re = /(?:src|srcset|data-lazy-src)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const val = m[1];
    for (const part of val.split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('/wp-content/') || u.startsWith(ORIGIN + '/wp-content/')) {
        urls.add(u.startsWith('http') ? u : ORIGIN + u);
      }
    }
  }

  const pending = [];
  const failed = [];

  for (const remote of urls) {
    const localPath = toLocalPath(remote);
    const dest = join(PUBLIC, localPath.replace(/^\//, ''));
    pending.push(
      downloadOne(remote, dest)
        .then((r) => r)
        .catch((e) => {
          failed.push({ remote, error: String(e) });
          return null;
        }),
    );
  }

  await Promise.all(pending);

  // Rewrite to relative paths
  let out = html.replaceAll(ORIGIN + '/wp-content/', '/wp-content/');
  out = out.replaceAll('https://connectgroup.co/wp-content/', '/wp-content/');

  return { html: out, downloaded: urls.size - failed.length, failed };
}

async function fetchPost(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return { html: await res.text(), finalUrl: res.url };
}

async function fetchRestPost(slug) {
  const res = await fetch(
    `${ORIGIN}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

function stripTags(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function parseSitemap(url = SITEMAP_URL) {
  const res = await fetch(url);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function parseAllSitemaps() {
  const urls1 = await parseSitemap(`${ORIGIN}/post-sitemap1.xml`);
  const urls2 = await parseSitemap(`${ORIGIN}/post-sitemap2.xml`);
  const seen = new Set();
  const all = [];
  for (const u of [...urls1, ...urls2]) {
    if (!seen.has(u)) {
      seen.add(u);
      all.push(u);
    }
  }
  return all;
}

function extractAuthorSlug(url) {
  if (!url) return undefined;
  const path = url.replace(ORIGIN, '');
  const m = path.match(/\/author\/([^/]+)/);
  return m ? m[1] : undefined;
}

async function migratePost(url, options = {}) {
  const downloadImages = options.download ?? shouldDownload;
  const quiet = options.quiet ?? false;
  const log = quiet ? () => {} : console.log.bind(console);

  const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
  log(`\nMigrating: ${slug}`);
  log(`  Source: ${url}`);

  const html = await fetchPost(url);
  const pageHtml = html.html;
  const redirected = html.finalUrl.replace(/\/$/, '') !== url.replace(/\/$/, '');
  const $ = cheerio.load(pageHtml, { decodeEntities: false });

  let title =
    $('[data-widget_type="theme-post-title.default"] h1').first().text().trim() ||
    $('title').text().replace(/\s*[-|].*$/, '').trim();

  let description = $('meta[name="description"]').attr('content') || '';
  let canonical = ($('link[rel="canonical"]').attr('href') || url).replace(/\/$/, '') + '/';
  const robots = $('meta[name="robots"]').attr('content');

  let publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[itemprop="datePublished"]').attr('datetime') ||
    new Date().toISOString();

  let modifiedAt =
    $('meta[property="article:modified_time"]').attr('content') ||
    $('meta[property="og:updated_time"]').attr('content') ||
    publishedAt;

  const categories = [];
  let authorName = 'Connect Group';
  let authorUrl;

  // Categories (main column only)
  const mainCol = $('.post-single .elementor-col-66').first();
  mainCol.find('[data-widget_type="post-info.default"] .elementor-post-info__terms-list-item').each((_, el) => {
    const $el = $(el);
    const name = $el.text().trim();
    if (!name) return;
    const catUrl = $el.attr('href');
    if (!categories.some((c) => c.name === name && c.url === catUrl)) {
      categories.push({ name, url: catUrl });
    }
  });

  // Author (main column) — preserve full widget HTML with icon
  let authorHtml = '';
  mainCol.find('[data-widget_type="post-info.default"]').each((_, el) => {
    const $el = $(el);
    if (!$el.find('.elementor-post-info__item--type-author').length) return;
    authorHtml = decodeProtectedEmails($.html($el)).replaceAll(ORIGIN, '');
    const authorTextEl = $el.find('.elementor-post-info__item--type-author').first();
    const cf = authorTextEl.find('[data-cfemail]').attr('data-cfemail') || authorTextEl.attr('data-cfemail');
    if (cf) authorName = decodeCfEmail(cf);
    else {
      const text = authorTextEl.text().replace(/\s+/g, ' ').trim();
      if (text && !text.includes('[email')) authorName = text;
    }
    const link = $el.find('[itemprop="author"] a').first();
    if (link.length) authorUrl = link.attr('href');
    return false;
  });

  if (authorName === 'Connect Group') {
    const metaAuthor = $('meta[name="twitter:data1"]').attr('content') || $('meta[name="author"]').attr('content');
    if (metaAuthor) authorName = metaAuthor;
  }

  let authorSlug = extractAuthorSlug(authorUrl);
  if (authorSlug && authorHtml) {
    authorHtml = authorHtml.replace(/href="[^"]*\/author\/[^"]+"/gi, `href="/author/${authorSlug}/"`);
  }
  if (authorSlug) {
    authorUrl = `/author/${authorSlug}/`;
  }

  const breadcrumb = [
    { name: 'Home', url: '/' },
    { name: 'Insights', url: '/insights/' },
    { name: title },
  ];

  let featuredImage = null;
  const featImg = $('[data-widget_type="theme-post-featured-image.default"] img').first();
  if (featImg.length) {
    const src =
      featImg.attr('data-lazy-src') ||
      featImg.attr('src') ||
      featImg.find('noscript img').attr('src') ||
      '';
  if (src && !src.startsWith('data:')) {
      featuredImage = {
        src: src.replace(ORIGIN, ''),
        alt: featImg.attr('alt') || '',
        originalUrl: src.startsWith('http') ? src : ORIGIN + src,
      };
    }
  }

  // Content — Elementor stores post body in nested wp-post markup
  const contentWidget = $('[data-widget_type="theme-post-content.default"]').first();
  const wpPost = contentWidget.find('[data-elementor-type="wp-post"]').first();
  let rawContent = '';
  if (wpPost.length) {
    rawContent = wpPost.html() || '';
  } else {
    rawContent = contentWidget.find('.elementor-widget-container').first().html() || contentWidget.html() || '';
  }

  let contentHtml = cleanContentHtml(rawContent);

  const processed = processContentHeadings(contentHtml);
  contentHtml = processed.html;

  // Fallback: live URL may 301 to a service page — use WP REST API for original post body
  if (!contentHtml || contentHtml.length < 100 || redirected) {
    const rest = await fetchRestPost(slug);
    if (rest?.content?.rendered) {
      log(`  Using WP REST API fallback${redirected ? ' (URL redirects on live site)' : ''}`);
      if (rest.title?.rendered) title = stripTags(rest.title.rendered);
      if (rest.excerpt?.rendered) description = stripTags(rest.excerpt.rendered);
      if (rest.date) publishedAt = rest.date;
      if (rest.modified) modifiedAt = rest.modified;
      if (rest.link) canonical = rest.link.endsWith('/') ? rest.link : `${rest.link}/`;

      const authorData = rest._embedded?.author?.[0];
      if (authorData) {
        authorName = authorData.name || authorName;
        authorSlug = authorData.slug || authorSlug;
        authorUrl = `/author/${authorSlug}/`;
      }

      if (!categories.length && rest._embedded?.['wp:term']?.[0]) {
        for (const term of rest._embedded['wp:term'][0]) {
          if (term.taxonomy === 'category') {
            categories.push({ name: term.name, slug: term.slug, url: `/category/${term.slug}/` });
          }
        }
      }

      const media = rest._embedded?.['wp:featuredmedia']?.[0];
      if (media?.source_url) {
        featuredImage = {
          src: media.source_url.replace(ORIGIN, ''),
          alt: media.alt_text || title,
          originalUrl: media.source_url,
        };
      }

      const restProcessed = processContentHeadings(cleanContentHtml(rest.content.rendered));
      contentHtml = restProcessed.html;
      processed.toc = restProcessed.toc;
      processed.headings = restProcessed.headings;
    }
  }

  // Images list
  const images = [];
  const $content = cheerio.load(`<div id="content">${contentHtml}</div>`, { decodeEntities: false }, false);
  const contentRoot = $content('#content').first();
  $content('img').each((_, img) => {
    images.push({
      src: $content(img).attr('src') || '',
      alt: $content(img).attr('alt') || '',
    });
  });

  const reserved = getReservedSlugs();
  const { links, linkAudit } = auditLinks($content, contentRoot, reserved);

  let imageStats = { downloaded: 0, failed: [] };
  if (downloadImages) {
    const r1 = await localizeImages(contentHtml);
    contentHtml = r1.html;
    imageStats = r1;

    if (featuredImage?.originalUrl) {
      try {
        const localPath = toLocalPath(featuredImage.originalUrl);
        const dest = join(PUBLIC, localPath.replace(/^\//, ''));
        await downloadOne(featuredImage.originalUrl, dest);
        featuredImage.src = localPath;
      } catch (e) {
        imageStats.failed.push({ remote: featuredImage.originalUrl, error: String(e) });
      }
    }
  }

  if (!description?.trim() && contentHtml) {
    const plain = stripTags(contentHtml).replace(/\s+/g, ' ').trim();
    description = plain.length > 220 ? `${plain.slice(0, 220).replace(/\s+\S*$/, '').trim()}…` : plain;
  }

  const post = {
    slug,
    title,
    description,
    canonical,
    robots,
    publishedAt,
    modifiedAt,
    author: { name: authorName, slug: authorSlug, url: authorUrl },
    authorHtml: authorHtml || undefined,
    breadcrumb,
    categories,
    featuredImage,
    contentHtml,
    toc: processed.toc,
    headings: processed.headings,
    images,
    links,
    linkAudit,
    og: {
      title: $('meta[property="og:title"]').attr('content') || title,
      description: $('meta[property="og:description"]').attr('content') || description,
      image: $('meta[property="og:image"]').attr('content'),
      type: $('meta[property="og:type"]').attr('content') || 'article',
    },
    twitter: {
      card: $('meta[name="twitter:card"]').attr('content'),
      title: $('meta[name="twitter:title"]').attr('content'),
      description: $('meta[name="twitter:description"]').attr('content'),
      image: $('meta[name="twitter:image"]').attr('content'),
    },
    schema: extractSchema(pageHtml),
    sourceUrl: url,
    migratedAt: new Date().toISOString(),
    imageMigration: imageStats,
  };

  await mkdir(BLOG_DIR, { recursive: true });
  const outPath = join(BLOG_DIR, `${slug}.json`);
  await writeFile(outPath, JSON.stringify(post, null, 2), 'utf8');
  log(`  Wrote ${outPath}`);
  log(`  TOC entries: ${processed.toc.length}`);
  log(`  Images: ${images.length}`);
  if (imageStats.failed?.length) {
    log(`  Image download failures: ${imageStats.failed.length}`);
  }
  if (linkAudit.unresolved.length) {
    log(`  Links to review: ${linkAudit.unresolved.length}`);
  }

  return post;
}

async function main() {
  if (input === '--sitemap') {
    const urls = await parseAllSitemaps();
    console.log(`Sitemap: ${urls.length} posts`);
    urls.slice(0, 20).forEach((u) => console.log(u));
    if (urls.length > 20) console.log(`... and ${urls.length - 20} more`);
    return;
  }

  if (!input) {
    console.error('Usage: node scripts/migrate-blog-post.mjs <slug-or-url> [--download]');
    process.exit(1);
  }

  const url = input.startsWith('http') ? input : `${ORIGIN}/${input.replace(/\/$/, '')}/`;
  await migratePost(url);
}

export {
  migratePost,
  parseSitemap,
  parseAllSitemaps,
  extractAuthorSlug,
  ORIGIN,
  BLOG_DIR,
  PUBLIC,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
