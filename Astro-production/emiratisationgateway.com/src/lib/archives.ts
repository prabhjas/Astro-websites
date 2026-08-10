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
  buildInsightsCardHtml,
  buildPostCardHtml,
  getPostExcerpt,
  getCategorySlug,
  getCategoryUrl,
  getAllBlogPosts,
  getAllCategorySlugs,
  getAllTagSlugs,
  getPostsByCategorySlug,
  getPostsByTagSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const INSIGHTS_PATH = join(ROOT, 'src/legacy/blog.cleaned.html');
const TAG_SHELL_PATH = join(ROOT, 'src/legacy/tag-shell/template.html');
const CATEGORY_SHELL_PATH = join(ROOT, 'src/legacy/category-shell/template.html');
const ORIGIN = 'https://emiratisationgateway.com';

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
  const hrefFor = (p: number) => (p === 1 ? base : `${base}page/${p}/`);
  const items: string[] = [];

  if (currentPage > 1) {
    items.push(`<a class="prev page-numbers" href="${hrefFor(currentPage - 1)}"><span>Previous</span></a>`);
  }

  const windowSize = 2;
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = currentPage - windowSize; p <= currentPage + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) {
      items.push(`<span class="page-numbers dots">&hellip;</span>`);
    }
    if (p === currentPage) {
      items.push(`<span aria-current="page" class="page-numbers current"><span>${p}</span></span>`);
    } else {
      items.push(`<a class="page-numbers" href="${hrefFor(p)}"><span>${p}</span></a>`);
    }
    prev = p;
  }

  if (currentPage < totalPages) {
    items.push(`<a class="next page-numbers" href="${hrefFor(currentPage + 1)}"><span>Next</span></a>`);
  }

  // Impreza us-nav-style_6 markup (blog listing). Elementor archives still style .page-numbers.
  return `<nav class="pagination navigation" role="navigation"><div class="nav-links custom us-nav-style_6">${items.join('\n')}</div></nav>`;
}

