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
const ORIGIN = 'https://emiratisationgate.org';

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
  const name = escapeHtml(author.name || 'Emiratisation Gate');
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
    .replace('<!--ASTRO_BLOG:CONTENT-->', post.contentHtml)
    .replace('<!--ASTRO_BLOG:DATE-->', buildDateHtml(post.publishedAt))
    .replace('<!--ASTRO_BLOG:TOC-->', buildTocHtml(post.toc));

  html = patchHeadMeta(html, post);

  if (!html.includes('astro-blog-toc-css')) {
    html = html.replace('</head>', `${TOC_STYLES}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260806-flag4" defer></script>\n</body>');
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
  out = out.replace(/href="\/cdn-cgi\/l\/email-protection#[^"]+"/gi, 'href="mailto:contact@emiratisationgate.org"');
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
/** Elementor author archive cards — match live ~9 posts / page */
export const AUTHOR_POSTS_PER_PAGE = 9;
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

/**
 * Blog /blog/ Load More cards — Elementor loop template 987 (layout-1).
 * Matches the static ECS grid in blog.cleaned.html (regular cards after Featured).
 */
export function buildInsightsCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const dateDisplay = formatDate(post.publishedAt);
  const authorName = escapeHtml(post.author?.name || 'Admin');
  const catClasses = post.categories
    .map((c) => ` category-${(c.slug || getCategorySlug(c)).toLowerCase().replace(/\s+/g, '-')}`)
    .join('');
  const postDomId = `post-${post.slug.replace(/[^a-z0-9_-]/gi, '-')}`;
  const classBits = `elementor-post elementor-grid-item ecs-post-loop ${postDomId} post type-post status-publish format-standard has-post-thumbnail hentry${catClasses} ast-article-single`;
  const bgStyle = imgSrc
    ? `#${postDomId} .elementor-987 .elementor-element.elementor-element-8e3bc90:not(.elementor-motion-effects-element-type-background) > .elementor-widget-wrap, #${postDomId} .elementor-987 .elementor-element.elementor-element-8e3bc90 > .elementor-widget-wrap > .elementor-motion-effects-container > .elementor-motion-effects-layer{background-image: url("${imgSrc}");}`
    : '';

  return `<article id="${postDomId}" class="${classBits}">
				<div data-elementor-type="loop" data-elementor-id="987" class="elementor elementor-987 ${postDomId} post type-post status-publish format-standard has-post-thumbnail hentry${catClasses} ast-article-single" data-elementor-post-type="elementor_library">
					<section class="elementor-section elementor-top-section elementor-element elementor-element-891cd93 layout-1 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="891cd93" data-element_type="section" data-e-type="section">
						<div class="elementor-container elementor-column-gap-default">
			<style>${bgStyle}</style>		<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-8e3bc90" data-id="8e3bc90" data-element_type="column" data-e-type="column" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
			<div class="elementor-widget-wrap elementor-element-populated">
					<div class="elementor-background-overlay"></div>
						<div class="elementor-element elementor-element-0106ff9 elementor-widget elementor-widget-spacer" data-id="0106ff9" data-element_type="widget" data-e-type="widget" data-widget_type="spacer.default">
				<div class="elementor-widget-container">
							<div class="elementor-spacer">
			<div class="elementor-spacer-inner"></div>
		</div>
						</div>
				</div>
				<div class="elementor-element elementor-element-6792bd4 elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-id="6792bd4" data-element_type="widget" data-e-type="widget" data-widget_type="theme-post-title.default">
				<div class="elementor-widget-container">
					<h3 class="elementor-heading-title elementor-size-default"><a href="${postUrl}">${title}</a></h3>				</div>
				</div>
				<div class="elementor-element elementor-element-c4af0d4 elementor-align-left elementor-widget elementor-widget-post-info" data-id="c4af0d4" data-element_type="widget" data-e-type="widget" data-widget_type="post-info.default">
				<div class="elementor-widget-container">
							<ul class="elementor-inline-items elementor-icon-list-items elementor-post-info">
								<li class="elementor-icon-list-item elementor-repeater-item-65cfb6d elementor-inline-item" itemprop="author">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-author">
										${authorName}					</span>
								</li>
				<li class="elementor-icon-list-item elementor-repeater-item-ae81fc1 elementor-inline-item" itemprop="datePublished">
													<span class="elementor-icon-list-text elementor-post-info__item elementor-post-info__item--type-date">
										<time>${escapeHtml(dateDisplay)}</time>					</span>
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
