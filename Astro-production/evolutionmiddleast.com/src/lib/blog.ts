/**
 * Blog post types, TOC builder, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { injectRuntimeGtmLoader } from './gtm/inject';

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, 'src/content/blog');
const SHELL_PATH = join(ROOT, 'src/legacy/blog-shell/template.html');
const ORIGIN = 'https://www.evolutionmiddleast.com';

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface BlogImage {
  src: string;
  alt: string;
  originalUrl?: string;
}

export interface BlogLink {
  href: string;
  text: string;
  type: 'internal' | 'external' | 'wordpress-admin' | 'anchor';
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical: string;
  robots?: string;
  publishedAt: string;
  modifiedAt: string;
  author: {
    name: string;
    slug?: string;
    url?: string;
  };
  authorHtml?: string;
  breadcrumb?: Array<{ name: string; url?: string }>;
  categories: Array<{ name: string; slug?: string; url?: string }>;
  tags?: Array<{ name: string; slug: string; url?: string }>;
  featuredImage: BlogImage | null;
  contentHtml: string;
  toc: TocEntry[];
  headings: Array<{ level: string; text: string; id: string }>;
  images: BlogImage[];
  links: BlogLink[];
  linkAudit: {
    brokenInternal: BlogLink[];
    wordpressSpecific: BlogLink[];
    external: BlogLink[];
    unresolved: BlogLink[];
  };
  og: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  schema?: Record<string, unknown>;
  sourceUrl: string;
  migratedAt: string;
}

/** Slugs reserved by static Astro pages — blog dynamic route must not override these. */
export function getReservedSlugs(): Set<string> {
  const pagesDir = join(ROOT, 'src/pages');
  const reserved = new Set<string>(['demo', 'status']);
  if (!existsSync(pagesDir)) return reserved;

  for (const name of readdirSync(pagesDir)) {
    if (!name.endsWith('.astro')) continue;
    const base = name.replace(/\.astro$/, '');
    if (base === 'index') reserved.add('');
    else if (!base.startsWith('[')) reserved.add(base);
  }
  return reserved;
}

/**
 * Only posts with status "published" (or no status field, for legacy posts)
 * are visible on the live frontend. Draft and trashed posts are admin-only.
 */
function isPublishedPost(post: { status?: string }): boolean {
  const st = (post.status || 'published').toLowerCase();
  return st === 'published';
}

export function getAllBlogSlugs(): string[] {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((slug) => {
      const post = getRawBlogPost(slug);
      return post ? isPublishedPost(post) : false;
    });
}

/** Read a blog post JSON without filtering by status (used internally). */
export function getRawBlogPost(slug: string): BlogPost | null {
  const path = join(BLOG_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as BlogPost;
}

/**
 * Get a blog post for frontend rendering. Returns null for draft/trashed posts.
 * Use getRawBlogPost() for admin/dashboard access.
 */
export function getBlogPost(slug: string): BlogPost | null {
  const post = getRawBlogPost(slug);
  if (!post) return null;
  return isPublishedPost(post) ? post : null;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract readable heading text for TOC.
 * WP lazy-load often wraps images in <h2>/<h3> with <noscript> containing raw <img> markup;
 * cheerio's .text() then returns that HTML. Strip media/noscript and skip image-only headings.
 */
export function extractHeadingText($el: any): string {
  const $clone = $el.clone();
  $clone.find('script, style, noscript, img, svg, picture, video, iframe, source').remove();
  let text = $clone.text().replace(/\s+/g, ' ').trim();

  // Reject leftover markup (e.g. raw <img ...> leaked as text)
  if (!text || /<[a-z][\s\S]*>/i.test(text)) return '';
  return text;
}

export function sanitizeTocEntry(entry: TocEntry): TocEntry | null {
  const text = String(entry?.text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || /<[a-z]/i.test(String(entry?.text || ''))) return null;
  if (/^img\b/i.test(text) && text.includes('src=')) return null;
  const id = String(entry?.id || '').trim();
  if (!id || id.startsWith('img-')) return null;
  return { id, text, level: entry.level === 3 ? 3 : 2 };
}

/** Add/preserve heading IDs and build TOC from H2/H3 in content HTML. */
export function processContentHeadings(html: string): { html: string; toc: TocEntry[]; headings: BlogPost['headings'] } {
  const $ = cheerio.load(`<div id="root">${html}</div>`, { decodeEntities: false }, false);
  const toc: TocEntry[] = [];
  const headings: BlogPost['headings'] = [];
  const usedIds = new Set<string>();

  $('#root').find('h2, h3').each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || 'h2').toLowerCase();
    const level = tag === 'h3' ? 3 : 2;
    const text = extractHeadingText($el);
    if (!text) return;

    let id = $el.attr('id') || '';
    if (!id || id.startsWith('img-') || id.length > 120) {
      id = slugifyHeading(text);
    }
    const baseId = id || slugifyHeading(text);
    let n = 2;
    while (!id || usedIds.has(id)) {
      id = n === 2 && !usedIds.has(baseId) ? baseId : `${slugifyHeading(text)}-${n}`;
      n += 1;
    }
    usedIds.add(id);
    $el.attr('id', id);

    if (level <= 3) {
      toc.push({ id, text, level: level as 2 | 3 });
      headings.push({ level: tag, text, id });
    }
  });

  return { html: $('#root').html() || '', toc, headings };
}