const CATEGORY_DROPDOWN_SCRIPT = `<script>
(function () {
  var catMap = {'26':'/category/emiratisation/','54':'/category/nafis/','35':'/category/outsourcing/','55':'/category/recruitment/','1':'/category/uncategorized/'};
  var dropdown = document.getElementById('wp-block-categories-1') || document.getElementById('cat');
  if (!dropdown) return;
  var form = dropdown.closest('form');
  if (form) { form.setAttribute('action', '#'); form.setAttribute('onsubmit', 'return false;'); }
  dropdown.addEventListener('change', function () {
    var val = dropdown.value;
    if (val && val !== '-1' && catMap[val]) {
      window.location.href = catMap[val];
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

/* Main grid (loop 276): 3 columns on desktop like live */
.elementor-element-b877973 .ecs-posts.elementor-posts-container,
.ecs-posts.elementor-posts-container{
  display:grid !important;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:30px;
}
@media (max-width:1024px){
  .elementor-element-b877973 .ecs-posts.elementor-posts-container,
  .ecs-posts.elementor-posts-container{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media (max-width:767px){
  .elementor-element-b877973 .ecs-posts.elementor-posts-container,
  .ecs-posts.elementor-posts-container{grid-template-columns:1fr;}
  .elementor-714 .elementor-container{flex-direction:column;}
  .elementor-714 .elementor-col-50{width:100%;}
}
/* Loop 276 card styles */
.elementor-276 .elementor-widget-theme-post-featured-image img,
.elementor-276 .elementor-element-5145fd7 img{
  width:100%;height:auto;display:block;object-fit:cover;aspect-ratio:16/9;border-radius:8px 8px 0 0;
}
.elementor-276 .elementor-heading-title a{text-decoration:none;color:#0B092D;}
.elementor-276 .elementor-heading-title a:hover{color:#1C1CD1;}
.elementor-276 .elementor-post-info__terms-list-item{
  background:#23369b;color:#fff;padding:4px 10px;border-radius:3px;font-size:12px;font-weight:600;text-decoration:none;
}
.elementor-276 .elementor-post-info__terms-list-item:hover{background:#d71216;}
.elementor-276{background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,.08);}
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
.astro-tag-pagination .page-numbers{display:inline-block;margin:0 4px;padding:8px 12px;text-decoration:none;color:var(--ast-global-color-0,#628c62);border:1px solid transparent;border-radius:4px}
.astro-tag-pagination .page-numbers.current{font-weight:700;color:#fff;background:var(--ast-global-color-0,#628c62);border-color:var(--ast-global-color-0,#628c62)}
.astro-tag-pagination a.page-numbers:hover{color:#fff;background:var(--ast-global-color-0,#628c62)}
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

  // Gateway blog uses Elementor loop 276 cards for all grids.
  // Blog page has two loops: featured hero (714) + regular grid (276).
  // Category pages get loop-276 cards in all containers.
  if (data.type === 'blog' && ecsList.length >= 2) {
    const featured = data.posts[0] ? buildFeaturedPostCardHtml(data.posts[0]) : '';
    const gridHtml = data.posts.map((p) => buildInsightsCardHtml(p)).join('\n');
    $(ecsList[0]).html(featured);
    $(ecsList[1]).html(gridHtml);
  } else if (ecsList.length >= 2) {
    const gridHtml = data.posts.map((p) => buildInsightsCardHtml(p)).join('\n');
    $(ecsList[0]).html(gridHtml);
    $(ecsList.slice(1)).each((_, el) => $(el).empty());
  } else if (ecsList.length === 1) {
    $(ecsList[0]).html(data.posts.map((p) => buildInsightsCardHtml(p)).join('\n'));
  }

  const pagination = buildPaginationHtml(getArchiveBasePath(data), data.currentPage, data.totalPages);
  const pagNav = $('.elementor-pagination').first();
  const imprezaNav = $('nav.pagination').first();
  if (pagNav.length) {
    pagNav.replaceWith(pagination);
  } else if (imprezaNav.length) {
    imprezaNav.replaceWith(pagination);
  } else if (ecsList.length) {
    $(ecsList[ecsList.length - 1]).parent().append(pagination);
  }

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
    $('body').append('<script src="/js/astro-mirror-fixes.js?v=20260806-qa1" defer></script>');
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
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260806-qa1" defer></script>\n</body>');
  }

  return injectRuntimeGtmLoader(html);
}

function patchArchiveMeta(html: string, data: ArchivePageData): string {
  let out = html;
  const pageSuffix = data.currentPage > 1 ? ` - Page ${data.currentPage} of ${data.totalPages}` : '';
  const title =
    data.type === 'tag'
      ? `${data.title.replace(/ Archives$/, '')} Archives - Emiratisation Gateway${pageSuffix}`
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
      'Latest articles from Emiratisation Gateway on HR, visas, recruitment, Emiratisation, and business in Abu Dhabi.',
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
    description: `Articles about ${name} from Emiratisation Gateway.`,
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
    description: `Articles tagged ${name} from Emiratisation Gateway.`,
    canonical,
    ...paged,
  };
}

/**
 * Astra blog-layout-1 card for category archives.
 * Matches live /category/* markup: article.ast-article-post > .blog-layout-1
 */
function buildAstraCategoryCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 280));
  const catClasses = post.categories
    .map((c) => ` category-${(c.slug || getCategorySlug(c)).toLowerCase().replace(/\s+/g, '-')}`)
    .join('');
  const tagClasses = (post.tags || [])
    .map((t) => ` tag-${t.slug}`)
    .join('');

  const imgTag = imgSrc
    ? `<img loading="lazy" width="1024" height="576" src="${imgSrc}" class="attachment-large size-large wp-post-image" alt="${imgAlt}" itemprop="image" decoding="async" />`
    : '';

  const catLinks = post.categories
    .map((c) => `<a href="${getCategoryUrl(c)}" rel="category tag">${escapeHtml(c.name)}</a>`)
    .join(', ');
  const authorName = escapeHtml(post.author?.name || 'Admin');
  const authorSlug = post.author?.slug || '';
  const authorUrl = authorSlug ? `/author/${authorSlug}/` : '#';

  return `<article class="post type-post status-publish format-standard has-post-thumbnail hentry${catClasses}${tagClasses} ast-grid-common-col ast-full-width ast-article-post" itemtype="https://schema.org/CreativeWork" itemscope="itemscope">
		<div class="ast-post-format- blog-layout-1 ast-article-inner">
	<div class="post-content ast-grid-common-col">
		<div class="ast-blog-featured-section post-thumb ast-blog-single-element"><div class="post-thumb-img-content post-thumb"><a href="${postUrl}" aria-label="Read: ${title}">${imgTag}</a></div></div><h2 class="entry-title ast-blog-single-element" itemprop="headline"><a href="${postUrl}" rel="bookmark">${title}</a></h2>		<header class="entry-header ast-blog-single-element ast-blog-meta-container">
			<div class="entry-meta">${catLinks ? `<span class="ast-taxonomy-container cat-links default">${catLinks}</span> / ` : ''}<span class="posted-by vcard author" itemtype="https://schema.org/Person" itemscope="itemscope" itemprop="author">			<a title="View all posts by ${authorName}" href="${authorUrl}" rel="author" class="url fn n" itemprop="url">
				<span class="author-name" itemprop="name">${authorName}</span>
			</a>
		</span>
		</div>		</header>
					<div class="ast-excerpt-container ast-blog-single-element">
				<p>${excerpt}</p>
			</div>
		<p class="ast-blog-single-element ast-read-more-container read-more"> <a class="" href="${postUrl}"> <span class="screen-reader-text">${title}</span> Read More »</a></p>		<div class="entry-content clear" itemprop="text">
					</div>
	</div>
