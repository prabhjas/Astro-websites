/**
 * Shared archive page assembly for insights, category, and tag listings.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { injectRuntimeGtmLoader } from './gtm/inject';
import { sanitizeMirrorHtml } from '@connect/site-cms';
import { normalizeLegacyDocumentUrls } from './legacy-page.js';
import { applySharedChrome } from './shared-chrome.js';
import {
  ARCHIVE_POSTS_PER_PAGE,
  TAG_POSTS_PER_PAGE,
  buildArchiveCardHtml,
  buildCafLayout3CardHtml,
  buildFeaturedPostCardHtml,
  buildKpmproBlogLoopCardHtml,
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
const INSIGHTS_PATH = join(ROOT, 'src/legacy/insights.cleaned.html');
const BLOG_FALLBACK_PATH = join(ROOT, 'src/legacy/blog.cleaned.html');
const TAG_SHELL_PATH = join(ROOT, 'src/legacy/tag-shell/template.html');
const ORIGIN = 'https://saudicompanyformation.com';

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

  if (currentPage > 1) {
    const prevHref = currentPage === 2 ? base : `${base}${currentPage - 1}/`;
    items.push(`<a class="page-numbers prev" href="${prevHref}">&lt;</a>`);
  }

  for (let p = 1; p <= totalPages; p++) {
    const href = p === 1 ? base : `${base}${p}/`;
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

  if (currentPage < totalPages) {
    items.push(`<a class="page-numbers next" href="${base}${currentPage + 1}/">&gt;</a>`);
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
  if (data.type === 'blog') return '/insights/';
  if (data.type === 'category') return `/category/${data.slug}/`;
  return `/tag/${data.slug}/`;
}

const INSIGHTS_GRID_STYLES = `
<style data-astro-insights-grid="1">
/* Override broken Elementor CAF skins (white overlay + negative image margins). */
#caf-post-layout-container .astro-caf-posts{display:flex;flex-wrap:wrap;width:100%;margin:0 -1%;}
#caf-post-layout-container .astro-caf-posts > article{
  box-sizing:border-box;position:relative;flex:0 0 31.33%;max-width:31.33%;
  height:auto!important;margin:12px 1%!important;overflow:hidden;
  box-shadow:0 6px 18px rgba(0,0,0,.12)!important;border-radius:14px;background:#fff;
}
#caf-post-layout-container .astro-caf-posts > article > .caf-post-layout3{
  position:relative;width:100%;height:auto!important;margin:0!important;overflow:hidden;
  box-shadow:none!important;border-radius:0;padding:0;
}
body #caf-post-layout-container .astro-caf-posts .caf-featured-img-box,
body #caf-post-layout-container .astro-caf-posts .caf-post-layout3 .caf-featured-img-box{
  display:block!important;width:100%!important;height:220px!important;min-height:220px!important;
  margin:0!important;border-radius:0!important;
  background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;
}
body #caf-post-layout-container .astro-caf-posts #manage-post-area,
body #caf-post-layout-container .astro-caf-posts .manage-post-area{
  position:static!important;width:100%!important;padding:14px 16px 16px!important;bottom:auto!important;
  background:#fff!important;background-image:none!important;
}
#caf-post-layout-container .astro-caf-posts .caf-meta-content-cats{margin:0 0 8px;}
#caf-post-layout-container .astro-caf-posts .caf-meta-content-cats ul{display:none;}
#caf-post-layout-container .astro-caf-posts .caf-post-title{padding:0!important;}
#caf-post-layout-container .astro-caf-posts .caf-post-title h2{margin:0;line-height:1.35;}
#caf-post-layout-container .astro-caf-posts .caf-post-title h2 a{
  color:#0d0d0d!important;font-size:18px!important;font-weight:700;text-decoration:none;
}
#caf-post-layout-container .astro-caf-posts .caf-post-title h2 a:hover{color:#f94d1c!important;}
@media (max-width:921px){
  #caf-post-layout-container .astro-caf-posts > article.caf-col-md-4{flex-basis:48%!important;max-width:48%!important;width:48%!important;}
}
@media (max-width:544px){
  #caf-post-layout-container .astro-caf-posts > article.caf-col-md-4,
  #caf-post-layout-container .astro-caf-posts > article.caf-col-md-tablet6{flex-basis:98%!important;max-width:98%!important;width:98%!important;}
  body #caf-post-layout-container .astro-caf-posts .caf-featured-img-box{height:200px!important;min-height:200px!important;}
}
#caf-post-layout-container .caf-filter-layout a[data-astro-filter]{cursor:pointer;}
#caf-post-layout-container .astro-caf-empty{padding:2rem;text-align:center;color:#444;}
#caf-post-layout-container .astro-caf-cat-badge{
  display:inline-block;margin:0;padding:4px 12px;border-radius:999px;
  background:#f94d1c;color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
}
#caf-post-layout-container .astro-caf-meta{
  margin-top:0.65rem;font-size:13px;color:#666;display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem;
}
#caf-post-layout-container .astro-caf-meta a{color:#444;text-decoration:none;font-weight:600;}
#caf-post-layout-container .astro-caf-meta a:hover{color:#f94d1c;}
#caf-post-layout-container .astro-caf-date{display:inline-flex;align-items:center;gap:0.3rem;color:#777;}
#caf-post-layout-container .astro-caf-date svg{width:12px;height:12px;fill:currentColor;}
#caf-post-layout-container .astro-caf-meta-sep{color:#bbb;}
</style>`;

const INSIGHTS_FILTER_SCRIPT = `
<script data-astro-insights-filter="1">
(function(){
  var root=document.getElementById('caf-post-layout-container');
  if(!root||root.dataset.astroFilterBound) return;
  root.dataset.astroFilterBound='1';
  var grid=root.querySelector('.astro-caf-posts');
  if(!grid) return;
  function apply(term){
    var cards=grid.querySelectorAll('article[data-astro-cats]');
    var shown=0;
    cards.forEach(function(card){
      var cats=(card.getAttribute('data-astro-cats')||'');
      var ok=!term || term==='all' || cats.split(/\\s+/).indexOf(term)>=0;
      card.style.display=ok?'':'none';
      if(ok) shown++;
    });
    var empty=grid.querySelector('.astro-caf-empty');
    if(!shown){
      if(!empty){
        empty=document.createElement('div');
        empty.className='astro-caf-empty';
        empty.textContent='No posts found for this filter.';
        grid.appendChild(empty);
      }
      empty.style.display='block';
    } else if(empty){
      empty.style.display='none';
    }
  }
  root.addEventListener('click', function(e){
    var a=e.target.closest('a[data-id]');
    if(!a||!root.contains(a)) return;
    e.preventDefault();
    e.stopPropagation();
    root.querySelectorAll('a[data-id]').forEach(function(x){ x.classList.remove('active'); });
    a.classList.add('active');
    var id=a.getAttribute('data-id')||'';
    var label=a.textContent.trim();
    var result=root.querySelector('.result');
    if(result) result.textContent=label || 'Everything';
    // Map CAF term ids to category slug via data-astro-term-slug when present
    var slug=a.getAttribute('data-astro-term-slug')||'';
    if(!slug && (id==='1000' || a.classList.contains('dfl') || /everything/i.test(label))) slug='all';
    // Fallback: filter by label text match against card category links
    if(!slug || slug==='all'){ apply('all'); return; }
    apply(slug);
  }, true);
})();
</script>`;

/** Blog + category pages use the Insights Elementor template + CAF-compatible cards. */
function injectInsightsContent(html: string, data: ArchivePageData): string {
  // HTML mode (not xml): empty <a></a> / <i></i> must stay paired. XML self-closing
  // tags are treated as unclosed in browsers and collapse the Insights grid.
  const $ = cheerio.load(html, { decodeEntities: false } as any);
  const caf = $('#caf-post-layout-container').first();

  if (caf.length) {
    // Disable WP AJAX filter plugin — we render posts server-side.
    caf.find('script').remove();
    const cards = data.posts.map((p) => buildCafLayout3CardHtml(p)).join('\n');
    const pagination = buildPaginationHtml(getArchiveBasePath(data), data.currentPage, data.totalPages);
    // Keep filter UI; replace/create the posts response area
    let response = caf.find('#manage-ajax-response, .manage-ajax-response, #caf-manage-ajax-response').first();
    if (!response.length) {
      caf.append('<div id="manage-ajax-response" class="manage-ajax-response"></div>');
      response = caf.find('#manage-ajax-response').first();
    }
    response.html(
      `<div class="astro-caf-posts">${cards || '<div class="astro-caf-empty">No posts published yet.</div>'}</div>${pagination}`,
    );

    // Annotate filter links with category slugs for client filtering
    caf.find('a[data-id]').each((_, el) => {
      const $a = $(el);
      const label = ($a.text() || '').trim().toLowerCase();
      if ($a.hasClass('dfl') || label === 'everything') {
        $a.attr('data-astro-term-slug', 'all');
        return;
      }
      const match = data.posts
        .flatMap((p) => p.categories)
        .find((c) => (c.name || '').trim().toLowerCase() === label);
      if (match) {
        $a.attr('data-astro-term-slug', (match.slug || getCategorySlug(match)).toLowerCase());
      }
    });
  } else {
    const loopContainer = $('.elementor-loop-container.elementor-grid').first();
    if (loopContainer.length) {
      const loopStyle = loopContainer.find('style#loop-5894').first();
      const styleHtml = loopStyle.length ? loopStyle.prop('outerHTML') || '' : '';
      const cards = data.posts.map((p) => buildKpmproBlogLoopCardHtml(p)).join('\n');
      loopContainer.html(`${styleHtml}${cards}`);
      loopContainer.parent().find('.e-load-more-anchor').remove();
    } else {
      const ecsList = $('.ecs-posts');
      if (ecsList.length >= 2) {
        const featured = data.posts[0] ? buildFeaturedPostCardHtml(data.posts[0]) : '';
        const gridHtml = data.posts.slice(1).map((p) => buildPostCardHtml(p)).join('\n');
        $(ecsList[0]).html(featured);
        $(ecsList[1]).html(gridHtml);
      } else if (ecsList.length === 1) {
        $(ecsList[0]).html(data.posts.map((p) => buildPostCardHtml(p)).join('\n'));
      }
    }
  }

  $('head').append([getLoopCardStyles(), ARCHIVE_FIX_STYLES, INSIGHTS_GRID_STYLES].filter(Boolean).join('\n'));
  if (!$('script[data-astro-insights-filter]').length) {
    $('body').append(INSIGHTS_FILTER_SCRIPT);
  }

  if (!$('script[src*="astro-mirror-fixes.js"]').length) {
    $('body').append('<script src="/js/astro-mirror-fixes.js?v=20260810-contact-slash" defer></script>');
  }

  // applySharedChrome injects footer/FAQ CSS; GTM is applied once in assembleArchiveHtml.
  return applySharedChrome($.html(), data.type === 'blog' ? 'insights' : 'default');
}

/** Tag pages use live Elementor archive template 24660 (archive_cards skin). */
function assembleTagHtml(data: ArchivePageData): string {
  if (!existsSync(TAG_SHELL_PATH)) {
    throw new Error('Tag shell missing. Run: node scripts/prepare-tag-shell.mjs');
  }

  let html = sanitizeMirrorHtml(normalizeLegacyDocumentUrls(readFileSync(TAG_SHELL_PATH, 'utf8')));
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
      ? `${data.title.replace(/ Archives$/, '')} Archives - Saudi Company Formation${pageSuffix}`
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
  // Insights lists standard WP posts only (exclude law CPT / ar nested paths).
  const allPosts = getAllBlogPosts().filter((p) => !String(p.slug).includes('/'));
  const paged = paginatePosts(allPosts, page);
  const canonical =
    page === 1 ? `${ORIGIN}/insights/` : `${ORIGIN}/insights/${page}/`;

  return {
    type: 'blog',
    title: 'Insights | Saudi Company Formation',
    description:
      'Latest insights on Saudi company formation, visas, licensing, payroll, immigration, and business setup in KSA.',
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
    description: `Articles about ${name} from Saudi Company Formation.`,
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
    description: `Articles tagged ${name} from Saudi Company Formation.`,
    canonical,
    ...paged,
  };
}

export function assembleArchiveHtml(data: ArchivePageData): string {
  if (data.type === 'tag') {
    return assembleTagHtml(data);
  }

  const shellPath = existsSync(INSIGHTS_PATH) ? INSIGHTS_PATH : BLOG_FALLBACK_PATH;
  if (!existsSync(shellPath)) {
    throw new Error('Insights shell missing. Run: npm run prepare:page -- insights --download');
  }

  let html = readFileSync(shellPath, 'utf8');
  html = sanitizeMirrorHtml(normalizeLegacyDocumentUrls(html));
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
  const total = getAllBlogPosts().filter((p) => !String(p.slug).includes('/')).length;
  return Math.max(1, Math.ceil(total / ARCHIVE_POSTS_PER_PAGE));
}

export { getAllCategorySlugs, getAllTagSlugs };

/** @deprecated Use getBlogPageData */
export const getInsightsPageData = getBlogPageData;