export function buildTocHtml(toc: TocEntry[]): string {
  const clean = (toc || []).map(sanitizeTocEntry).filter((entry): entry is TocEntry => Boolean(entry));
  if (!clean.length) return '';

  const items = clean
    .map((entry) => {
      const indent = entry.level === 3 ? ' style="padding-left:1rem"' : '';
      return `<li class="astro-blog-toc__item astro-blog-toc__item--h${entry.level}"${indent}><a href="#${entry.id}" class="astro-blog-toc__link">${escapeHtml(entry.text)}</a></li>`;
    })
    .join('');

  return `<nav class="astro-blog-toc" aria-label="Table of contents">
  <h2 class="astro-blog-toc__title">Table of Contents</h2>
  <ol class="astro-blog-toc__list">${items}</ol>
</nav>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function buildFeaturedImageHtml(img: BlogImage | null): string {
  if (!img?.src) {
    return '<!-- no featured image -->';
  }
  const alt = escapeHtml(img.alt || '');
  return `<img width="1536" height="1024" src="${img.src}" class="attachment-full size-full" alt="${alt}" loading="eager" decoding="async" />`;
}

const USER_ICON_SVG =
  '<svg aria-hidden="true" class="e-font-icon-svg e-far-user-circle" viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg"><path d="M248 104c-53 0-96 43-96 96s43 96 96 96 96-43 96-96-43-96-96-96zm0 144c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm0-240C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-49.7 0-95.1-18.3-130.1-48.4 14.9-23 40.4-38.6 69.6-39.5 20.8 6.4 40.6 9.6 60.5 9.6s39.7-3.1 60.5-9.6c29.2 1 54.7 16.5 69.6 39.5-35 30.1-80.4 48.4-130.1 48.4zm162.7-84.1c-24.4-31.4-62.1-51.9-105.1-51.9-10.2 0-26 9.6-57.6 9.6-31.5 0-47.4-9.6-57.6-9.6-42.9 0-80.6 20.5-105.1 51.9C61.9 339.2 48 299.2 48 256c0-110.3 89.7-200 200-200s200 89.7 200 200c0 43.2-13.9 83.2-37.3 115.9z"></path></svg>';

const CALENDAR_ICON_SVG =
  '<svg aria-hidden="true" class="e-font-icon-svg e-fas-calendar" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M12 192h424c6.6 0 12 5.4 12 12v260c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V204c0-6.6 5.4-12 12-12zm436-44v-36c0-26.5-21.5-48-48-48h-48V12c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v52H160V12c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v36c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12z"></path></svg>';

function buildBreadcrumbHtml(post: BlogPost): string {
  const crumbs = post.breadcrumb?.length
    ? post.breadcrumb
    : [
        { name: 'Home', url: '/' },
        { name: 'Insights', url: '/insights/' },
        { name: post.title },
      ];

  const items = crumbs
    .map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      if (isLast || !crumb.url) {
        return `<span class="astro-blog-breadcrumb__item astro-blog-breadcrumb__item--current">${escapeHtml(crumb.name)}</span>`;
      }
      return `<a class="astro-blog-breadcrumb__item" href="${crumb.url.replace(ORIGIN, '')}">${escapeHtml(crumb.name)}</a>`;
    })
    .join('<span class="astro-blog-breadcrumb__sep"> / </span>');

  return `<nav class="astro-blog-breadcrumb" aria-label="Breadcrumb">${items}</nav>`;
}

function buildCategoryHtml(categories: BlogPost['categories']): string {
  const name = categories[0]?.name || 'Insights';
  const url = categories[0]?.url || '/category/insights/';
  const localUrl = url.replace(ORIGIN, '');
  return `<div class="elementor-element elementor-element-6b846d5 post-cat elementor-widget-mobile__width-auto elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
    <ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
      <li class="elementor-icon-list-item elementor-inline-item" itemprop="about">
        <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
          <span class="elementor-post-info__terms-list">
            <a href="${localUrl}" class="elementor-post-info__terms-list-item">${escapeHtml(name)}</a>
          </span>
        </span>
      </li>
    </ul>
  </div>`;
}

function buildAuthorHtml(author: BlogPost['author']): string {
  const name = escapeHtml(author.name || 'Connect Group');
  const slug = author.slug || (author.url ? author.url.replace(ORIGIN, '').replace(/^\/author\/|\/$/g, '') : 'connect-2');
  const url = `/author/${slug}/`;
  return `<div class="elementor-element elementor-element-d3a4371 elementor-align-right elementor-widget-mobile__width-auto elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
    <ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
      <li class="elementor-icon-list-item elementor-inline-item" itemprop="author">
        <a href="${url}">
          <span class="elementor-icon-list-icon">${USER_ICON_SVG}</span>
          <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">${name}</span>
        </a>
      </li>
    </ul>
  </div>`;
}

function buildDateHtml(publishedAt: string): string {
  const d = new Date(publishedAt);
  const display = formatDate(publishedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `<div class="elementor-element elementor-element-d800a46 elementor-widget-mobile__width-auto elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
    <ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
      <li class="elementor-icon-list-item elementor-inline-item" itemprop="datePublished">
        <a href="/${y}/${m}/${day}/">
          <span class="elementor-icon-list-icon">${CALENDAR_ICON_SVG}</span>
          <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
            <time datetime="${y}-${m}-${day}">${display}</time>
          </span>
        </a>
      </li>
    </ul>
  </div>`;
}

function patchHeadMeta(html: string, post: BlogPost): string {
  let out = html;
  const metaTitle = post.metaTitle || post.title;
  const metaDescription = post.metaDescription || post.description;

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(metaTitle)}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(metaDescription)}" />`,
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${post.canonical}" />`,
  );
  if (post.robots) {
    if (out.includes('name="robots"')) {
      out = out.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${post.robots}" />`);
    } else {
      out = out.replace('</head>', `<meta name="robots" content="${post.robots}" />\n</head>`);
    }
  }
  // OG
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(post.og.title || metaTitle)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(post.og.description || metaDescription)}" />`,
  );
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${post.canonical}" />`);
  if (post.og.image) {
    if (out.includes('property="og:image"')) {
      out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${post.og.image}" />`);
    } else {
      out = out.replace('</head>', `<meta property="og:image" content="${post.og.image}" />\n</head>`);
    }
  }
  return out;
}

