/**
 * Shared archive page assembly for insights, category, and tag listings.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { injectRuntimeGtmLoader } from './gtm/inject';
import {
  ARCHIVE_POSTS_PER_PAGE,
  TAG_POSTS_PER_PAGE,
  buildArchiveCardHtml,
  buildFeaturedPostCardHtml,
  buildPostCardHtml,
  getAllBlogPosts,
  getAllCategorySlugs,
  getAllTagSlugs,
  getCategorySlug,
  getPostsByCategorySlug,
  getPostsByTagSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const INSIGHTS_PATH = join(ROOT, 'src/legacy/blog.cleaned.html');
const TAG_SHELL_PATH = join(ROOT, 'src/legacy/tag-shell/template.html');
const ORIGIN = '';

export interface ArchivePageData {
  type: 'blog' | 'category' | 'tag';
  slug?: string;
  title: string;
  description: string;
  canonical: string;
  posts: BlogPost[];
  currentPage: number;
  totalPages: number;
  totalPosts: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPaginationHtml(basePath: string, currentPage: number, totalPages: number): string {
  if (totalPages <= 1) return '';

  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const items: string[] = [];

  for (let p = 1; p <= totalPages; p++) {
    const href = p === 1 ? base : `${base}page/${p}/`;
    if (p === currentPage) {
      items.push(
        `<span aria-current="page" class="page-numbers current"><span class="elementor-screen-only">Page</span>${p}</span>`,
      );
    } else {
      items.push(
        `<a class="page-numbers" href="${href}"><span class="elementor-screen-only">Page</span>${p}</a>`,
      );
    }
  }

  return `<nav class="elementor-pagination" role="navigation" aria-label="Pagination">${items.join('\n')}</nav>`;
}

const CATEGORY_DROPDOWN_SCRIPT = `<script>
(function () {
  var dropdown = document.getElementById('wp-block-categories-1');
  if (!dropdown) return;
  dropdown.addEventListener('change', function () {
    if (dropdown.value && dropdown.value !== '-1') {
      window.location.href = '/category/' + dropdown.value + '/';
    }
  });
})();
</script>`;

function getLoopCardStyles(): string {
  const path = join(ROOT, 'src/legacy/loop-card-24831.css.html');
  if (existsSync(path)) return readFileSync(path, 'utf8');
  return '';
}

const ARCHIVE_FIX_STYLES = `<style id="astro-archive-fix-css">
/* Match live Blog canvas */
html body.page-id-401,
html body.elementor-page-401,
html body.page-id-blog,
html body.elementor-page-blog{
  background-color:#ffffff !important;
  background-image:none !important;
}
.e-font-icon-svg{width:1em;height:1em;display:inline-block;vertical-align:middle}
/* Featured hero (loop 714): single full-width card */
.elementor-element-eb26798 .ecs-posts.elementor-posts-container{
  display:block !important;
  grid-template-columns:none !important;
}
.elementor-element-eb26798 .ecs-posts > .elementor-post{width:100%;max-width:100%;}
.elementor-714 .elementor-element-f8a3136 img,
.elementor-714 .elementor-widget-theme-post-featured-image img{
  width:100%;height:auto;display:block;object-fit:cover;aspect-ratio:16/9;border-radius:8px;
}
.elementor-714{
  background:#0B092D;
  border-radius:12px;
  overflow:hidden;
}
.elementor-714 .elementor-container{
  display:flex;
  align-items:stretch;
}
.elementor-714 .elementor-col-50{width:50%;}
.elementor-714 .elementor-element-a4b52c2 > .elementor-element-populated,
.elementor-714 .elementor-element-a4b52c2 .elementor-widget-wrap{
  background:#0B092D;
  min-height:100%;
}
.elementor-714 .elementor-button{
  color:#fff !important;
  border-color:#fff !important;
}
.elementor-714 .elementor-heading-title a{color:#fff !important;text-decoration:none;}
.elementor-714 .elementor-element-f8a3136 img{height:350px;object-fit:cover;border-radius:0;}

/* Main grid (loop 244): 3 columns on desktop like live */
.elementor-element-b877973 .ecs-posts.elementor-posts-container{
  display:grid !important;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:30px;
}
@media (max-width:1024px){
  .elementor-element-b877973 .ecs-posts.elementor-posts-container{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media (max-width:767px){
  .elementor-element-b877973 .ecs-posts.elementor-posts-container{grid-template-columns:1fr;}
  .elementor-714 .elementor-container{flex-direction:column;}
  .elementor-714 .elementor-col-50{width:100%;}
}
.elementor-244 .elementor-widget-theme-post-featured-image img{
  width:100%;height:auto;display:block;object-fit:cover;aspect-ratio:16/9;border-radius:8px 8px 0 0;
}
.elementor-244 .elementor-heading-title a{text-decoration:none;color:#0B092D;}
.elementor-244 .elementor-heading-title a:hover{color:#1C1CD1;}
.astro-archive-heading{font-size:1.75rem;font-weight:700;margin:0 0 1.5rem;color:#070c13}
</style>`;

const TAG_CARD_FIX_STYLES = `<style id="astro-tag-archive-css">
.elementor-posts--skin-cards .elementor-post__thumbnail img{width:100%;height:auto;display:block;object-fit:cover;aspect-ratio:16/9}
.elementor-posts--skin-cards .elementor-post__card{position:relative;overflow:hidden;background:#fff;box-shadow:0 0 10px rgba(0,0,0,.08);height:100%}
.elementor-posts--skin-cards .elementor-post__badge{position:absolute;top:12px;left:0;background:#23369b;color:#fff;font-size:12px;font-weight:600;padding:6px 12px;z-index:2}
.elementor-posts--skin-cards .elementor-post__text{padding:16px 18px 20px}
.elementor-posts--skin-cards .elementor-post__title{font-size:20px;line-height:1.35;margin:0 0 12px;font-weight:700}
.elementor-posts--skin-cards .elementor-post__title a{color:#070c13;text-decoration:none}
.elementor-posts--skin-cards .elementor-post__title a:hover{color:#d71216}
.elementor-posts--skin-cards .elementor-post__read-more{color:#23369b;font-weight:600;text-decoration:none;font-size:14px}
.elementor-posts--skin-cards .elementor-post__read-more:hover{color:#d71216}
.astro-tag-pagination{margin:2rem 0;text-align:center}
.astro-tag-pagination .page-numbers{display:inline-block;margin:0 4px;padding:8px 12px;text-decoration:none;color:#23369b}
.astro-tag-pagination .page-numbers.current{font-weight:700;color:#070c13}
</style>`;

function paginatePosts(posts: BlogPost[], page: number, perPage = ARCHIVE_POSTS_PER_PAGE) {
  const totalPosts = posts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    posts: posts.slice(start, start + perPage),
    currentPage,
    totalPages,
    totalPosts,
  };
}

function getArchiveBasePath(data: ArchivePageData): string {
  if (data.type === 'blog') return '/blog/';
  if (data.type === 'category') return `/category/${data.slug}/`;
  return `/tag/${data.slug}/`;
}

/** Blog + category pages use the Blog Elementor template + Evolution loop cards. */
function injectInsightsContent(html: string, data: ArchivePageData): string {
  const $ = cheerio.load(html);
  const ecsList = $('.ecs-posts');

  // Evolution blog has two loops: featured (grid-1 / template 714) + grid (grid-3 / template 244).
  if (ecsList.length >= 2) {
    const featured = data.posts[0] ? buildFeaturedPostCardHtml(data.posts[0]) : '';
    const gridHtml = data.posts.map((p) => buildPostCardHtml(p)).join('\n');
    $(ecsList[0]).html(featured);
    $(ecsList[1]).html(gridHtml);
  } else if (ecsList.length === 1) {
    $(ecsList[0]).html(data.posts.map((p) => buildPostCardHtml(p)).join('\n'));
  }

  const pagination = buildPaginationHtml(getArchiveBasePath(data), data.currentPage, data.totalPages);
  const pagNav = $('.elementor-pagination').first();
  if (pagNav.length) pagNav.replaceWith(pagination);
  else if (ecsList.length) $(ecsList[ecsList.length - 1]).parent().append(pagination);

  if (data.type === 'category') {
    const heading = `<h1 class="astro-archive-heading">${escapeHtml(data.title)}</h1>`;
    const sidebarCol = $('.elementor-col-66 .elementor-widget-wrap').first();
    if (sidebarCol.length) sidebarCol.prepend(heading);
  }

  $('script').each((_, el) => {
    const content = $(el).html() || '';
    if (content.includes('wp-block-categories-1')) {
      $(el).replaceWith(CATEGORY_DROPDOWN_SCRIPT);
    }
  });

  $('head').append([getLoopCardStyles(), ARCHIVE_FIX_STYLES].filter(Boolean).join('\n'));

  if (!$('script[src*="astro-mirror-fixes.js"]').length) {
    $('body').append('<script src="/js/astro-mirror-fixes.js?v=20260730-nav" defer></script>');
  }

  return injectRuntimeGtmLoader($.html());
}

/** Tag pages use live Elementor archive template 24660 (archive_cards skin). */
function assembleTagHtml(data: ArchivePageData): string {
  if (!existsSync(TAG_SHELL_PATH)) {
    throw new Error('Tag shell missing. Run: node scripts/prepare-tag-shell.mjs');
  }

  let html = readFileSync(TAG_SHELL_PATH, 'utf8');
  const postsHtml = data.posts.map((p) => buildArchiveCardHtml(p)).join('\n');
  const pagination = buildPaginationHtml(getArchiveBasePath(data), data.currentPage, data.totalPages);

  html = html
    .replace('<!--ASTRO_TAG:POSTS-->', postsHtml)
    .replace('<!--ASTRO_TAG:PAGINATION-->', pagination);

  html = patchArchiveMeta(html, data);

  if (!html.includes('astro-tag-archive-css')) {
    html = html.replace('</head>', `${TAG_CARD_FIX_STYLES}\n</head>`);
  }
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  return injectRuntimeGtmLoader(html);
}

function patchArchiveMeta(html: string, data: ArchivePageData): string {
  let out = html;
  const pageSuffix = data.currentPage > 1 ? ` - Page ${data.currentPage} of ${data.totalPages}` : '';
  const title =
    data.type === 'tag'
      ? `${data.title.replace(/ Archives$/, '')} Archives - Company Formation Saudi${pageSuffix}`
      : `${data.title}${pageSuffix}`;

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  if (out.includes('name="description"')) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(data.description)}" />`,
    );
  }

  if (out.includes('rel="canonical"')) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${data.canonical}" />`,
    );
  } else {
    out = out.replace('</head>', `<link rel="canonical" href="${data.canonical}" />\n</head>`);
  }

  return out;
}

export function getBlogPageData(page = 1): ArchivePageData {
  const allPosts = getAllBlogPosts();
  const paged = paginatePosts(allPosts, page);
  const canonical =
    page === 1 ? `${ORIGIN}/blog/` : `${ORIGIN}/blog/page/${page}/`;

  return {
    type: 'blog',
    title: 'Insights on HR, Payroll, and Business Solutions',
    description:
      'Latest articles from Company Formation Saudi on HR, visas, recruitment, Emiratisation, and business in Abu Dhabi.',
    canonical,
    ...paged,
  };
}

export function getCategoryPageData(slug: string, page = 1): ArchivePageData | null {
  const posts = getPostsByCategorySlug(slug);
  if (!posts.length) return null;

  const paged = paginatePosts(posts, page);
  const name = posts[0].categories.find((c) => getCategorySlug(c) === slug)?.name || slug;
  const canonical =
    page === 1 ? `${ORIGIN}/category/${slug}/` : `${ORIGIN}/category/${slug}/page/${page}/`;

  return {
    type: 'category',
    slug,
    title: `${name} Archives`,
    description: `Articles about ${name} from Company Formation Saudi.`,
    canonical,
    ...paged,
  };
}

export function getTagPageData(slug: string, page = 1): ArchivePageData | null {
  const posts = getPostsByTagSlug(slug);
  if (!posts.length) return null;

  const paged = paginatePosts(posts, page, TAG_POSTS_PER_PAGE);
  const tag = posts[0].tags?.find((t) => t.slug === slug);
  const name = tag?.name || slug.replace(/-/g, ' ');
  const canonical =
    page === 1 ? `${ORIGIN}/tag/${slug}/` : `${ORIGIN}/tag/${slug}/page/${page}/`;

  return {
    type: 'tag',
    slug,
    title: `${name} Archives`,
    description: `Articles tagged ${name} from Company Formation Saudi.`,
    canonical,
    ...paged,
  };
}

export function assembleArchiveHtml(data: ArchivePageData): string {
  if (data.type === 'tag') {
    return assembleTagHtml(data);
  }

  if (!existsSync(INSIGHTS_PATH)) {
    throw new Error('Insights shell missing. Run: npm run prepare:insights');
  }

  let html = readFileSync(INSIGHTS_PATH, 'utf8');
  html = injectInsightsContent(html, data);
  html = patchArchiveMeta(html, data);
  return injectRuntimeGtmLoader(html);
}

export function serveArchivePage(data: ArchivePageData): Response {
  return new Response(assembleArchiveHtml(data), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}

export function getInsightsTotalPages(): number {
  return Math.max(1, Math.ceil(getAllBlogPosts().length / ARCHIVE_POSTS_PER_PAGE));
}

export { getAllCategorySlugs, getAllTagSlugs };

/** @deprecated Use getBlogPageData */
export const getInsightsPageData = getBlogPageData;