</div>
	</article>`;
}

/** Build Astra pagination matching live .ast-pagination markup. */
function buildAstraPaginationHtml(basePath: string, currentPage: number, totalPages: number): string {
  if (totalPages <= 1) return '';

  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const hrefFor = (p: number) => (p === 1 ? base : `${base}page/${p}/`);
  const items: string[] = [];

  const windowSize = 2;
  const pagesSet = new Set<number>();
  pagesSet.add(1);
  pagesSet.add(totalPages);
  for (let p = currentPage - windowSize; p <= currentPage + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pagesSet.add(p);
  }
  const sorted = [...pagesSet].sort((a, b) => a - b);
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) {
      items.push(`<span class="page-numbers dots">…</span>`);
    }
    if (p === currentPage) {
      items.push(`<span aria-current="page" class="page-numbers current">${p}</span>`);
    } else {
      items.push(`<a class="page-numbers" href="${hrefFor(p)}">${p}</a>`);
    }
    prev = p;
  }

  if (currentPage < totalPages) {
    items.push(`<a class="next page-numbers" href="${hrefFor(currentPage + 1)}">→</a>`);
  }

  return `<div class="ast-pagination"><nav class="navigation pagination" aria-label="Post pagination">
				<div class="nav-links">${items.join('\n')}</div>
		</nav></div>`;
}

/** Assemble category archive page from category-shell template. */
function assembleCategoryHtml(data: ArchivePageData): string {
  if (!existsSync(CATEGORY_SHELL_PATH)) {
    // Fallback to blog.cleaned.html if category shell not yet prepared
    return assembleBlogShellHtml(data);
  }

  let html = readFileSync(CATEGORY_SHELL_PATH, 'utf8');
  const catName = data.title.replace(/ Archives$/, '');

  // Inject archive title
  html = html.replace(
    '<!--ASTRO_CATEGORY:TITLE-->',
    `<h1 class="page-title ast-archive-title">${escapeHtml(catName)}</h1>`,
  );

  // Inject Astra blog-layout-1 cards
  const postsHtml = data.posts.map((p) => buildAstraCategoryCardHtml(p)).join('\n');
  html = html.replace('<!--ASTRO_CATEGORY:POSTS-->', postsHtml);

  // Inject pagination
  const basePath = `/category/${data.slug}/`;
  const pagination = buildAstraPaginationHtml(basePath, data.currentPage, data.totalPages);
  html = html.replace('<!--ASTRO_CATEGORY:PAGINATION-->', pagination);

  html = patchArchiveMeta(html, data);

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260806-qa1" defer></script>\n</body>');
  } else {
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?/g,
      '/js/astro-mirror-fixes.js?v=20260806-qa1',
    );
  }

  // Force visible black dropdown + pagination (Astra color-5 is #fff — invisible on light bg)
  if (!html.includes('data-astro-cat-ui-css')) {
    const catCss = `<style data-astro-cat-ui-css="1">