const TOC_STYLES = `<style id="astro-blog-toc-css">
.astro-blog-toc{background:#fff;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,.08);padding:1.25rem 1.5rem;margin-bottom:1.5rem}
.astro-blog-toc__title{font-size:1.125rem;font-weight:700;margin:0 0 .75rem;color:#070c13}
.astro-blog-toc__list{margin:0;padding-left:1.25rem;list-style:decimal}
.astro-blog-toc__item{margin:.35rem 0;line-height:1.45}
.astro-blog-toc__link{color:#23369b;text-decoration:none}
.astro-blog-toc__link:hover{color:#d71216;text-decoration:underline}
.astro-blog-breadcrumb{font-size:14px;color:#666;margin:0 0 1rem;line-height:1.5}
.astro-blog-breadcrumb__item{color:#23369b;text-decoration:none}
.astro-blog-breadcrumb__item:hover{text-decoration:underline}
.astro-blog-breadcrumb__item--current{color:#333;font-weight:500}
.astro-blog-breadcrumb__sep{color:#999}
</style>`;

/** Assemble final HTML from shell template + post data. */
export function assembleBlogPostHtml(post: BlogPost): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Blog shell missing. Run: npm run prepare:blog-shell');
  }

  let html = readFileSync(SHELL_PATH, 'utf8');

  html = html
    .replace('<!--ASTRO_BLOG:BREADCRUMB-->', buildBreadcrumbHtml(post))
    .replace('<!--ASTRO_BLOG:FEATURED_IMAGE-->', buildFeaturedImageHtml(post.featuredImage))
    .replace('<!--ASTRO_BLOG:CATEGORY-->', buildCategoryHtml(post.categories))
    .replace('<!--ASTRO_BLOG:AUTHOR-->', post.authorHtml || buildAuthorHtml(post.author))
    .replace(
      '<!--ASTRO_BLOG:TITLE-->',
      `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(post.title)}</h1>`,
    )
    .replace('<!--ASTRO_BLOG:CONTENT-->', post.contentHtml)
    .replace('<!--ASTRO_BLOG:DATE-->', buildDateHtml(post.publishedAt))
    .replace('<!--ASTRO_BLOG:TOC-->', buildTocHtml(post.toc));

  html = patchHeadMeta(html, post);

  if (!html.includes('astro-blog-toc-css')) {
    html = html.replace('</head>', `${TOC_STYLES}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  html = decodeProtectedEmailsInHtml(html);

  return injectRuntimeGtmLoader(html);
}

function decodeCfEmail(hex: string): string {
  if (!hex || hex.length < 4) return '';
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
}

function decodeProtectedEmailsInHtml(html: string): string {
  let out = html.replace(
    /<span class="__cf_email__" data-cfemail="([^"]+)">[^<]*<\/span>/gi,
    (_, enc) => `<span class="__cf_email__">${decodeCfEmail(enc)}</span>`,
  );
  out = out.replace(/href="\/cdn-cgi\/l\/email-protection#[^"]+"/gi, 'href="mailto:contact@connectgroup.co"');
  return out;
}

export function serveBlogPost(post: BlogPost): Response {
  const html = assembleBlogPostHtml(post);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}

/** WordPress author archives use 50 posts per page. */
export const AUTHOR_POSTS_PER_PAGE = 50;
export const ARCHIVE_POSTS_PER_PAGE = 10;
export const TAG_POSTS_PER_PAGE = 50;

const CATEGORY_SLUG_MAP: Record<string, string> = {
  'Human Resource': 'human-resource',
  'Company formation': 'company-formation-blog',
  Tax: 'tax-blog',
  'Visa services': 'visa-services',
  'Business Tips': 'business-tips',
  'Business Center': 'business-center',
  'Banking services': 'banking-services',
  'Office Space': 'office-space',
  'UAE Market': 'uae-market',
  'Freelance Visa': 'freelance-visa',
};

export function getCategorySlug(cat: { name: string; slug?: string }): string {
  if (cat.slug) return cat.slug;
  return CATEGORY_SLUG_MAP[cat.name] || cat.name.toLowerCase().replace(/\s+/g, '-');
}

export function getCategoryUrl(cat: { name: string; slug?: string; url?: string }): string {
  if (cat.url) {
    const local = cat.url.replace(ORIGIN, '');
    return local.endsWith('/') ? local : `${local}/`;
  }
  return `/category/${getCategorySlug(cat)}/`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Build a card/meta excerpt from HTML body when description is missing. */
export function excerptFromContent(html: string, maxLength = 220): string {
  if (!html) return '';
  const text = stripHtml(html)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function getPostExcerpt(post: Pick<BlogPost, 'description' | 'contentHtml'>, maxLength = 220): string {
  const fromMeta = stripHtml(post.description || '').trim();
  if (fromMeta) {
    return fromMeta.length <= maxLength
      ? fromMeta
      : `${fromMeta.slice(0, maxLength).replace(/\s+\S*$/, '').trim()}…`;
  }
  return excerptFromContent(post.contentHtml || '', maxLength);
}

/** Build Evolution featured hero card (Elementor loop template 714). */
export function buildFeaturedPostCardHtml(post: BlogPost): string {
  const category = post.categories[0];
  const categoryName = category ? escapeHtml(category.name) : '';
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const dateDisplay = formatDate(post.publishedAt);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const catClass = category?.name
    ? ` category-${(category.slug || category.name).toLowerCase().replace(/\s+/g, '-')}`
    : '';
  const classBits = `elementor-post elementor-grid-item ecs-post-loop post type-post status-publish format-standard has-post-thumbnail hentry${catClass}`;

  const imgTag = imgSrc
    ? `<img loading="eager" width="800" height="450" src="${imgSrc}" class="attachment-large size-large" alt="${imgAlt}" decoding="async" />`
    : '';

  return `<article class="${classBits}">
<div class="elementor elementor-714" data-elementor-id="714" data-elementor-post-type="elementor_library" data-elementor-type="loop">
<section class="elementor-section elementor-top-section elementor-element elementor-element-43b4a11 elementor-section-boxed elementor-section-height-default" data-element_type="section" data-id="43b4a11">
<div class="elementor-container elementor-column-gap-default">
<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-49362bf" data-element_type="column" data-id="49362bf">
<div class="elementor-widget-wrap elementor-element-populated">
<div class="elementor-element elementor-element-f8a3136 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-widget_type="theme-post-featured-image.default">
<div class="elementor-widget-container">
<a href="${postUrl}">${imgTag}</a>
</div>
</div>
</div>
</div>
<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-a4b52c2" data-element_type="column" data-id="a4b52c2">
<div class="elementor-widget-wrap elementor-element-populated">
<div class="elementor-element elementor-element-421283d elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
<div class="elementor-widget-container">
<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
<li class="elementor-icon-list-item elementor-inline-item" itemprop="datePublished">
<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
<time>${dateDisplay}</time>
</span>
</li>
</ul>
</div>
</div>
<div class="elementor-element elementor-element-d7dcb89 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-widget_type="theme-post-title.default">
<div class="elementor-widget-container">
<h3 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h3>
</div>
</div>
${
  categoryName
    ? `<div class="elementor-element elementor-element-3e46b85 elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
<div class="elementor-widget-container">
<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
<li class="elementor-icon-list-item elementor-inline-item" itemprop="about">
<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
<span class="elementor-post-info__terms-list">
<span class="elementor-post-info__terms-list-item">${categoryName}</span>
</span>
</span>
</li>
</ul>
</div>
</div>`
    : ''
}
<div class="elementor-element elementor-element-661e9c9 elementor-widget elementor-widget-button" data-widget_type="button.default">
<div class="elementor-widget-container">
<div class="elementor-button-wrapper">
<a class="elementor-button elementor-button-link elementor-size-sm" href="${postUrl}">
<span class="elementor-button-content-wrapper">
<span class="elementor-button-text">Read Article Now</span>
</span>
</a>
</div>
</div>
</div>
</div>
</div>
</div>
</section>
</div>
</article>`;
}

/** Build Evolution blog grid card (Elementor loop template 244). */
export function buildPostCardHtml(post: BlogPost): string {
  const category = post.categories[0];
  const categoriesHtml = post.categories
    .slice(0, 3)
    .map((c) => `<span class="elementor-post-info__terms-list-item">${escapeHtml(c.name)}</span>`)
    .join(' , ');
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 160));
  const dateDisplay = formatDate(post.publishedAt);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const catClass = category?.name
    ? ` category-${(category.slug || category.name).toLowerCase().replace(/\s+/g, '-')}`
    : '';
  const classBits = `elementor-post elementor-grid-item ecs-post-loop post type-post status-publish format-standard has-post-thumbnail hentry${catClass}`;

  const imgTag = imgSrc
    ? `<img loading="lazy" width="800" height="450" src="${imgSrc}" class="attachment-large size-large" alt="${imgAlt}" decoding="async" />`
    : '';

  return `<article class="${classBits}">
<div class="elementor elementor-244" data-elementor-id="244" data-elementor-post-type="elementor_library" data-elementor-type="loop">
<section class="elementor-section elementor-top-section elementor-element elementor-element-825d9b8 elementor-section-boxed elementor-section-height-default" data-element_type="section" data-id="825d9b8">
<div class="elementor-container elementor-column-gap-default">
<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-05b42ae" data-element_type="column" data-id="05b42ae">
<div class="elementor-widget-wrap elementor-element-populated">
<div class="elementor-element elementor-element-2d3f2b8 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-widget_type="theme-post-featured-image.default">
<div class="elementor-widget-container">
<a href="${postUrl}">${imgTag}</a>
</div>
</div>
<section class="elementor-section elementor-inner-section elementor-element elementor-element-ce7d76b elementor-section-boxed elementor-section-height-default" data-element_type="section" data-id="ce7d76b">
<div class="elementor-container elementor-column-gap-default">
<div class="elementor-column elementor-col-100 elementor-inner-column elementor-element elementor-element-7cd3d5a" data-element_type="column" data-id="7cd3d5a">
<div class="elementor-widget-wrap elementor-element-populated">
<div class="elementor-element elementor-element-eb7d823 elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
<div class="elementor-widget-container">
<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
<li class="elementor-icon-list-item elementor-inline-item" itemprop="datePublished">
<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
<time>${dateDisplay}</time>
</span>
</li>
</ul>
</div>
</div>
<div class="elementor-element elementor-element-a48d89a elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-widget_type="theme-post-title.default">
<div class="elementor-widget-container">
<h3 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h3>
</div>
</div>
<div class="elementor-element elementor-element-ccf6e5a elementor-widget elementor-widget-theme-post-excerpt" data-widget_type="theme-post-excerpt.default">
<div class="elementor-widget-container">
<p>${excerpt}</p>
</div>
</div>
${
  categoriesHtml
    ? `<div class="elementor-element elementor-element-ef8c7ce elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
<div class="elementor-widget-container">
<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
<li class="elementor-icon-list-item elementor-inline-item" itemprop="about">
<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
<span class="elementor-post-info__terms-list">${categoriesHtml}</span>
</span>
</li>
</ul>
</div>
</div>`
    : ''
}
</div>
</div>
</div>
</section>
</div>
</div>
</div>
</section>
</div>
</article>`;
}

/** Elementor archive_cards skin (template 24660) used on tag archives. */
export function buildArchiveCardHtml(post: BlogPost): string {
  const category = post.categories[0];
  const badge = category ? escapeHtml(category.name) : '';
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const catClass = category
    ? ` category-${(category.slug || getCategorySlug(category)).toLowerCase().replace(/\s+/g, '-')}`
    : '';

  const imgTag = imgSrc
    ? `<img loading="lazy" width="1920" height="1080" src="${imgSrc}" class="attachment-full size-full" alt="${imgAlt}" decoding="async" />`
    : '';

  return `<article class="elementor-post elementor-grid-item post type-post status-publish format-standard has-post-thumbnail hentry${catClass}" role="listitem">
  <div class="elementor-post__card">
    <a class="elementor-post__thumbnail__link" href="${postUrl}" tabindex="-1">
      <div class="elementor-post__thumbnail">${imgTag}</div>
    </a>
    ${badge ? `<div class="elementor-post__badge">${badge}</div>` : ''}
    <div class="elementor-post__text">
      <h3 class="elementor-post__title">
        <a href="${postUrl}">${title}</a>
      </h3>
      <a class="elementor-post__read-more" href="${postUrl}" aria-label="Read more about ${title}" tabindex="-1">Read More »</a>
    </div>
  </div>
</article>`;
}

export function getAllBlogPosts(): BlogPost[] {
  return getAllBlogSlugs()
    .map((slug) => getBlogPost(slug))
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getAuthorSlugFromPost(post: BlogPost): string | null {
  if (post.author.slug) return post.author.slug;
  if (post.author.url) {
    const m = post.author.url.match(/\/author\/([^/]+)/);
    if (m) return m[1];
  }
  return null;
}

export function getPostsByAuthorSlug(authorSlug: string): BlogPost[] {
  return getAllBlogPosts().filter((post) => getAuthorSlugFromPost(post) === authorSlug);
}

export function getPostsByCategorySlug(categorySlug: string): BlogPost[] {
  return getAllBlogPosts().filter((post) =>
    post.categories.some((cat) => getCategorySlug(cat) === categorySlug),
  );
}

export function getPostsByTagSlug(tagSlug: string): BlogPost[] {
  return getAllBlogPosts().filter((post) =>
    post.tags?.some((tag) => tag.slug === tagSlug),
  );
}

export function getAllCategorySlugs(): string[] {
  const slugs = new Set<string>();
  for (const post of getAllBlogPosts()) {
    for (const cat of post.categories) {
      slugs.add(getCategorySlug(cat));
    }
  }
  return [...slugs].sort();
}

export function getAllTagSlugs(): string[] {
  const slugs = new Set<string>();
  for (const post of getAllBlogPosts()) {
    for (const tag of post.tags || []) {
      slugs.add(tag.slug);
    }
  }
  return [...slugs].sort();
}
