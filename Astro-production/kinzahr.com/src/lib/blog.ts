/**
 * Blog post types, TOC builder, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { sanitizeCmsHtml } from '@connect/site-cms';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { injectRuntimeGtmLoader } from './gtm/inject';
import { LIVE_AUTHOR_ROSTER, pickLiveAuthorForPostSlug } from './author-roster.ts';

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, 'src/content/blog');
const SHELL_PATH = join(ROOT, 'src/legacy/blog-shell/template.html');
const ORIGIN = 'https://kinzahr.com';

/** Production host for absolute SEO URLs (canonical / og:url). Prefer env; never leave relative. */
function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || ORIGIN).trim().replace(/\/$/, '') || ORIGIN;
}

function absoluteSeoUrl(value: string, fallbackPath = '/'): string {
  const origin = siteOrigin();
  const raw = String(value || fallbackPath).trim() || fallbackPath;
  try {
    return new URL(raw, `${origin}/`).href;
  } catch {
    return `${origin}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
  }
}

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
  /** draft | published | trash — optional on legacy migrated posts */
  status?: string;
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
  schemas?: Array<Record<string, unknown>>;
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
 * Authors are remapped onto the live Figma roster (deterministic per slug).
 */
export function getBlogPost(slug: string): BlogPost | null {
  const post = getRawBlogPost(slug);
  if (!post) return null;
  if (!isPublishedPost(post)) return null;
  const live = pickLiveAuthorForPostSlug(post.slug || slug);
  return {
    ...post,
    author: {
      name: live.name,
      slug: live.slug,
      url: `/author/${live.slug}/`,
    },
    // Force rebuild of author chrome so legacy HTML does not keep old names.
    authorHtml: undefined,
  };
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
  const $ = cheerio.load(`<div id="root">${html}</div>`, undefined, false);
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

  /** Nest H3 items under the preceding H2 to match live BlooD TOC markup. */
  type TocNode = { entry: TocEntry; children: TocEntry[] };
  const roots: TocNode[] = [];
  for (const entry of clean) {
    if (entry.level === 3 && roots.length) {
      roots[roots.length - 1].children.push(entry);
    } else {
      roots.push({ entry, children: [] });
    }
  }

  const items = roots
    .map((node, i) => {
      const firstClass = i === 0 ? ' class="first"' : '';
      const childHtml = node.children.length
        ? `<ul class="menu_level_2">${node.children
            .map((child, ci) => {
              const cFirst = ci === 0 ? ' class="first"' : '';
              return `<li${cFirst}><a href="#${child.id}">${escapeHtml(child.text)}</a></li>`;
            })
            .join('')}</ul>`
        : '';
      return `<li${firstClass}><a href="#${node.entry.id}">${escapeHtml(node.entry.text)}</a>${childHtml}</li>`;
    })
    .join('');

  return `<div class="bd_toc_container astro-blog-toc" data-fixedwidth="">
  <div class="bd_toc_wrapper" data-wrapperpadding="48px">
    <div class="bd_toc_wrapper_item">
      <div class="bd_toc_header active" data-headerpadding="2px" role="button" tabindex="0" aria-expanded="true">
        <div class="bd_toc_header_title">Table of Contents</div>
        <div class="bd_toc_switcher_hide_show_icon"><span class="bd_toc_arrow"></span></div>
      </div>
      <div class="bd_toc_content list-type-number">
        <div class="bd_toc_content_list">
          <div class="bd_toc_content_list_item">
            <ul>${items}</ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

/** Bust Cloudflare/browser cache for mirror-fixes (JS is max-age=86400 without ?v=). */
export const MIRROR_FIXES_CACHE_BUST = 'author-roster-20260909';

export function bustMirrorFixesHtml(html: string): string {
  if (!html) return html;
  return html.replace(
    /src=(["'])\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?\1/g,
    `src=$1/js/astro-mirror-fixes.js?v=${MIRROR_FIXES_CACHE_BUST}$1`,
  );
}

/** Static Elementor TOC list — avoids spinner when Elementor Pro TOC chunk fails. */
export function buildElementorTocListHtml(toc: TocEntry[]): string {
  const clean = (toc || []).map(sanitizeTocEntry).filter((entry): entry is TocEntry => Boolean(entry));
  if (!clean.length) return '';

  type TocNode = { entry: TocEntry; children: TocEntry[] };
  const roots: TocNode[] = [];
  for (const entry of clean) {
    if (entry.level === 3 && roots.length) {
      roots[roots.length - 1].children.push(entry);
    } else {
      roots.push({ entry, children: [] });
    }
  }

  const items = roots
    .map((node) => {
      const childHtml = node.children.length
        ? `<ol class="elementor-toc__list">${node.children
            .map(
              (child) =>
                `<li class="elementor-toc__list-item"><a href="#${child.id}" class="elementor-toc__list-item-text-wrapper"><div class="elementor-toc__list-item-text">${escapeHtml(child.text)}</div></a></li>`,
            )
            .join('')}</ol>`
        : '';
      return `<li class="elementor-toc__list-item"><a href="#${node.entry.id}" class="elementor-toc__list-item-text-wrapper"><div class="elementor-toc__list-item-text">${escapeHtml(node.entry.text)}</div></a>${childHtml}</li>`;
    })
    .join('');

  return `<div class="elementor-toc__list-wrapper"><ol class="elementor-toc__list">${items}</ol></div>`;
}

/** Replace Elementor TOC spinner / empty body with a static heading list. */
export function injectElementorTocHtml(html: string, toc: TocEntry[]): string {
  const list = buildElementorTocListHtml(toc);
  if (!html || !list) return html;
  if (!html.includes('elementor-widget-table-of-contents')) return html;

  let out = html.replace(
    /<div class="elementor-toc__spinner-container">[\s\S]*?<\/div>/i,
    list,
  );
  // Remove Elementor's "No headings were found" empty-state text if present.
  out = out.replace(
    /<div class="elementor-message elementor-message-danger">[\s\S]*?No headings were found on this page\.[\s\S]*?<\/div>/i,
    '',
  );
  return out;
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
  return `<img loading="lazy" width="800" height="450" src="${img.src}" class="attachment-large size-large" alt="${alt}" style="margin-top:-50px;position:relative;z-index:1" />`;
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
        { name: 'Insights', url: '/blog/' },
        { name: post.title },
      ];

  const items = crumbs
    .map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      const href = crumb.url ? crumb.url.replace(ORIGIN, '').replace(/\/insights\/?/i, '/blog/') : '';
      if (isLast || !href) {
        return `<span class="astro-blog-breadcrumb__item astro-blog-breadcrumb__item--current">${escapeHtml(crumb.name)}</span>`;
      }
      return `<a class="astro-blog-breadcrumb__item" href="${href}">${escapeHtml(crumb.name)}</a>`;
    })
    .join('<span class="astro-blog-breadcrumb__sep"> / </span>');

  return `<nav class="astro-blog-breadcrumb" aria-label="Breadcrumb">${items}</nav>`;
}

function buildCategoryHtml(categories: BlogPost['categories']): string {
  const name = categories[0]?.name || 'Insights';
  return `<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
  <li class="elementor-icon-list-item elementor-repeater-item-c3cb9b2 elementor-inline-item" itemprop="about">
    <span class="elementor-icon-list-icon"><i aria-hidden="true" class="fas fa-circle"></i></span>
    <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
      <span class="elementor-post-info__terms-list"><span class="elementor-post-info__terms-list-item">${escapeHtml(name)}</span></span>
    </span>
  </li>
</ul>`;
}

function buildAuthorHtml(author: BlogPost['author'], post: BlogPost): string {
  const name = escapeHtml(author.name || 'KinzaHR');
  const slug =
    author.slug ||
    (author.url ? author.url.replace(ORIGIN, '').replace(/^\/author\/|\/$/g, '') : 'vesna-milic');
  const url = `/author/${slug}/`;
  const live = LIVE_AUTHOR_ROSTER.find((a) => a.slug === slug);
  const avatarSrc = live?.avatar || '/wp-content/uploads/2024/05/vesna-milic.png';
  const readingTime = Math.max(
    1,
    Math.ceil(stripHtml(post.contentHtml || '').split(/\s+/).filter(Boolean).length / 200),
  );
  return `<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
  <li class="elementor-icon-list-item elementor-repeater-item-4a012f8 elementor-inline-item" itemprop="author">
    <a href="${url}">
      <span class="elementor-icon-list-icon"><img class="elementor-avatar" src="${avatarSrc}" alt="Picture of ${name}" loading="lazy" width="96" height="96"></span>
      <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">${name}</span>
    </a>
  </li>
  <li class="elementor-icon-list-item elementor-repeater-item-f50171d elementor-inline-item" itemprop="datePublished">
    <span class="elementor-icon-list-icon"><i aria-hidden="true" class="fas fa-circle"></i></span>
    <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date"><span class="elementor-post-info__item-prefix">&nbsp;</span><time><!--ASTRO_BLOG:DATE--></time></span>
  </li>
  <li class="elementor-icon-list-item elementor-repeater-item-f78c1eb elementor-inline-item">
    <span class="elementor-icon-list-icon"><i aria-hidden="true" class="fas fa-circle"></i></span>
    <span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-custom">&nbsp;${readingTime} min read</span>
  </li>
</ul>`;
}

function buildDateHtml(publishedAt: string): string {
  return escapeHtml(formatDate(publishedAt));
}

function patchHeadMeta(html: string, post: BlogPost): string {
  let out = html;
  const metaTitle = post.metaTitle || post.title;
  const metaDescription = post.metaDescription || post.description;
  const canonical = absoluteSeoUrl(post.canonical, `/${post.slug}/`);
  const ogImage = post.og.image ? absoluteSeoUrl(post.og.image, post.og.image) : '';

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(metaTitle)}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(metaDescription)}" />`,
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
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
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);
  out = out.replace(
    /<meta\s+property="article:published_time"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="article:published_time" content="${escapeHtml(post.publishedAt)}" />`,
  );
  out = out.replace(
    /<meta\s+property="article:modified_time"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="article:modified_time" content="${escapeHtml(post.modifiedAt)}" />`,
  );
  out = out.replace(
    /<meta\s+name="author"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="author" content="${escapeHtml(post.author.name)}" />`,
  );
  if (post.twitter.card) {
    out = out.replace(
      /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:card" content="${escapeHtml(post.twitter.card)}" />`,
    );
  }
  if (ogImage) {
    if (out.includes('property="og:image"')) {
      out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`);
    } else {
      out = out.replace('</head>', `<meta property="og:image" content="${ogImage}" />\n</head>`);
    }
  }
  return out;
}

function injectBlogSchemas(html: string, post: BlogPost): string {
  const schemas = [...(post.schema ? [post.schema] : []), ...(post.schemas || [])];
  if (!schemas.length) return html;

  const scripts = schemas
    .map((schema) => {
      const json = JSON.stringify(schema).replace(/</g, '\\u003c');
      return `<script type="application/ld+json">${json}</script>`;
    })
    .join('\n');
  return html.replace('</head>', `${scripts}\n</head>`);
}

const TOC_STYLES = `<style id="astro-blog-toc-css">
.bd_toc_container.astro-blog-toc{margin:0 0 1.5rem;max-width:100%}
.bd_toc_container.astro-blog-toc .bd_toc_header{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:.75rem}
.bd_toc_container.astro-blog-toc .bd_toc_content{display:block}
.bd_toc_container.astro-blog-toc:not(.is-open) .bd_toc_header:not(.active) + .bd_toc_content,
.bd_toc_container.astro-blog-toc .bd_toc_header:not(.active) + .bd_toc_content{display:none}
.bd_toc_container.astro-blog-toc .bd_toc_content_list_item > ul{margin:0;padding-left:1.25rem;list-style:decimal}
.bd_toc_container.astro-blog-toc .menu_level_2{list-style:disc;margin:.35rem 0 .35rem 1rem;padding-left:1rem}
.bd_toc_container.astro-blog-toc a{color:#23369b;text-decoration:none}
.bd_toc_container.astro-blog-toc a:hover{color:#d71216;text-decoration:underline}
.astro-blog-breadcrumb{font-size:14px;color:#666;margin:0 0 1rem;line-height:1.5}
.astro-blog-breadcrumb__item{color:#23369b;text-decoration:none}
.astro-blog-breadcrumb__item:hover{text-decoration:underline}
.astro-blog-breadcrumb__item--current{color:#333;font-weight:500}
.astro-blog-breadcrumb__sep{color:#999}
/* Elementor TOC: hide spinner once we inject a static list (no Elementor Pro chunk needed) */
.elementor-widget-table-of-contents .elementor-toc__spinner-container{display:none!important;}
.elementor-toc__list-wrapper{margin:0;padding:0;}
.elementor-toc__list{margin:0;padding-left:1.25rem;list-style:decimal;}
.elementor-toc__list .elementor-toc__list{list-style:disc;margin:.35rem 0 .35rem .5rem;}
.elementor-toc__list-item-text-wrapper{color:#23369b;text-decoration:none;}
.elementor-toc__list-item-text-wrapper:hover{color:#d71216;text-decoration:underline;}
/* Popular Articles cards: avoid double-height gray box when Elementor absolute-fill CSS is late/missing */
.elementor-posts--skin-cards .elementor-post__thumbnail{position:relative!important;overflow:hidden!important;aspect-ratio:16/9;padding-bottom:0!important;min-height:0!important;height:auto!important;background:#e8e8e8;}
.elementor-posts--skin-cards .elementor-post__thumbnail img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;max-width:none!important;}
</style>
`;

/** Shared blog-post CSS (TOC + Popular Articles cards) — also used by legacy mirrors. */
export const BLOG_POST_FIX_STYLES = TOC_STYLES;

const TOC_SCRIPT = `<script id="astro-blog-toc-js">
(function(){
  function boot(){
    document.querySelectorAll('.bd_toc_container.astro-blog-toc').forEach(function(box){
      if(box.dataset.astroTocBound) return;
      box.dataset.astroTocBound='1';
      var header=box.querySelector('.bd_toc_header');
      if(!header) return;
      function toggle(){
        header.classList.toggle('active');
        header.setAttribute('aria-expanded', header.classList.contains('active') ? 'true' : 'false');
      }
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function(e){
        if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); }
      });
      box.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click', function(e){
          var id=a.getAttribute('href').slice(1);
          var target=document.getElementById(id);
          if(!target) return;
          e.preventDefault();
          target.scrollIntoView({behavior:'smooth', block:'start'});
          try{ history.replaceState(null,'','#'+id); }catch(err){}
        });
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;

/**
 * Related posts for Popular Articles: prefer shared category/tag, then fill
 * with recent posts so the 3-card grid stays populated.
 */
export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const catSlugs = new Set(post.categories.map((c) => getCategorySlug(c)));
  const primarySlug = post.categories[0] ? getCategorySlug(post.categories[0]) : '';
  const tagSlugs = new Set((post.tags || []).map((t) => t.slug).filter(Boolean));
  const others = getAllBlogPosts().filter((p) => p.slug !== post.slug);

  const scored = others
    .map((p) => {
      let score = 0;
      for (let i = 0; i < p.categories.length; i++) {
        const slug = getCategorySlug(p.categories[i]);
        if (!catSlugs.has(slug)) continue;
        score += i === 0 && slug === primarySlug ? 5 : 3;
      }
      for (const tag of p.tags || []) {
        if (tag.slug && tagSlugs.has(tag.slug)) score += 2;
      }
      return { p, score };
    })
    .filter((row) => row.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.p.publishedAt).getTime() - new Date(a.p.publishedAt).getTime();
  });

  const related = scored.map((row) => row.p);
  if (related.length >= limit) return related.slice(0, limit);

  const seen = new Set(related.map((p) => p.slug));
  for (const p of others) {
    if (seen.has(p.slug)) continue;
    related.push(p);
    seen.add(p.slug);
    if (related.length >= limit) break;
  }
  return related;
}

/** Elementor posts.cards skin used by Popular Articles (widget 80908c4). */
export function buildPopularArticleCardHtml(post: BlogPost): string {
  const category = post.categories[0];
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 120).replace(/…$/, ''));
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const catClass = category
    ? ` category-${(category.slug || getCategorySlug(category)).toLowerCase().replace(/\s+/g, '-')}`
    : '';
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;

  const imgTag = imgSrc
    ? `<img loading="lazy" width="1920" height="1080" src="${imgSrc}" class="attachment-full size-full" alt="${imgAlt}" decoding="async">`
    : '';

  return `<article class="elementor-post elementor-grid-item ${postDomId} post type-post status-publish format-standard has-post-thumbnail hentry${catClass}" role="listitem">
			<div class="elementor-post__card">
				<a class="elementor-post__thumbnail__link" href="${postUrl}" tabindex="-1"><div class="elementor-post__thumbnail">${imgTag}</div></a>
				<div class="elementor-post__text">
				<h3 class="elementor-post__title">
			<a href="${postUrl}">
				${title}			</a>
		</h3>
				<div class="elementor-post__excerpt">
			<p>${excerpt}</p>
		</div>
		
		<a class="elementor-post__read-more" href="${postUrl}" aria-label="Read more about ${title}" tabindex="-1">
			Read More »		</a>

				</div>
					</div>
		</article>`;
}

/**
 * Rewrite author byline, author-box bio, and meta in legacy Elementor post mirrors
 * to the live Figma roster. Most Kinza posts are served from cleaned HTML.
 */
export function injectLiveAuthorIntoMirrorHtml(html: string, post: BlogPost): string {
  if (!html || !post?.author?.slug || !post.author.name) return html;

  const name = post.author.name;
  const slug = post.author.slug;
  const url = `/author/${slug}/`;
  const live = LIVE_AUTHOR_ROSTER.find((a) => a.slug === slug);
  const avatarSrc = live?.avatar || `/wp-content/uploads/2024/05/${slug}.png`;
  const bio = (live?.bio || '').trim();
  const safeName = escapeHtml(name);
  const safeBio = escapeHtml(bio);

  let out = html;

  // Post-info author row (avatar + name + link)
  out = out.replace(
    /<li([^>]*itemprop=["']author["'][^>]*)>[\s\S]*?<\/li>/i,
    `<li$1>
						<a href="${url}">
											<span class="elementor-icon-list-icon">
								<img class="elementor-avatar" src="${avatarSrc}" alt="Picture of ${safeName}" loading="lazy" width="96" height="96">
							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${safeName}					</span>
									</a>
				</li>`,
  );

  // Elementor author-box under post content
  if (/elementor-author-box/i.test(out)) {
    out = out.replace(
      /(<a href=")[^"]*("\s+class="elementor-author-box__avatar">)/i,
      `$1${url}$2`,
    );
    out = out.replace(
      /(class="elementor-author-box__avatar">\s*<img\s+[^>]*?\bsrc=")[^"]*(")/i,
      `$1${avatarSrc}$2`,
    );
    out = out.replace(
      /(class="elementor-author-box__avatar">\s*<img\s+[^>]*?\balt=")[^"]*(")/i,
      `$1Picture of ${safeName}$2`,
    );
    out = out.replace(
      /(<div class="elementor-author-box__text">\s*<a href=")[^"]*(")/i,
      `$1${url}$2`,
    );
    out = out.replace(
      /(<div class="elementor-author-box__name">)\s*[^<]*?(<\/div>)/i,
      `$1\n\t\t\t\t\t\t\t${safeName}\t\t\t\t\t\t$2`,
    );
    if (bio) {
      if (/elementor-author-box__bio/i.test(out)) {
        out = out.replace(
          /(<div class="elementor-author-box__bio">)[\s\S]*?(<\/div>)/i,
          `$1\n\t\t\t\t\t\t${safeBio}\t\t\t\t\t$2`,
        );
      } else {
        out = out.replace(
          /(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="elementor-element elementor-element-9c6d476)/i,
          `<div class="elementor-author-box__bio">\n\t\t\t\t\t\t${safeBio}\t\t\t\t\t</div>\n\t\t\t\t\n\t\t\t\t\t\t\t</div>\n\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t$1`,
        );
      }
    }
  }

  // Meta author
  if (/name=["']author["']/i.test(out)) {
    out = out.replace(
      /<meta\s+name=["']author["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="author" content="${safeName}" />`,
    );
  }

  // JSON-LD Person / author name + url (best-effort)
  out = out.replace(
    /("author"\s*:\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*")[^"]*(")/i,
    `$1${safeName}$2`,
  );
  out = out.replace(
    /("author"\s*:\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"[^"]*"\s*,\s*"url"\s*:\s*")[^"]*(")/i,
    `$1${url}$2`,
  );

  // Legacy schema still embeds Nakul's old biography / avatar caption
  if (bio) {
    const jsonBio = JSON.stringify(bio).slice(1, -1);
    out = out.replace(
      /I currently work as Head of Recruitment and Sales at Kinza HR in Dubai, UAE\.[\s\S]*?Verticals - IT, Finance and Banking, Insurance, Healthcare, FMCG, Retail, and more\./g,
      jsonBio,
    );
  }
  out = out.replace(/"caption"\s*:\s*"Nakul Sachdeva"/g, `"caption":"${safeName}"`);
  out = out.replace(
    /\/wp-content\/uploads\/2024\/05\/Nakul-Sachdeva-2(?:-\d+x\d+)?\.png/g,
    avatarSrc,
  );

  // Leftover retired author archive URLs → live author for this post
  out = out.replace(
    /\/author\/(?:dylan-wesley|tanzyn-giovanna-amisha-stanley|binju-t-robert|siva-rama-krishnan|nakul)\//gi,
    url,
  );
  if (slug !== 'nakul-sachdeva') {
    out = out.replace(/\/author\/nakul-sachdeva\//gi, url);
  }

  return out;
}

/**
 * Replace the frozen Popular Articles grid with related cards for this post.
 */
export function injectPopularArticlesHtml(html: string, post: BlogPost): string {
  if (!html || !/Popular Articles/i.test(html)) return html;
  if (!html.includes('elementor-element-80908c4')) return html;

  const bodyIdx = html.indexOf('<body');
  const widgetIdx = html.indexOf('elementor-element-80908c4', bodyIdx > 0 ? bodyIdx : 0);
  if (widgetIdx < 0) return html;

  const containerOpen = html.indexOf('elementor-posts-container', widgetIdx);
  if (containerOpen < 0) return html;

  const firstArticle = html.indexOf('<article', containerOpen);
  if (firstArticle < 0) return html;

  const footerIdx = html.indexOf('elementor-location-footer', firstArticle);
  const searchEnd = footerIdx > 0 ? footerIdx : html.length;
  const lastArticle = html.lastIndexOf('</article>', searchEnd);
  if (lastArticle < firstArticle) return html;

  const replaceEnd = lastArticle + '</article>'.length;
  const related = getRelatedPosts(post, 3);
  const cards = related.map((p) => buildPopularArticleCardHtml(p)).join('\n');
  return html.slice(0, firstArticle) + cards + html.slice(replaceEnd);
}

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
    .replace('<!--ASTRO_BLOG:AUTHOR-->', post.authorHtml || buildAuthorHtml(post.author, post))
    .replace(
      '<!--ASTRO_BLOG:TITLE-->',
      `<h1 class="elementor-heading-title elementor-size-default">${escapeHtml(post.title)}</h1>`,
    )
    .replace('<!--ASTRO_BLOG:CONTENT-->', sanitizeCmsHtml(post.contentHtml || ''))
    .replace('<!--ASTRO_BLOG:DATE-->', buildDateHtml(post.publishedAt))
    .replace('<!--ASTRO_BLOG:TOC-->', buildTocHtml(post.toc));

  html = injectPopularArticlesHtml(html, post);
  html = injectElementorTocHtml(html, post.toc || []);
  html = patchHeadMeta(html, post);
  html = injectBlogSchemas(html, post);

  if (!html.includes('astro-blog-toc-css')) {
    html = html.replace('</head>', `${TOC_STYLES}\n${TOC_SCRIPT}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      '</body>',
      `<script src="/js/astro-mirror-fixes.js?v=${MIRROR_FIXES_CACHE_BUST}" defer></script>\n</body>`,
    );
  }

  html = bustMirrorFixesHtml(html);
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
  let html = assembleBlogPostHtml(post);
  html = injectLiveAuthorIntoMirrorHtml(html, post);
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

/** Insights /blog/ ECS cards (Elementor custom skin loop template 1176). */
export function buildInsightsCardHtml(post: BlogPost): string {
  const category = post.categories[0];
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  // Live Elementor excerpts land ~125–130 chars; keep height near the 300px card.
  const excerpt = escapeHtml(getPostExcerpt(post, 130));
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const catClass = category
    ? ` category-${(category.slug || getCategorySlug(category)).toLowerCase().replace(/\s+/g, '-')}`
    : '';
  // Stable DOM id for scoped background-image CSS (mirrors WP #post-{id})
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;
  const classBits = `elementor-post elementor-grid-item ecs-post-loop ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClass}`;
  const bgStyle = imgSrc
    ? `<style>#${postDomId} .elementor-1176 .elementor-element.elementor-element-fbbce9b:not(.elementor-motion-effects-element-type-background) > .elementor-widget-wrap, #${postDomId} .elementor-1176 .elementor-element.elementor-element-fbbce9b > .elementor-widget-wrap > .elementor-motion-effects-container > .elementor-motion-effects-layer{background-image: url("${imgSrc}");}</style>`
    : '';

  return `<article id="${postDomId}" class="${classBits}">
${bgStyle}<div data-elementor-type="loop" data-elementor-id="1176" class="elementor elementor-1176 ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClass}" data-elementor-post-type="elementor_library">
<section class="elementor-section elementor-top-section elementor-element elementor-element-f00547e elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="f00547e" data-element_type="section" data-e-type="section">
<div class="elementor-container elementor-column-gap-default">
<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-fbbce9b" data-id="fbbce9b" data-element_type="column" data-e-type="column" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
<div class="elementor-widget-wrap elementor-element-populated">
<div class="elementor-element elementor-element-7552501 elementor-widget elementor-widget-spacer" data-id="7552501" data-element_type="widget" data-e-type="widget" data-widget_type="spacer.default">
<div class="elementor-widget-container">
<div class="elementor-spacer">
<div class="elementor-spacer-inner"></div>
</div>
</div>
</div>
</div>
</div>
<div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-957b7ed" data-id="957b7ed" data-element_type="column" data-e-type="column">
<div class="elementor-widget-wrap elementor-element-populated">
<div class="elementor-element elementor-element-0f6369c elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="0f6369c" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
<div class="elementor-widget-container">
<div class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></div>
</div>
</div>
<div class="elementor-element elementor-element-26c4908 elementor-widget elementor-widget-theme-post-excerpt" data-id="26c4908" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
<div class="elementor-widget-container">
<p>${excerpt}</p>
</div>
</div>
<div class="elementor-element elementor-element-98d9df6 elementor-align-left elementor-widget elementor-widget-button" data-id="98d9df6" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
<div class="elementor-widget-container">
<div class="elementor-button-wrapper">
<a class="elementor-button elementor-button-link elementor-size-sm" href="${postUrl}">
<span class="elementor-button-content-wrapper">
<span class="elementor-button-icon">
<i aria-hidden="true" class="fas fa-arrow-right"></i>
</span>
<span class="elementor-button-text">Read More</span>
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