select#cat,select.postform,#cat{color:#111!important;background:#fff!important;border:1px solid #111!important;border-radius:4px;padding:8px 12px;accent-color:#111;outline:none}
select#cat option,select.postform option,#cat option{color:#111!important;background:#fff!important}
select#cat option:checked,select.postform option:checked,#cat option:checked,select#cat option:hover{color:#111!important;background:#e8efe8!important}
.astro-cat-select{position:relative;width:100%;font-size:15px}
.astro-cat-select>select{position:absolute!important;left:0!important;top:0!important;width:1px!important;height:1px!important;margin:0!important;padding:0!important;opacity:0!important;pointer-events:none!important;border:0!important}
.astro-cat-select__btn{display:flex;align-items:center;justify-content:space-between;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #111;border-radius:4px;background:#fff;color:#111!important;text-align:left;cursor:pointer;font:inherit}
.astro-cat-select__btn::after{content:"▾";margin-left:8px;color:#111}
.astro-cat-select__list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:50;margin:0!important;padding:4px 0!important;padding-left:0!important;padding-inline-start:0!important;list-style:none!important;background:#fff;border:1px solid #111;border-radius:4px;box-shadow:0 8px 20px rgba(0,0,0,.12);max-height:260px;overflow:auto;box-sizing:border-box}
.astro-cat-select__option{display:block;margin:0!important;padding:10px 12px!important;padding-left:12px!important;text-indent:0!important;list-style:none!important;color:#111!important;background:#fff;cursor:pointer;box-sizing:border-box}
.astro-cat-select__option:hover,.astro-cat-select__option.is-selected{background:#e8efe8!important;color:#111!important}
.ast-pagination a,.ast-pagination a.page-numbers,.navigation.pagination a,.navigation.pagination a.page-numbers,.elementor-pagination a.page-numbers{color:#111!important;background:transparent!important;opacity:1!important}
.ast-pagination .page-numbers,.navigation.pagination .page-numbers,.elementor-pagination .page-numbers{color:#111!important}
.ast-pagination .page-numbers.current,.navigation.pagination .page-numbers.current,.elementor-pagination .page-numbers.current{color:#fff!important;background:#628c62!important;border-color:#628c62!important}
.ast-pagination a.page-numbers:hover,.navigation.pagination a.page-numbers:hover,.elementor-pagination a.page-numbers:hover{color:#fff!important;background:#628c62!important;border-color:#628c62!important}
</style>`;
    html = html.replace(/<\/head>/i, `${catCss}\n</head>`);
  }

  return injectRuntimeGtmLoader(html);
}

/** Fallback: assemble category from blog.cleaned.html when shell is unavailable. */
function assembleBlogShellHtml(data: ArchivePageData): string {
  if (!existsSync(INSIGHTS_PATH)) {
    throw new Error('Insights shell missing. Run: npm run prepare:insights');
  }
  let html = readFileSync(INSIGHTS_PATH, 'utf8');
  html = injectInsightsContent(html, data);
  html = patchArchiveMeta(html, data);
  return injectRuntimeGtmLoader(html);
}

export function assembleArchiveHtml(data: ArchivePageData): string {
  if (data.type === 'tag') {
    return assembleTagHtml(data);
  }

  if (data.type === 'category') {
    return assembleCategoryHtml(data);
  }

  // Blog listing
  return assembleBlogShellHtml(data);
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
