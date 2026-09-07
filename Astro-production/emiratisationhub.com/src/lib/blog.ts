/**
 * Blog post types, TOC builder, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { sanitizeCmsHtml } from '@connect/site-cms';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { injectRuntimeGtmLoader } from './gtm/inject';

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, 'src/content/blog');
const WP_BLOG_ORDER_PATH = join(ROOT, 'src/data/wp-blog-order.json');
const SHELL_PATH = join(ROOT, 'src/legacy/blog-shell/template.html');
const ORIGIN = '';

/** Production host for absolute SEO URLs (canonical / og:url). Prefer env; never leave relative. */
function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || ORIGIN).trim().replace(/\/$/, '') || ORIGIN;
}

function absoluteSeoUrl(value: string, fallbackPath = '/'): string {
  try {
    return new URL(value || fallbackPath, `${siteOrigin()}/`).href;
  } catch {
    return `${siteOrigin()}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
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

function listBlogJsonSlugs(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${name.name}` : name.name;
    if (name.isDirectory()) {
      out.push(...listBlogJsonSlugs(join(dir, name.name), rel));
    } else if (name.isFile() && name.name.endsWith('.json')) {
      out.push(rel.replace(/\.json$/, ''));
    }
  }
  return out;
}

export function getAllBlogSlugs(): string[] {
  return listBlogJsonSlugs(BLOG_DIR).filter((slug) => {
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
  return `<img width="1024" height="576" src="${img.src}" class="attachment-large size-large wp-post-image" alt="${alt}" loading="eager" decoding="async" />`;
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
  const url = categories[0]?.url || '/category/staffing/';
  const localUrl = url.replace(ORIGIN, '');
  return `<i class="fal fa-tag"></i><a class="term-staffing" href="${localUrl}">${escapeHtml(name)}</a>`;
}

function buildAuthorHtml(author: BlogPost['author']): string {
  const name = escapeHtml(author.name || 'Emiratisation Hub');
  const slug = author.slug || (author.url ? author.url.replace(ORIGIN, '').replace(/^\/author\/|\/$/g, '') : 'connect-2');
  const url = `/author/${slug}/`;
  return `<a href="${url}" class="fn">${name}</a>`;
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
  if (ogImage) {
    if (out.includes('property="og:image"')) {
      out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`);
    } else {
      out = out.replace('</head>', `<meta property="og:image" content="${ogImage}" />\n</head>`);
    }
  }
  return out;
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
</style>
<script id="astro-blog-toc-js">
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
      `<h1 class="w-post-elm post_title us_custom_daf733d3 single_wp_heading entry-title color_link_inherit">${escapeHtml(post.title)}</h1>`,
    )
    .replace('<!--ASTRO_BLOG:CONTENT-->', sanitizeCmsHtml(post.contentHtml || ''))
    .replace('<!--ASTRO_BLOG:DATE-->', buildDateHtml(post.publishedAt))
    .replace('<!--ASTRO_BLOG:TOC-->', buildTocHtml(post.toc));

  html = patchHeadMeta(html, post);

  if (!html.includes('astro-blog-toc-css')) {
    html = html.replace('</head>', `${TOC_STYLES}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260819-icons3" defer></script>\n</body>');
  } else if (!html.includes('astro-mirror-fixes.js?v=20260819-icons3')) {
    html = html.replace(/astro-mirror-fixes\.js(?:\?[^"']*)?/g, 'astro-mirror-fixes.js?v=20260819-icons3');
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
  out = out.replace(/href="\/cdn-cgi\/l\/email-protection#[^"]+"/gi, 'href="mailto:contact@emiratisationhub.com"');
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
export const AUTHOR_POSTS_PER_PAGE = 12;
/** Live /blog/ shows 1 featured (loop 1975) + 4 grid cards (loop 1985). */
export const ARCHIVE_POSTS_PER_PAGE = 5;
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
  const fromDesc = stripHtml(post.description || '');
  if (fromDesc) {
    if (fromDesc.length <= maxLength) return fromDesc;
    const sliced = fromDesc.slice(0, maxLength);
    const lastSpace = sliced.lastIndexOf(' ');
    return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
  }
  return excerptFromContent(post.contentHtml || '', maxLength);
}

function humanizeSlug(slug: string): string {
  return String(slug || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Author exports often store an <img> avatar as `name` — resolve a real display name. */
export function resolveAuthorDisplayName(post: Pick<BlogPost, 'author'>): string {
  const raw = String(post.author?.name || '');
  let name = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name && !/^picture of\s+/i.test(name)) return name;

  const alt = raw.match(/\balt=["']([^"']+)["']/i)?.[1] || '';
  name = alt.replace(/^Picture of\s+/i, '').trim();
  if (name) return name;

  const slug = String(post.author?.slug || '').trim();
  if (slug) {
    const authorPath = join(ROOT, 'src/content/authors', `${slug}.json`);
    if (existsSync(authorPath)) {
      try {
        const author = JSON.parse(readFileSync(authorPath, 'utf8')) as { name?: string };
        const fromFile = String(author.name || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (fromFile && !fromFile.startsWith('<') && !/^https?:\/\//i.test(fromFile)) {
          return fromFile;
        }
      } catch {
        /* ignore */
      }
    }
    return humanizeSlug(slug);
  }

  return 'Emiratisation Hub';
}

/** Elementor loop-grid card (template 5894) on /blog/. */
export function buildKpmproBlogLoopCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 120));
  const authorSlug = getAuthorSlugFromPost(post) || '';
  const authorUrl = authorSlug ? `/author/${authorSlug}/` : '#';
  const authorName = escapeHtml(resolveAuthorDisplayName(post));
  const authorAvatarMatch = String(post.author?.name || '').match(/src=["']([^"']+)["']/i);
  const authorAvatar = authorAvatarMatch?.[1] || '/wp-content/uploads/2024/05/cropped-Group-39929-200x200.png';
  const imgTag = imgSrc
    ? `<img loading="lazy" decoding="async" width="1500" height="1000" src="${imgSrc}" class="attachment-full size-full" alt="${imgAlt}" />`
    : '';

  return `<div data-elementor-type="loop-item" data-elementor-id="5894" class="elementor elementor-5894 e-loop-item post type-post status-publish format-standard has-post-thumbnail hentry" data-elementor-post-type="elementor_library" data-custom-edit-handle="1">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-d3dabbd elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="d3dabbd" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-a830b31" data-id="a830b31" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-5ee249c elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${postUrl}">${imgTag}</a>
															</div>
				</div>
				<div class="elementor-element elementor-element-f1ba8fd elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-bf5a7f6 elementor-widget elementor-widget-theme-post-excerpt" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}				</div>
				</div>
				<section class="elementor-section elementor-inner-section elementor-element elementor-element-b0b500a elementor-section-content-middle elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-f791ecb" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-a2e8035 elementor-widget elementor-widget-post-info" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-2ab385c elementor-inline-item" >
						<a href="${authorUrl}">
											<span class="elementor-icon-list-icon">
								<img width="96" height="96" decoding="async" class="elementor-avatar" src="${authorAvatar}" alt="${authorName}" loading="lazy">
							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">${authorName}</span>
									</a>
				</li>
				</ul>
						</div>
				</div>
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-e2de78d" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-7f62f2a elementor-widget elementor-widget-image" data-widget_type="image.default">
				<div class="elementor-widget-container">
																<a href="${postUrl}">
							<img decoding="async" width="35" height="34" src="/wp-content/uploads/2024/10/iconoir_arrow-left.svg" class="attachment-large size-large wp-image-5904" alt="iconoir_arrow-left" />								</a>
															</div>
				</div>
					</div>
		</div>
					</div>
		</section>
					</div>
		</div>
					</div>
		</section>
				</div>`;
}

/** Emiratisation Hub featured card — Elementor loop template 1975. */
export function buildFeaturedPostCardHtml(post: BlogPost): string {
  const categoriesHtml = post.categories
    .slice(0, 3)
    .map((c) => `<span class="elementor-post-info__terms-list-item">${escapeHtml(c.name)}</span>`)
    .join(', ');
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const dateDisplay = formatDate(post.publishedAt);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 140));
  const authorName = escapeHtml(resolveAuthorDisplayName(post));
  const catClasses = post.categories
    .map((c) => ` category-${(c.slug || getCategorySlug(c)).toLowerCase().replace(/\s+/g, '-')}`)
    .join('');
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;
  const imgTag = imgSrc
    ? `<img fetchpriority="high" decoding="async" width="800" height="450" src="${imgSrc}" class="attachment-large size-large" alt="${imgAlt}" />`
    : '';

  return `<article id="${postDomId}" class="elementor-post elementor-grid-item ecs-post-loop ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClasses}">
				<div data-elementor-type="loop" data-elementor-id="1975" class="elementor elementor-1975 ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClasses}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-f90b58e elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="f90b58e" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-0e21cd3" data-id="0e21cd3" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-f0ea16f elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="f0ea16f" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${postUrl}">
							${imgTag}								</a>
															</div>
				</div>
				${
          categoriesHtml
            ? `<div class="elementor-element elementor-element-43efb39 elementor-widget__width-auto elementor-absolute elementor-widget elementor-widget-post-info" data-id="43efb39" data-element_type="widget" data-e-type="widget" data-settings="{&quot;_position&quot;:&quot;absolute&quot;}" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-1df0964 elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				${categoriesHtml}				</span>
					</span>
								</li>
				</ul>
						</div>
				</div>`
            : ''
        }
				<div class="elementor-element elementor-element-b993491 elementor-widget elementor-widget-post-info" data-id="b993491" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-f3d8c7f elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${escapeHtml(dateDisplay)}</time>					</span>
								</li>
				<li class="elementor-icon-list-item elementor-repeater-item-b4b5bd9 elementor-inline-item" itemprop="author">
										<span class="elementor-icon-list-icon">
								<i aria-hidden="true" class="fas fa-circle"></i>							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
							<span class="elementor-post-info__item-prefix">&nbsp;&nbsp;by</span>
										${authorName}					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-ad018c1 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="ad018c1" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-713cdb1 elementor-widget elementor-widget-theme-post-excerpt" data-id="713cdb1" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-excerpt.default">
				<div class="elementor-widget-container">
					<p>${excerpt}</p>				</div>
				</div>
					</div>
		</div>
					</div>
		</section>
				</div>
				</article>`;
}

/** Insights cards (legacy helper). */
export function buildInsightsCardHtml(post: BlogPost): string {
  const categoriesHtml = post.categories
    .slice(0, 4)
    .map((c) => `<span class="elementor-post-info__terms-list-item">${escapeHtml(c.name)}</span>`)
    .join(', ');
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const dateDisplay = formatDate(post.publishedAt);
  const catClasses = post.categories
    .map((c) => ` category-${(c.slug || getCategorySlug(c)).toLowerCase().replace(/\s+/g, '-')}`)
    .join('');
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;
  const classBits = `elementor-post elementor-grid-item ecs-post-loop ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClasses}`;
  const imgTag = imgSrc
    ? `<img loading="lazy" decoding="async" width="800" height="450" src="${imgSrc}" class="attachment-large size-large" alt="${imgAlt}" />`
    : '';

  return `<article id="${postDomId}" class="${classBits}">
				<div data-elementor-type="loop" data-elementor-id="124" class="elementor elementor-124 ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClasses}" data-elementor-post-type="elementor_library">
					<section data-particle_enable="false" data-particle-mobile-disabled="false" class="elementor-section elementor-top-section elementor-element elementor-element-236d962 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="236d962" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-3251419" data-id="3251419" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-250e722 elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="250e722" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${postUrl}">
							${imgTag}								</a>
															</div>
				</div>
				<div class="elementor-element elementor-element-40acfd9 elementor-widget elementor-widget-post-info" data-id="40acfd9" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-a806943 elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${escapeHtml(dateDisplay)}</time>					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-720193c elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="720193c" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h2>				</div>
				</div>
				<div class="elementor-element elementor-element-494b02e elementor-widget elementor-widget-post-info" data-id="494b02e" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-bd96b6f elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				${categoriesHtml}				</span>
					</span>
								</li>
				</ul>
						</div>
				</div>
					</div>
		</div>
					</div>
		</section>
				</div>
				</article>`;
}

/** Emiratisation Hub grid card — Elementor loop template 1985. */
export function buildPostCardHtml(post: BlogPost): string {
  const categoriesHtml = post.categories
    .slice(0, 3)
    .map((c) => `<span class="elementor-post-info__terms-list-item">${escapeHtml(c.name)}</span>`)
    .join(', ');
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const dateDisplay = formatDate(post.publishedAt);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const authorName = escapeHtml(resolveAuthorDisplayName(post));
  const catClasses = post.categories
    .map((c) => ` category-${(c.slug || getCategorySlug(c)).toLowerCase().replace(/\s+/g, '-')}`)
    .join('');
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;
  const imgTag = imgSrc
    ? `<img decoding="async" width="800" height="450" src="${imgSrc}" class="attachment-large size-large" alt="${imgAlt}" loading="lazy" />`
    : '';

  // Match Elementor loop template 1985 markup (widget 173ffbd) so post-1985.css
  // applies the correct 20px card title — not the single-post page-title size.
  return `<article id="${postDomId}" class="elementor-post elementor-grid-item ecs-post-loop ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClasses}">
				<div data-elementor-type="loop" data-elementor-id="1985" class="elementor elementor-1985 elementor-location-single ${postDomId} type-post status-publish format-standard has-post-thumbnail hentry${catClasses}" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-d3a6f07 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="d3a6f07" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-c251a4c" data-id="c251a4c" data-element_type="column" data-e-type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-63667ce elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-id="63667ce" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-featured-image.default">
				<div class="elementor-widget-container">
																<a href="${postUrl}">
							${imgTag}								</a>
															</div>
				</div>
				${
          categoriesHtml
            ? `<div class="elementor-element elementor-element-32380b2 elementor-widget__width-auto elementor-absolute elementor-widget elementor-widget-post-info" data-id="32380b2" data-element_type="widget" data-e-type="widget" data-settings="{&quot;_position&quot;:&quot;absolute&quot;}" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-1df0964 elementor-inline-item" itemprop="about">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-terms">
										<span class="elementor-post-info__terms-list">
				${categoriesHtml}				</span>
					</span>
								</li>
				</ul>
						</div>
				</div>`
            : ''
        }
				<div class="elementor-element elementor-element-cddb253 elementor-widget elementor-widget-post-info" data-id="cddb253" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-f3d8c7f elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${escapeHtml(dateDisplay)}</time>					</span>
								</li>
				<li class="elementor-icon-list-item elementor-repeater-item-b4b5bd9 elementor-inline-item" itemprop="author">
										<span class="elementor-icon-list-icon">
								<i aria-hidden="true" class="fas fa-circle"></i>							</span>
									<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
							<span class="elementor-post-info__item-prefix">&nbsp;&nbsp;by</span>
										${authorName}					</span>
								</li>
				</ul>
						</div>
				</div>
				<div class="elementor-element elementor-element-173ffbd elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="173ffbd" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h2>				</div>
				</div>
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
  const posts = getAllBlogSlugs()
    .map((slug) => getBlogPost(slug))
    .filter((p): p is BlogPost => p !== null);

  const order = loadWpBlogOrder();
  if (!order.length) {
    return posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const ordered: BlogPost[] = [];
  const seen = new Set<string>();
  for (const slug of order) {
    const post = bySlug.get(slug);
    if (post) {
      ordered.push(post);
      seen.add(slug);
    }
  }
  const rest = posts
    .filter((p) => !seen.has(p.slug))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  // CMS posts not in the WP order file must appear first so newly published
  // articles show at the top of Insights without a manual order-file edit.
  return [...rest, ...ordered];
}

function loadWpBlogOrder(): string[] {
  if (!existsSync(WP_BLOG_ORDER_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(WP_BLOG_ORDER_PATH, 'utf8'));
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function getAuthorSlugFromPost(post: BlogPost): string | null {
  if (post.author.slug) return post.author.slug;
  if (post.author.url) {
    const m = post.author.url.match(/\/authors?\/([^/]+)/);
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

/**
 * Related articles for a single post: only posts that share a category or tag.
 * Always excludes the current slug. Does not fill with unrelated recent posts.
 */
export function getRelatedPosts(post: BlogPost, limit = 4): BlogPost[] {
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
        const otherPrimary = i === 0;
        score += otherPrimary && slug === primarySlug ? 5 : 3;
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

  return scored.map((row) => row.p).slice(0, limit);
}

/**
 * Swap the frozen Elementor "Related Articles" grid (widget 14ff441) with
 * cards for the current post. Leaves the heading and card chrome unchanged.
 */
export function injectRelatedArticlesHtml(html: string, slug: string): string {
  if (!html || !slug) return html;
  if (!/Related Articles/i.test(html)) return html;
  if (!html.includes('elementor-element-14ff441')) return html;

  const post = getBlogPost(slug);
  if (!post) return html;

  const related = getRelatedPosts(post, 4);

  // Prefer the live posts widget in <body> — ignore any CSS selector text in <head>.
  const bodyIdx = html.indexOf('<body');
  const widgetIdx = html.indexOf('elementor-element-14ff441', bodyIdx > 0 ? bodyIdx : 0);
  if (widgetIdx < 0) return html;
  const ecsOpen = html.indexOf('ecs-posts', widgetIdx);
  if (ecsOpen < 0) return html;

  const firstArticle = html.indexOf('<article', ecsOpen);
  if (firstArticle < 0) return html;

  const footerIdx = html.indexOf('elementor-location-footer', firstArticle);
  const searchEnd = footerIdx > 0 ? footerIdx : html.length;
  const lastArticle = html.lastIndexOf('</article>', searchEnd);
  if (lastArticle < firstArticle) return html;

  const replaceEnd = lastArticle + '</article>'.length;
  // Only same-category/tag posts — never keep the frozen WP snapshot fillers.
  const cards = related.length ? related.map((p) => buildPostCardHtml(p)).join('\n') : '';
  let out = html.slice(0, firstArticle) + cards + html.slice(replaceEnd);

  // Keep related card titles at loop-1985 size (20px), not single-post page-title size.
  if (!out.includes('astro-related-articles-css')) {
    const css = `<style id="astro-related-articles-css">
.elementor-element-14ff441 .elementor-1985 .elementor-element-173ffbd .elementor-heading-title{
  font-family:Poppins,sans-serif;font-size:20px;font-weight:600;line-height:26px;letter-spacing:-0.6px;color:#121212;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
.elementor-element-14ff441 .elementor-1985 .elementor-element-173ffbd .elementor-heading-title a{color:inherit;text-decoration:none}
@media(max-width:1024px){.elementor-element-14ff441 .elementor-1985 .elementor-element-173ffbd .elementor-heading-title{font-size:18px;line-height:23px}}
@media(max-width:767px){.elementor-element-14ff441 .elementor-1985 .elementor-element-173ffbd .elementor-heading-title{font-size:22px;line-height:28px}}
</style>`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${css}\n</head>`) : css + out;
  }

  return out;
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
