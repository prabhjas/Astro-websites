/**
 * Author archive types, shell assembly, and content loading.
 * Posts come from posts-index.json (CFS has no src/content/blog JSON store).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import {
  getIndexedPosts,
  getIndexedLaw,
  buildCafCardHtml,
  type IndexedPost,
} from './posts-index.ts';

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const ORIGIN = '';
/** Brand author owns all mirrored posts/law until per-author attribution exists. */
export const BRAND_AUTHOR_SLUG = 'company-formation-saudi';
/** Initial author archive batch + Load More page size. */
export const AUTHOR_ARCHIVE_LOAD_MORE = 8;

export interface AuthorSocial {
  type: string;
  url: string;
}

export interface Author {
  slug: string;
  name: string;
  title?: string;
  bio?: string;
  avatar?: { src: string; alt?: string };
  social?: AuthorSocial[];
  canonical: string;
  description?: string;
  og?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  sourceUrl: string;
  migratedAt: string;
  notes?: string[];
}

export interface AuthorPageData {
  author: Author;
  posts: IndexedPost[];
  currentPage: number;
  totalPages: number;
  totalPosts: number;
}

const LIVE_AUTHOR_ORDER = [BRAND_AUTHOR_SLUG];

const LIVE_AUTHOR_OVERRIDES: Record<string, { name?: string; title?: string; avatar?: string }> = {
  [BRAND_AUTHOR_SLUG]: {
    name: 'Company Formation Saudi',
    title: 'Business Setup Experts',
    avatar: '/wp-content/uploads/2022/12/cropped-company_formation_logo-removebg-preview-270x270.png',
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getAllAuthorSlugs(): string[] {
  if (!existsSync(AUTHORS_DIR)) return [];
  return readdirSync(AUTHORS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

export function getAuthor(slug: string): Author | null {
  const path = join(AUTHORS_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Author;
}

export function getAllAuthors(): Author[] {
  return getAllAuthorSlugs()
    .map((slug) => getAuthor(slug))
    .filter((author): author is Author => author !== null);
}

function sortByDateDesc(a: IndexedPost, b: IndexedPost): number {
  const ta = Date.parse(a.publishedAt || a.modifiedAt || '') || 0;
  const tb = Date.parse(b.publishedAt || b.modifiedAt || '') || 0;
  return tb - ta;
}

/** All mirrored posts/law attributed to the brand author (or name match). */
export function getIndexedPostsByAuthorSlug(authorSlug: string): IndexedPost[] {
  const all = [...getIndexedPosts(), ...getIndexedLaw()].sort(sortByDateDesc);
  if (authorSlug === BRAND_AUTHOR_SLUG) return all;

  const author = getAuthor(authorSlug);
  if (!author) return [];
  const name = author.name.trim().toLowerCase();
  return all.filter((p) => String(p.author || '').trim().toLowerCase() === name);
}

export function getAuthorPageData(slug: string, page = 1): AuthorPageData | null {
  const author = getAuthor(slug);
  if (!author) return null;

  const allPosts = getIndexedPostsByAuthorSlug(slug);
  const totalPosts = allPosts.length;
  // Load More UX: always serve the first batch on the archive page (no numbered pages).
  const totalPages = 1;
  const currentPage = 1;
  const posts = allPosts.slice(0, AUTHOR_ARCHIVE_LOAD_MORE);

  return { author, posts, currentPage, totalPages, totalPosts };
}

/** HTML cards for author Load More API. */
export function buildAuthorArchiveCardsHtml(posts: IndexedPost[]): string {
  return posts.map((p) => buildCafCardHtml(p)).join('\n');
}

export function getAuthorArchiveSlice(slug: string, offset: number, limit = AUTHOR_ARCHIVE_LOAD_MORE) {
  const all = getIndexedPostsByAuthorSlug(slug);
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(24, Math.max(1, limit));
  const slice = all.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + slice.length;
  return {
    posts: slice,
    html: buildAuthorArchiveCardsHtml(slice),
    total: all.length,
    offset: safeOffset,
    nextOffset,
    hasMore: nextOffset < all.length,
  };
}

export interface AuthorDirectoryEntry {
  author: Author;
  postCount: number;
}

export function getAuthorDirectoryEntries(): AuthorDirectoryEntry[] {
  const entries = getAllAuthors()
    .map((author) => ({
      author,
      postCount: getIndexedPostsByAuthorSlug(author.slug).length,
    }))
    .filter((entry) => entry.postCount > 0);

  const preferred = LIVE_AUTHOR_ORDER.map((slug) => entries.find((entry) => entry.author.slug === slug)).filter(
    (entry): entry is AuthorDirectoryEntry => Boolean(entry),
  );
  return preferred.length ? preferred : entries.sort((a, b) => a.author.name.localeCompare(b.author.name));
}

/** True for mirror blog posts only — never law articles/pages. */
export function isIndexedBlogPostSlug(slug: string): boolean {
  const norm = String(slug || '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
  if (!norm) return false;
  if (norm === 'law' || norm.startsWith('law/') || norm.includes('/law/')) return false;

  const lawHit = getIndexedLaw().some((p) => {
    const s = String(p.slug || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    const u = String(p.url || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    return s === norm || u === norm;
  });
  if (lawHit) return false;

  return getIndexedPosts().some((p) => {
    const s = String(p.slug || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    const u = String(p.url || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    return s === norm || u === norm;
  });
}

/** Compact author card injected at the end of blog posts (not law). */
export function buildPostAuthorBoxHtml(authorSlug = BRAND_AUTHOR_SLUG): string {
  const author = getAuthor(authorSlug) || getAuthor(BRAND_AUTHOR_SLUG);
  if (!author) return '';

  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = escapeHtml(override.name || author.name);
  const title = escapeHtml(override.title || author.title || '');
  const bio = escapeHtml(author.bio || author.description || '');
  const avatarSrc =
    override.avatar ||
    author.avatar?.src ||
    '/wp-content/uploads/2022/12/cropped-company_formation_logo-removebg-preview-270x270.png';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const href = `/author/${author.slug}/`;

  return `<aside class="cfs-post-author-box" aria-label="About the author">
  <div class="cfs-post-author-box__inner">
    <a class="cfs-post-author-box__visual" href="${href}" aria-label="${name}">
      <span class="cfs-post-author-box__plate">
        <span class="cfs-post-author-box__circle">
          <img class="cfs-post-author-box__image" width="160" height="160" src="${avatarSrc}" alt="${avatarAlt}" loading="lazy" decoding="async" />
          <span class="cfs-post-author-box__accent" aria-hidden="true"></span>
        </span>
      </span>
    </a>
    <div class="cfs-post-author-box__meta">
      <p class="cfs-post-author-box__label">About the author</p>
      <h3 class="cfs-post-author-box__name"><a href="${href}">${name}</a></h3>
      ${title ? `<p class="cfs-post-author-box__title">${title}</p>` : ''}
      ${bio ? `<p class="cfs-post-author-box__bio">${bio}</p>` : ''}
      <p class="cfs-post-author-box__cta"><a href="${href}">View all posts</a></p>
    </div>
  </div>
</aside>
<style id="cfs-post-author-box-css">
.cfs-post-author-box{max-width:1140px;margin:36px auto 48px;padding:0 20px;box-sizing:border-box}
.cfs-post-author-box__inner{display:flex;gap:28px;align-items:center;background:#f7f4ef;border:1px solid #ece7df;border-radius:16px;padding:24px 28px}
.cfs-post-author-box__visual{flex:0 0 auto;text-decoration:none}
.cfs-post-author-box__plate{display:flex;align-items:center;justify-content:center;width:140px;height:140px;background:#f58220;border-radius:18px;padding:14px;box-sizing:border-box}
.cfs-post-author-box__circle{position:relative;width:100%;aspect-ratio:1;border-radius:50%;background:#0c2c5a;overflow:hidden;display:flex;align-items:center;justify-content:center}
.cfs-post-author-box__image{width:78%;height:78%;object-fit:contain;display:block}
.cfs-post-author-box__accent{position:absolute;left:50%;bottom:10px;width:0;height:0;transform:translateX(-50%);border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:14px solid #f58220}
.cfs-post-author-box__meta{flex:1 1 auto;min-width:0}
.cfs-post-author-box__label{margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280}
.cfs-post-author-box__name{margin:0 0 6px;font-size:26px;line-height:1.15;font-weight:700}
.cfs-post-author-box__name a{color:#00a8b5;text-decoration:none}
.cfs-post-author-box__name a:hover{opacity:.85}
.cfs-post-author-box__title{margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#111}
.cfs-post-author-box__bio{margin:0 0 12px;font-size:15px;line-height:1.55;color:#222}
.cfs-post-author-box__cta{margin:0}
.cfs-post-author-box__cta a{color:#f58220;font-weight:700;text-decoration:none}
.cfs-post-author-box__cta a:hover{text-decoration:underline}
@media (max-width:767px){
  .cfs-post-author-box{margin:28px auto 36px;padding:0 16px}
  .cfs-post-author-box__inner{flex-direction:column;align-items:flex-start;padding:20px;gap:16px}
  .cfs-post-author-box__plate{width:120px;height:120px}
  .cfs-post-author-box__name{font-size:22px}
}
</style>`;
}

const AUTHOR_BANNER_SRC = '/wp-content/uploads/2026/09/author-banner.png';
const AUTHOR_ARCHIVE_BANNER_SRC = '/wp-content/uploads/2026/09/author-archive-banner.png';

function buildProfileHtml(author: Author): string {
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = escapeHtml(override.name || author.name);
  const title = escapeHtml(override.title || author.title || '');
  const bio = escapeHtml(author.bio || author.description || '');
  const avatarSrc =
    override.avatar ||
    author.avatar?.src ||
    '/wp-content/uploads/2022/12/cropped-company_formation_logo-removebg-preview-270x270.png';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const linkedin = author.social?.find((s) => s.type === 'linkedin');
  const linkedinHtml = linkedin
    ? `<a class="cfs-author-profile__linkedin" href="${escapeHtml(linkedin.url)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22 0H2C.9 0 0 .9 0 2v20c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2z"/></svg>
      </a>`
    : '';

  return `<section class="cfs-author-profile" aria-label="${name}">
    <img class="cfs-author-profile__bg" src="${AUTHOR_ARCHIVE_BANNER_SRC}" alt="" width="1920" height="420" decoding="async" fetchpriority="high" />
    <div class="cfs-author-profile__inner">
      <div class="cfs-author-profile__card">
        <div class="cfs-author-profile__visual" aria-hidden="false">
          <span class="cfs-author-profile__plate">
            <span class="cfs-author-profile__circle">
              <img class="cfs-author-profile__image" width="220" height="220" src="${avatarSrc}" alt="${avatarAlt}" loading="eager" decoding="async" />
              <span class="cfs-author-profile__accent" aria-hidden="true"></span>
            </span>
          </span>
        </div>
        <div class="cfs-author-profile__meta">
          <div class="cfs-author-profile__name-row">
            <h1 class="cfs-author-profile__name">${name}</h1>
            ${linkedinHtml}
          </div>
          ${title ? `<p class="cfs-author-profile__title">${title}</p>` : ''}
          ${bio ? `<p class="cfs-author-profile__bio">${bio}</p>` : ''}
        </div>
      </div>
    </div>
  </section>`;
}

function buildPostsHeadingHtml(author: Author): string {
  return `<h2 class="cfs-author-posts-heading">Latest Articles by ${escapeHtml(author.name)}</h2>`;
}

function buildAuthorDirectoryHeroHtml(): string {
  return `<section class="cfs-author-hero" aria-label="Authors">
    <img class="cfs-author-hero__bg" src="${AUTHOR_BANNER_SRC}" alt="" width="1920" height="520" decoding="async" fetchpriority="high" />
    <div class="cfs-author-hero__inner">
      <div class="cfs-author-hero__copy">
        <nav class="cfs-author-hero__crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true"> / </span>
          <span class="cfs-author-hero__crumb-current">Author</span>
        </nav>
        <h1 class="cfs-author-hero__title">Authors</h1>
        <p class="cfs-author-hero__desc">Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.</p>
      </div>
    </div>
  </section>`;
}

function buildAuthorDirectoryCardHtml(entry: AuthorDirectoryEntry): string {
  const { author } = entry;
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = escapeHtml(override.name || author.name);
  const title = escapeHtml(override.title || author.title || '');
  const avatarSrc =
    override.avatar ||
    author.avatar?.src ||
    '/wp-content/uploads/2022/12/cropped-company_formation_logo-removebg-preview-270x270.png';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const href = `/author/${author.slug}/`;

  return `<article class="cfs-author-card">
    <a class="cfs-author-card__visual" href="${href}" aria-label="${name}">
      <span class="cfs-author-card__plate">
        <span class="cfs-author-card__circle">
          <img class="cfs-author-card__image" width="220" height="220" src="${avatarSrc}" alt="${avatarAlt}" loading="lazy" decoding="async" />
          <span class="cfs-author-card__accent" aria-hidden="true"></span>
        </span>
      </span>
    </a>
    <h3 class="cfs-author-card__name"><a href="${href}">${name}</a></h3>
    ${title ? `<p class="cfs-author-card__title">${title}</p>` : ''}
  </article>`;
}

function buildAuthorDirectoryPostsHtml(entries: AuthorDirectoryEntry[]): string {
  return `<div class="cfs-author-directory-grid">${entries.map((entry) => buildAuthorDirectoryCardHtml(entry)).join('\n')}</div>`;
}

function buildAuthorArchivePostsHtml(posts: IndexedPost[], author: Author, totalPosts: number): string {
  const cards = buildAuthorArchiveCardsHtml(posts);
  const offset = posts.length;
  const hasMore = offset < totalPosts;
  const loadMore = hasMore
    ? `<div class="cfs-author-load-more-wrap">
  <button type="button" class="cfs-author-load-more" data-cfs-author-load-more data-author-slug="${escapeHtml(author.slug)}" data-offset="${offset}" data-per-page="${AUTHOR_ARCHIVE_LOAD_MORE}" data-total="${totalPosts}">Load more</button>
</div>`
    : '';

  return `<div id="caf-post-layout-container" class="caf-post-layout-container data-target-div1 post-layout1 cfs-author-caf">
  <div id="manage-ajax-response" class="caf-row" data-cfs-author-posts>
    ${cards}
  </div>
  ${loadMore}
</div>`;
}

function patchHeadMeta(html: string, data: AuthorPageData): string {
  const { author, currentPage, totalPages } = data;
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage} of ${totalPages}` : '';
  const baseTitle = author.og?.title || `${author.name}, Author at Company Formation Saudi`;
  const title = `${baseTitle}${pageSuffix}`;
  const description = author.description || author.bio || '';
  const canonical =
    currentPage === 1
      ? author.canonical
      : `${ORIGIN}/author/${author.slug}/page/${currentPage}/`;

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  if (out.includes('name="description"')) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  } else {
    out = out.replace('</head>', `<meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }

  if (out.includes('rel="canonical"')) {
    out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);
  } else {
    out = out.replace('</head>', `<link rel="canonical" href="${canonical}" />\n</head>`);
  }

  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(author.og?.title || title)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(author.og?.description || description)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
  );

  return out;
}

function patchAuthorDirectoryHeadMeta(html: string, entries: AuthorDirectoryEntry[]): string {
  const first = entries[0]?.author;
  const title = 'Author - Company Formation Saudi';
  const description =
    'Guides and articles from Company Formation Saudi on company setup, labor law, visas, and doing business in Saudi Arabia.';
  const canonical = `${ORIGIN}/author/`;
  const ogImage = first?.avatar?.src
    ? first.avatar.src.startsWith('http')
      ? first.avatar.src
      : `${ORIGIN}${first.avatar.src}`
    : `${ORIGIN}/wp-content/uploads/2022/12/cropped-company_formation_logo-removebg-preview-270x270.png`;

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

  if (out.includes('name="description"')) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  } else {
    out = out.replace('</head>', `<meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }

  if (out.includes('name="robots"')) {
    out = out.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, '<meta name="robots" content="nofollow, noindex" />');
  } else {
    out = out.replace('</head>', '<meta name="robots" content="nofollow, noindex" />\n</head>');
  }

  if (out.includes('rel="canonical"')) {
    out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);
  } else {
    out = out.replace('</head>', `<link rel="canonical" href="${canonical}" />\n</head>`);
  }

  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);
  out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`);
  out = out.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  out = out.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${ogImage}" />`);

  return out;
}

export function assembleAuthorArchiveHtml(data: AuthorPageData): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Author shell missing. Run: npm run prepare:author-shell');
  }

  let html = readFileSync(SHELL_PATH, 'utf8');
  const { author, posts, totalPosts } = data;
  const profileHtml = buildProfileHtml(author);
  const postsHtml = buildAuthorArchivePostsHtml(posts, author, totalPosts);

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', '')
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', buildPostsHeadingHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml)
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', '');

  // Full-bleed profile banner outside Elementor boxed content.
  if (html.includes('class="elementor elementor-author-shell"')) {
    html = html.replace(
      /(<div\b[^>]*class="elementor elementor-author-shell"[^>]*>)/i,
      `${profileHtml}\n$1`,
    );
  } else if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${profileHtml}\n`);
  } else {
    html = profileHtml + html;
  }

  html = patchHeadMeta(html, data);

  const loopCssPath = join(ROOT, 'src/legacy/loop-card-24831.css.html');
  const loopCss = existsSync(loopCssPath) ? readFileSync(loopCssPath, 'utf8') : '';
  const cafHeadAssets = `<link rel="stylesheet" id="tc-caf-common-style-css" href="/wp-content/plugins/category-ajax-filter/assets/css/common/common.min.css?ver=2.8.5.1" media="all" />
<link rel="stylesheet" id="tc-caf-post-layout1-css" href="/wp-content/plugins/category-ajax-filter/assets/css/post/post-layout1.min.css?ver=2.8.5.1" media="all" />
<link rel="stylesheet" id="tc-caf-font-awesome-style-css" href="/wp-content/plugins/category-ajax-filter/assets/css/fontawesome/css/font-awesome.min.css?ver=2.8.5.1" media="all" />
<style id="tc-caf-author-archive-inline-css">
#caf-post-layout-container.data-target-div1.post-layout1{background-color:transparent;font-family:inherit}
.data-target-div1 .caf-post-layout1 .caf-post-title{background-color:transparent!important;padding:20px 4px 14px!important;margin:0!important}
.data-target-div1 .caf-post-layout1 .caf-post-title h2,
.data-target-div1 .caf-post-layout1 .caf-post-title h2 a{
  color:#2ba2a3!important;
  font-family:inherit;
  text-transform:inherit;
  font-size:20px!important;
  font-weight:700!important;
  line-height:1.35!important;
}
.data-target-div1 .caf-post-layout1 .caf-meta-content i{color:#18407c}
.data-target-div1 .caf-post-layout1 span.author,
.data-target-div1 .caf-post-layout1 span.date,
.data-target-div1 .caf-post-layout1 span.comment{font-family:inherit}
.data-target-div1 .caf-post-layout1 .caf-content{font-family:inherit}
.data-target-div1 .caf-post-layout1 .caf-content-read-more,
.data-target-div1 .caf-post-layout1 a.caf-read-more{display:none!important}
.cfs-author-caf{max-width:1200px;margin:0 auto;padding:0 16px 24px}
.ecs-posts.elementor-posts-container{display:block!important;padding:0!important;gap:0!important}
.ecs-posts.elementor-posts-container > .cfs-author-caf{width:100%}
.navigation.pagination.elementor-pagination{display:none!important}
.cfs-author-load-more-wrap{display:flex;justify-content:center;padding:8px 0 40px;clear:both}
.cfs-author-load-more{
  appearance:none;
  border:2px solid #f58220;
  background:#fff;
  color:#18407c;
  font-size:15px;
  font-weight:700;
  line-height:1;
  padding:14px 28px;
  border-radius:4px;
  cursor:pointer;
}
.cfs-author-load-more:hover{
  background:#fff7f0;
  color:#f58220;
  border-color:#f58220;
}
.cfs-author-load-more.is-loading{opacity:.65;pointer-events:none}
.cfs-author-load-more.is-hidden{display:none!important}
</style>`;
  const authorFixCss = `<style id="astro-author-archive-css">
:root{
  --cfs-author-teal:#00a8b5;
  --cfs-author-orange:#f58220;
  --cfs-author-navy:#0c2c5a;
  --cfs-author-text:#222;
}
.cfs-author-posts-heading{
  max-width:1200px;
  margin:8px auto 24px;
  padding:0 24px;
  font-size:28px;
  font-weight:700;
  color:#111;
}
.cfs-author-profile{
  position:relative;
  overflow:hidden;
  display:block;
  width:100% !important;
  max-width:none !important;
  margin:0 0 36px !important;
  padding:0 !important;
  min-height:300px;
  background:#f7f4ef url("${AUTHOR_ARCHIVE_BANNER_SRC}") center / cover no-repeat;
  line-height:0;
}
.cfs-author-profile__bg{
  position:absolute;
  inset:0;
  width:100% !important;
  height:100% !important;
  max-width:none !important;
  object-fit:cover;
  object-position:center;
  opacity:0;
  pointer-events:none;
}
.cfs-author-profile__inner{
  position:relative;
  z-index:1;
  display:flex;
  align-items:center;
  box-sizing:border-box;
  max-width:1200px;
  width:100%;
  min-height:300px;
  margin:0 auto;
  padding:36px 24px;
  line-height:normal;
}
.cfs-author-profile__card{
  display:flex;
  align-items:center;
  gap:36px;
  width:100%;
  max-width:920px;
}
.cfs-author-profile__visual{flex:0 0 auto}
.cfs-author-profile__plate{
  display:flex;
  align-items:center;
  justify-content:center;
  width:210px;
  height:210px;
  background:var(--cfs-author-orange);
  border-radius:22px;
  padding:18px;
  box-sizing:border-box;
}
.cfs-author-profile__circle{
  position:relative;
  width:100%;
  aspect-ratio:1;
  border-radius:50%;
  background:var(--cfs-author-navy);
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
}
.cfs-author-profile__image{
  width:78%;
  height:78%;
  object-fit:contain;
  object-position:center;
  display:block;
}
.cfs-author-profile__accent{
  position:absolute;
  left:50%;
  bottom:12px;
  width:0;height:0;
  transform:translateX(-50%);
  border-left:11px solid transparent;
  border-right:11px solid transparent;
  border-bottom:18px solid var(--cfs-author-orange);
  z-index:2;
}
.cfs-author-profile__meta{flex:1 1 auto;min-width:0}
.cfs-author-profile__name-row{
  display:flex;
  align-items:center;
  gap:12px;
  margin:0 0 8px;
}
.cfs-author-profile__name{
  margin:0;
  font-size:clamp(28px, 3.4vw, 42px);
  line-height:1.1;
  font-weight:700;
  color:var(--cfs-author-teal);
}
.cfs-author-profile__linkedin{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:28px;
  height:28px;
  border-radius:4px;
  background:#0a66c2;
  color:#fff;
  text-decoration:none;
  flex:0 0 auto;
}
.cfs-author-profile__linkedin:hover{opacity:.9}
.cfs-author-profile__title{
  margin:0 0 12px;
  font-size:14px;
  font-weight:700;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:#111;
}
.cfs-author-profile__bio{
  margin:0;
  max-width:560px;
  font-size:15px;
  line-height:1.55;
  color:var(--cfs-author-text);
}
@media (max-width:767px){
  .cfs-author-profile{min-height:auto}
  .cfs-author-profile__inner{min-height:0;padding:28px 16px}
  .cfs-author-profile__card{flex-direction:column;align-items:flex-start;gap:18px}
  .cfs-author-profile__plate{width:160px;height:160px;padding:14px;border-radius:18px}
  .cfs-author-posts-heading{font-size:22px;margin-top:0}
}
</style>`;

  if (!html.includes('tc-caf-post-layout1-css')) {
    html = html.replace('</head>', `${cafHeadAssets}\n</head>`);
  }
  if (!html.includes('elementor-post-24831') && loopCss) {
    html = html.replace('</head>', `${loopCss}\n</head>`);
  }
  if (!html.includes('astro-author-archive-css')) {
    html = html.replace('</head>', `${authorFixCss}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  if (!html.includes('data-cfs-author-load-more-script')) {
    const loadMoreScript = `<script data-cfs-author-load-more-script>
(function(){
  var btn=document.querySelector('[data-cfs-author-load-more]');
  var list=document.querySelector('[data-cfs-author-posts]');
  if(!btn||!list) return;
  btn.addEventListener('click', function(){
    if(btn.classList.contains('is-loading')) return;
    var slug=btn.getAttribute('data-author-slug')||'';
    var offset=Number(btn.getAttribute('data-offset')||'0')||0;
    var perPage=Number(btn.getAttribute('data-per-page')||'8')||8;
    btn.classList.add('is-loading');
    btn.textContent='Loading…';
    fetch('/api/blog/author-load-more?slug='+encodeURIComponent(slug)+'&offset='+offset+'&perPage='+perPage)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!data||!data.ok) throw new Error('load failed');
        if(data.html) list.insertAdjacentHTML('beforeend', data.html);
        btn.setAttribute('data-offset', String(data.nextOffset||offset));
        if(!data.hasMore){
          btn.classList.add('is-hidden');
        } else {
          btn.classList.remove('is-loading');
          btn.textContent='Load more';
        }
      })
      .catch(function(){
        btn.classList.remove('is-loading');
        btn.textContent='Load more';
      });
  });
})();
</script>`;
    html = html.replace(/<\/body>/i, `${loadMoreScript}\n</body>`);
  }

  return injectRuntimeGtmLoader(html);
}

export function serveAuthorArchive(data: AuthorPageData): Response {
  const html = assembleAuthorArchiveHtml(data);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}

export function assembleAuthorDirectoryHtml(): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Author shell missing. Run: npm run prepare:author-shell');
  }

  const entries = getAuthorDirectoryEntries();
  let html = readFileSync(SHELL_PATH, 'utf8');
  const heroHtml = buildAuthorDirectoryHeroHtml();

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', '')
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', '')
    .replace('<!--ASTRO_AUTHOR:POSTS-->', buildAuthorDirectoryPostsHtml(entries))
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', '');

  // Full-bleed: place hero after theme header, outside Elementor boxed content.
  if (html.includes('class="elementor elementor-author-shell"')) {
    html = html.replace(
      /(<div\b[^>]*class="elementor elementor-author-shell"[^>]*>)/i,
      `${heroHtml}\n$1`,
    );
  } else if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${heroHtml}\n`);
  } else {
    html = heroHtml + html;
  }

  html = patchAuthorDirectoryHeadMeta(html, entries);

  const authorDirectoryCss = `<style id="astro-author-directory-css">
:root{
  --cfs-author-teal:#00a8b5;
  --cfs-author-orange:#f58220;
  --cfs-author-navy:#0c2c5a;
  --cfs-author-text:#333333;
}
.elementor-author-shell > .elementor-section.elementor-section-boxed{
  max-width:none !important;
}
.elementor-author-shell .elementor-container{
  max-width:1200px;
  margin-inline:auto;
  width:100%;
}
.elementor-author-shell .astro-author-page,
.elementor-author-shell .elementor-widget-wrap{
  text-align:left !important;
}
/* Full-bleed banner under site header */
.cfs-author-hero{
  position:relative;
  overflow:hidden;
  display:block;
  width:100% !important;
  max-width:none !important;
  margin:0 0 48px !important;
  padding:0 !important;
  left:auto !important;
  right:auto !important;
  background:#fff;
  line-height:0;
}
.cfs-author-hero__bg{
  display:block !important;
  width:100% !important;
  max-width:none !important;
  height:auto !important;
  object-fit:cover;
  object-position:center;
}
.cfs-author-hero__inner{
  position:absolute;
  inset:0;
  z-index:1;
  display:flex;
  align-items:center;
  box-sizing:border-box;
  max-width:1200px;
  width:100%;
  margin:0 auto;
  padding:0 24px;
  text-align:left;
  line-height:normal;
  pointer-events:none;
}
.cfs-author-hero__copy{
  max-width:min(480px, 48%);
  pointer-events:auto;
}
.cfs-author-hero__crumbs{
  font-size:14px;
  font-weight:500;
  color:#6b7280;
  margin:0 0 18px;
}
.cfs-author-hero__crumbs a{color:#6b7280;text-decoration:none}
.cfs-author-hero__crumbs a:hover{color:var(--cfs-author-teal)}
.cfs-author-hero__crumb-current{color:var(--cfs-author-teal)}
.cfs-author-hero__title{
  margin:0 0 14px;
  font-size:clamp(40px, 5vw, 64px);
  line-height:1.05;
  font-weight:700;
  color:var(--cfs-author-teal);
  letter-spacing:-0.02em;
}
.cfs-author-hero__desc{
  margin:0;
  max-width:420px;
  font-size:15px;
  line-height:1.55;
  color:var(--cfs-author-text);
}
.elementor-element-6e1eaf5{display:none!important}
.ecs-posts.elementor-posts-container{
  display:block !important;
  padding:0 16px 64px !important;
}
.cfs-author-directory-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:40px 28px;
  max-width:1100px;
  margin:0 auto;
  justify-items:center;
}
.cfs-author-card{
  text-align:center;
  width:100%;
  max-width:230px;
}
.cfs-author-card__visual{display:block;text-decoration:none;color:inherit}
.cfs-author-card__plate{
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  aspect-ratio:1 / 1.05;
  background:var(--cfs-author-orange);
  border-radius:18px;
  padding:18px;
  box-sizing:border-box;
}
.cfs-author-card__circle{
  position:relative;
  width:100%;
  max-width:170px;
  aspect-ratio:1;
  border-radius:50%;
  background:var(--cfs-author-navy);
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
}
.cfs-author-card__image{
  width:78%;
  height:78%;
  object-fit:contain;
  object-position:center;
  display:block;
}
.cfs-author-card__accent{
  position:absolute;
  left:50%;
  bottom:10px;
  width:0;height:0;
  transform:translateX(-50%);
  border-left:10px solid transparent;
  border-right:10px solid transparent;
  border-bottom:16px solid var(--cfs-author-orange);
  z-index:2;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.15));
}
.cfs-author-card__name{
  margin:16px 0 4px;
  font-size:22px;
  font-weight:700;
  line-height:1.25;
  color:var(--cfs-author-teal);
}
.cfs-author-card__name a{
  color:inherit !important;
  text-decoration:none;
}
.cfs-author-card__name a:hover{opacity:.85}
.cfs-author-card__title{
  margin:0;
  font-size:14px;
  line-height:1.35;
  color:#111;
  font-weight:500;
}
@media (max-width:1024px){
  .cfs-author-directory-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 20px}
  .cfs-author-hero__copy{max-width:min(420px, 52%)}
}
@media (max-width:767px){
  .cfs-author-hero{margin-bottom:32px}
  .cfs-author-hero__inner{align-items:flex-start;padding:20px}
  .cfs-author-hero__copy{
    max-width:none;
    width:100%;
    padding:14px 14px 16px;
    border-radius:12px;
    background:rgba(255,255,255,.94);
  }
  .cfs-author-hero__title{font-size:36px}
  .cfs-author-directory-grid{grid-template-columns:1fr;gap:28px}
  .cfs-author-card{max-width:260px}
}
</style>`;

  if (!html.includes('astro-author-directory-css')) {
    html = html.replace('</head>', `${authorDirectoryCss}\n</head>`);
  }
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  return injectRuntimeGtmLoader(html);
}

export function serveAuthorDirectory(): Response {
  const html = assembleAuthorDirectoryHtml();
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
