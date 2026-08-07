/**
 * Author archive types, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import { applySharedChrome } from './shared-chrome.js';
import {
  AUTHOR_POSTS_PER_PAGE,
  buildAuthorArchivePostCardHtml,
  getPostsByAuthorSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const DIRECTORY_SHELL_PATH = join(ROOT, 'src/legacy/author-directory-shell/template.html');
const ORIGIN = 'https://www.payrollmiddleast.org';

/** Live /author/ directory — route slug, post source slug, avatars (payrollmiddleast.org). */
const PEO_AUTHOR_DIRECTORY = [
  {
    routeSlug: 'liam-doherty',
    postSlug: 'liam-doherty',
    name: 'Liam Doherty',
    title: 'Enterprise Director',
    avatar: '/wp-content/uploads/2024/05/Author-06.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-06.png',
  },
  {
    routeSlug: 'christopher',
    postSlug: 'christopher',
    name: 'Christopher Sweeney',
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/05/Author-03.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-03.png',
  },
  {
    routeSlug: 'gregg-steyn',
    postSlug: 'gregg-steyn',
    name: 'Gregg Steyn',
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/05/Author-04.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-04.png',
    bio: "As a Global Enterprise Development at Payroll Middle East, I work with the UAE's leading recruitment and staffing agency in Dubai, offering supreme HR consultancy services and staffing solutions to our clients in the Middle East.",
    linkedin: 'https://www.linkedin.com/in/gregg-steyn-29a828101/',
  },
  {
    routeSlug: 'mirza-obedullah-baig',
    postSlug: 'mirza-obedullah-baig',
    name: 'Mirza Obedullah Baig',
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/05/Author-05.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-05.png',
  },
  {
    routeSlug: 'david-walsh',
    postSlug: 'david-walsh',
    name: 'David Walsh',
    title: 'Business Development Manager',
    avatar: '/wp-content/uploads/2024/05/Author-01.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-01.png',
  },
  {
    routeSlug: 'amy-o-neill',
    postSlug: 'amy-o-neill',
    name: 'Amy O Neill',
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/05/Author-07.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-07.png',
  },
  {
    routeSlug: 'gillian-o-kelly',
    postSlug: 'gillian-o-kelly',
    name: 'Gillian O Kelly',
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/05/Author-02.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-02.png',
  },
  {
    routeSlug: 'timothy-patridge',
    postSlug: 'timothy-patridge',
    name: 'Timothy Partridge',
    title: 'Growth and Expansion Specialist',
    avatar: '/wp-content/uploads/2024/05/Timothy-pro.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Timothy-pro.png',
  },
  {
    routeSlug: 'wesley-steyn',
    postSlug: 'wesley-steyn',
    name: 'Wesley Steyn',
    title: 'Growth and Expansion Specialist',
    avatar: '/wp-content/uploads/2024/05/Author-08.png',
    archiveAvatar: '/wp-content/uploads/2024/05/Author-08.png',
  },
] as const;

function findDirectoryEntry(routeOrPostSlug: string) {
  const aliases: Record<string, string> = {
    liam: 'liam-doherty',
    kate: 'liam-doherty',
    'christopher-sweeney': 'christopher',
  };
  const key = aliases[routeOrPostSlug] || routeOrPostSlug;
  return PEO_AUTHOR_DIRECTORY.find((e) => e.routeSlug === key || e.postSlug === key);
}

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
  posts: BlogPost[];
  currentPage: number;
  totalPages: number;
  totalPosts: number;
}

const LIVE_AUTHOR_ORDER = PEO_AUTHOR_DIRECTORY.map((e) => e.routeSlug);

const LIVE_AUTHOR_OVERRIDES: Record<string, { name?: string; title?: string; avatar?: string }> =
  Object.fromEntries(
    PEO_AUTHOR_DIRECTORY.map((e) => [
      e.postSlug,
      { name: e.name, title: e.title, avatar: e.archiveAvatar },
    ]),
  );
// Live internal /author/wesley-steyn/ title differs from directory card.
LIVE_AUTHOR_OVERRIDES['wesley-steyn'] = {
  ...LIVE_AUTHOR_OVERRIDES['wesley-steyn'],
  title: 'Global Enterprise Development',
};
// Legacy peo/local slugs → payroll live identities.
LIVE_AUTHOR_OVERRIDES.liam = LIVE_AUTHOR_OVERRIDES['liam-doherty'];
LIVE_AUTHOR_OVERRIDES['christopher-sweeney'] = LIVE_AUTHOR_OVERRIDES.christopher;

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
  const dir = findDirectoryEntry(slug);
  const fileSlug = dir?.postSlug || slug;
  const path = join(AUTHORS_DIR, `${fileSlug}.json`);
  let author: Author | null = null;
  if (existsSync(path)) {
    author = JSON.parse(readFileSync(path, 'utf8')) as Author;
  } else if (dir) {
    author = {
      slug: dir.routeSlug,
      name: dir.name,
      title: dir.title,
      canonical: `${ORIGIN}/author/${dir.routeSlug}/`,
      sourceUrl: `${ORIGIN}/author/${dir.routeSlug}/`,
      migratedAt: new Date().toISOString(),
    };
  } else {
    return null;
  }

  const override = LIVE_AUTHOR_OVERRIDES[fileSlug] || LIVE_AUTHOR_OVERRIDES[slug];
  if (override) {
    if (override.name) author.name = override.name;
    if (override.title) author.title = override.title;
    if (override.avatar) {
      author.avatar = { src: override.avatar, alt: author.name };
    }
  }
  if (dir) {
    author.slug = dir.routeSlug;
    author.canonical = `${ORIGIN}/author/${dir.routeSlug}/`;
    if (!author.avatar?.src && dir.archiveAvatar) {
      author.avatar = { src: dir.archiveAvatar, alt: author.name };
    }
    if (dir.bio && !author.bio) author.bio = dir.bio;
    if (dir.linkedin && !author.social?.length) {
      author.social = [{ type: 'linkedin', url: dir.linkedin }];
    }
  }
  if (!author.canonical) author.canonical = `${ORIGIN}/author/${author.slug}/`;
  if (author.name === slug || !author.name) {
    author.name =
      override?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return author;
}

export function getAllAuthors(): Author[] {
  return getAllAuthorSlugs()
    .map((slug) => getAuthor(slug))
    .filter((author): author is Author => author !== null);
}

export function getAuthorPageData(slug: string, page = 1): AuthorPageData | null {
  const author = getAuthor(slug);
  if (!author) return null;

  const dir = findDirectoryEntry(slug);
  const postLookupSlug = dir?.postSlug || slug;
  const allPosts = getPostsByAuthorSlug(postLookupSlug);
  const totalPosts = allPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / AUTHOR_POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * AUTHOR_POSTS_PER_PAGE;
  const posts = allPosts.slice(start, start + AUTHOR_POSTS_PER_PAGE);

  return { author, posts, currentPage, totalPages, totalPosts };
}

export interface AuthorDirectoryEntry {
  author: Author;
  postCount: number;
}

export function getAuthorDirectoryEntries(): AuthorDirectoryEntry[] {
  // Match live /author/: show the full roster even when an author has no posts yet.
  return PEO_AUTHOR_DIRECTORY.map((entry) => ({
    author: {
      slug: entry.routeSlug,
      name: entry.name,
      title: entry.title,
      avatar: { src: entry.avatar, alt: entry.name },
      canonical: `${ORIGIN}/author/${entry.routeSlug}/`,
      sourceUrl: `${ORIGIN}/author/${entry.routeSlug}/`,
      migratedAt: '',
    },
    postCount: getPostsByAuthorSlug(entry.postSlug).length,
  }));
}

function buildProfileHtml(author: Author): string {
  const name = escapeHtml(author.name);
  const title = author.title ? escapeHtml(author.title) : '';
  const bio = author.bio ? escapeHtml(author.bio) : '';
  const dir = findDirectoryEntry(author.slug);
  const avatarSrc = author.avatar?.src || dir?.archiveAvatar || '';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const bioText = author.bio || dir?.bio || '';
  const linkedinUrl = author.social?.find((s) => s.type === 'linkedin')?.url || dir?.linkedin;

  const avatarHtml = avatarSrc
    ? `<div class="elementor-element elementor-element-3f84043 elementor-widget elementor-widget-image" data-id="3f84043" data-element_type="widget" data-widget_type="image.default">
				<div class="elementor-widget-container">
															<img src="${avatarSrc}" title="" alt="${avatarAlt}" loading="lazy" />															</div>
				</div>`
    : '';

  const linkedin = linkedinUrl
    ? `<div class="elementor-element elementor-element-19478c0 elementor-widget__width-initial elementor-view-default elementor-widget elementor-widget-icon" data-id="19478c0" data-element_type="widget" data-widget_type="icon.default">
				<div class="elementor-widget-container">
							<div class="elementor-icon-wrapper">
			<a class="elementor-icon" href="${escapeHtml(linkedinUrl)}" target="_blank" rel="noopener noreferrer">
			<i aria-hidden="true" class="fab fa-linkedin"></i>			</a>
		</div>
						</div>
				</div>`
    : '';

  const inner = `<section class="elementor-section elementor-inner-section elementor-element elementor-element-05a00a4 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="05a00a4" data-element_type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-9f7ca9a" data-id="9f7ca9a" data-element_type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						${avatarHtml}
					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-54134ad" data-id="54134ad" data-element_type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
						<div class="elementor-element elementor-element-cbbcb50 elementor-widget__width-auto elementor-widget elementor-widget-heading" data-id="cbbcb50" data-element_type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<h2 class="elementor-heading-title elementor-size-default">${name}</h2>				</div>
				</div>
				${linkedin}
				${title ? `<div class="elementor-element elementor-element-012fe47 elementor-widget elementor-widget-heading" data-id="012fe47" data-element_type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<span class="elementor-heading-title elementor-size-default">${title}</span>				</div>
				</div>` : ''}
					</div>
		</div>
					</div>
		</section>
				${bioText ? `<div class="elementor-element elementor-element-e7f8ba2 elementor-widget elementor-widget-heading" data-id="e7f8ba2" data-element_type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<p class="elementor-heading-title elementor-size-default">${escapeHtml(bioText)}</p>				</div>
				</div>` : ''}`;

  return `<section class="elementor-section elementor-top-section elementor-element elementor-element-d04d9d2 elementor-section-full_width elementor-section-height-default astro-author-hero-wrap" data-id="d04d9d2" data-element_type="section">
						<div class="elementor-container elementor-column-gap-default">
					<div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-hero-col" data-element_type="column">
			<div class="elementor-widget-wrap elementor-element-populated astro-author-hero-card">
						${inner}
					</div>
		</div>
					</div>
		</section>`;
}

function buildPostsHeadingHtml(author: Author): string {
  return `<h2 class="elementor-heading-title elementor-size-default">Latest Articles by ${escapeHtml(author.name)}</h2>`;
}

function buildAuthorDirectoryHeroHtml(): string {
  return `<section class="elementor-section elementor-top-section elementor-element elementor-element-f45c242 astro-author-hero elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="f45c242" data-element_type="section">
    <div class="elementor-container elementor-column-gap-default">
      <div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-6c55a7e" data-id="6c55a7e" data-element_type="column">
        <div class="elementor-widget-wrap elementor-element-populated">
          <div class="elementor-element elementor-element-d0b4ef6 elementor-widget elementor-widget-heading" data-id="d0b4ef6" data-widget_type="heading.default">
            <h2 class="elementor-heading-title elementor-size-default">Our Authors</h2>
          </div>
          <div class="elementor-element elementor-element-6ed679f elementor-widget elementor-widget-heading" data-id="6ed679f" data-widget_type="heading.default">
            <p class="elementor-heading-title elementor-size-default">Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function buildAuthorDirectoryCardHtml(entry: AuthorDirectoryEntry): string {
  const { author } = entry;
  const name = escapeHtml(author.name);
  const title = escapeHtml(author.title || '');
  const avatarSrc = author.avatar?.src || '/wp-content/uploads/2024/05/Author-03.png';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const href = `/author/${author.slug}/`;

  return `<div class="elementor-element elementor-position-top elementor-widget elementor-widget-image-box" data-element_type="widget" data-widget_type="image-box.default">
				<div class="elementor-widget-container">
					<div class="elementor-image-box-wrapper"><figure class="elementor-image-box-img"><a href="${href}" tabindex="-1"><img loading="lazy" decoding="async" width="297" height="220" src="${avatarSrc}" class="attachment-full size-full" alt="${avatarAlt}" /></a></figure><div class="elementor-image-box-content"><h3 class="elementor-image-box-title"><a href="${href}">${name}</a></h3><p class="elementor-image-box-description">${title}</p></div></div>				</div>
				</div>`;
}

function buildAuthorDirectoryPostsHtml(entries: AuthorDirectoryEntry[]): string {
  const cards = entries.map((entry) => buildAuthorDirectoryCardHtml(entry)).join('\n');
  return `<div class="astro-author-directory-grid">${cards}</div>`;
}

function buildPaginationHtml(author: Author, currentPage: number, totalPages: number): string {
  if (totalPages <= 1) return '';

  const base = `/author/${author.slug}/`;
  const items: string[] = [];

  if (currentPage > 1) {
    const prev = currentPage === 2 ? base : `${base}page/${currentPage - 1}/`;
    items.push(`<a class="page-numbers prev" href="${prev}">&laquo; Previous</a>`);
  } else {
    items.push('<span class="page-numbers prev">&laquo; Previous</span>');
  }

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

  if (currentPage < totalPages) {
    const next = `${base}page/${currentPage + 1}/`;
    items.push(`<a class="page-numbers next" href="${next}">Next &raquo;</a>`);
  }

  return `<nav class="elementor-pagination" aria-label="Pagination">${items.join('\n')}</nav>`;
}

function patchHeadMeta(html: string, data: AuthorPageData): string {
  const { author, currentPage, totalPages } = data;
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage} of ${totalPages}` : '';
  const title = author.og?.title || `${author.name}, Author at Payroll Middle East${pageSuffix}`;
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
  const title = 'Author | Payroll Middle East';
  const description =
    'Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.';
  const canonical = `${ORIGIN}/author/`;
  const ogImage = first?.avatar?.src
    ? first.avatar.src.startsWith('http')
      ? first.avatar.src
      : `${ORIGIN}${first.avatar.src}`
    : `${ORIGIN}/wp-content/uploads/2024/05/liam-peo-author.png`;

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
    out = out.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, '<meta name="robots" content="index, follow" />');
  } else {
    out = out.replace('</head>', '<meta name="robots" content="index, follow" />\n</head>');
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
  const { author, posts, currentPage, totalPages } = data;

  const postsHtml = posts.map((p) => buildAuthorArchivePostCardHtml(p)).join('\n');

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildProfileHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', buildPostsHeadingHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml)
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', buildPaginationHtml(author, currentPage, totalPages));

  html = patchHeadMeta(html, data);

  const loopCssPath = join(ROOT, 'src/legacy/loop-card-24831.css.html');
  const loopCss = existsSync(loopCssPath) ? readFileSync(loopCssPath, 'utf8') : '';
  const authorFixCss = `<style id="astro-author-archive-css">
.elementor.elementor-73672.elementor-location-archive{
  padding-top:100px;
}
@media (max-width:900px){
  .elementor.elementor-73672.elementor-location-archive{padding-top:88px}
}
.astro-author-profile-section{
  margin:0;
  padding:0;
  max-width:none;
  width:100%;
}
/* Break out of Astra .ast-container so the blue banner is full-bleed. */
.elementor-location-archive .astro-author-profile-section,
.elementor-location-archive .astro-author-hero-wrap{
  width:100vw;
  max-width:100vw;
  position:relative;
  left:50%;
  right:50%;
  margin-left:-50vw;
  margin-right:-50vw;
}
.astro-author-hero-wrap{
  background-color:#4166ac;
  background-image:url("/wp-content/uploads/2024/05/Banner.jpg");
  background-position:center center;
  background-repeat:no-repeat;
  background-size:cover;
  padding:55px 20px 45px;
  margin-top:0;
  box-sizing:border-box;
}
.astro-author-hero-wrap > .elementor-container{
  max-width:1140px;
  margin-left:auto;
  margin-right:auto;
  width:100%;
}
.astro-author-hero-card{
  background:#ffffff;
  border-radius:22px;
  padding:36px 40px 28px;
  box-shadow:0 12px 40px rgba(7,12,19,.12);
  max-width:1140px;
  margin:0 auto;
  width:100%;
  box-sizing:border-box;
}
.astro-author-hero-card .elementor-element-05a00a4{margin-bottom:0}
.astro-author-hero-card .elementor-element-e7f8ba2{margin-top:20px}
/* Name, designation, bio — black (override Elementor theme blues). */
.astro-author-hero-card .elementor-heading-title,
.astro-author-hero-card .elementor-element-cbbcb50 .elementor-heading-title,
.astro-author-hero-card .elementor-element-012fe47 .elementor-heading-title,
.astro-author-hero-card .elementor-element-e7f8ba2 .elementor-heading-title,
.astro-author-hero-card .elementor-element-cbbcb50 .elementor-heading-title a,
.astro-author-hero-card h2.elementor-heading-title,
.astro-author-hero-card span.elementor-heading-title,
.astro-author-hero-card p.elementor-heading-title{
  color:#111111 !important;
}
.author-post .elementor-posts-container.elementor-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  column-gap:30px;
  row-gap:35px;
}
@media (max-width:1024px){
  .author-post .elementor-posts-container.elementor-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:767px){
  .author-post .elementor-posts-container.elementor-grid{grid-template-columns:1fr}
}
.author-post .elementor-post.elementor-grid-item{
  display:flex;
  flex-direction:column;
  align-items:stretch;
}
.author-post .elementor-posts--thumbnail-top .elementor-post__thumbnail__link{
  display:block;
  width:100%;
  margin-bottom:20px;
}
.author-post .elementor-post__thumbnail{
  position:relative;
  overflow:hidden;
  line-height:0;
  padding-bottom:56%;
}
.author-post .elementor-post__thumbnail img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.author-post .elementor-posts--thumbnail-top .elementor-post__text{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  width:100%;
}
.author-post .elementor-element.elementor-element-9a4ff2d .elementor-post__meta-data{
  order:1;
  margin:0 0 10px;
}
.author-post .elementor-element.elementor-element-9a4ff2d .elementor-post__title,
.author-post .elementor-element.elementor-element-9a4ff2d .elementor-post__title a{
  order:2;
  margin:0 0 15px;
  color:#00294b;
  font-size:16px;
  font-weight:700;
  line-height:20px;
}
.author-post .elementor-element.elementor-element-9a4ff2d .elementor-post__meta-data,
.author-post .elementor-element.elementor-element-9a4ff2d .elementor-post-date{
  color:#8997b0;
  font-size:12px;
  font-weight:400;
  line-height:17px;
}
.author-post .elementor-element.elementor-element-9a4ff2d a.elementor-post__read-more{
  order:3;
  color:#4166ac;
  font-size:15px;
  font-weight:600;
  line-height:23px;
  text-transform:uppercase;
  text-decoration:none;
}
.author-post .elementor-element.elementor-element-9a4ff2d a.elementor-post__read-more:hover{
  color:#0058b8;
}
.author-post .elementor-element.elementor-element-5ef9ffd .elementor-heading-title{
  color:#00294b;
  font-size:28px;
  font-weight:700;
  line-height:1.25;
  margin:0 0 28px;
}
.author-post .elementor-pagination{
  text-align:center;
  margin-top:25px;
}
.author-post .elementor-pagination .page-numbers{
  display:inline-block;
  padding:6px 12px;
  margin:0 4px;
  color:#4166ac;
  text-decoration:none;
}
.author-post .elementor-pagination .page-numbers.current{
  font-weight:700;
  color:#00294b;
}
</style>`;

  if (!html.includes('elementor-post-24831') && loopCss) {
    html = html.replace('</head>', `${loopCss}\n</head>`);
  }
  if (!html.includes('astro-author-archive-css')) {
    html = html.replace('</head>', `${authorFixCss}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  if (!html.includes('data-payroll-migration-overrides') && !html.includes('/css/migration-overrides.css')) {
    html = html.replace(
      '</head>',
      '<link rel="stylesheet" href="/css/migration-overrides.css" data-payroll-migration-overrides="1" />\n</head>',
    );
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
  if (!existsSync(DIRECTORY_SHELL_PATH)) {
    throw new Error('Author directory shell missing. Run: npm run prepare:author-directory-shell');
  }

  const entries = getAuthorDirectoryEntries();
  let html = readFileSync(DIRECTORY_SHELL_PATH, 'utf8');

  html = html.replace('<!--ASTRO_AUTHOR:DIRECTORY-->', buildAuthorDirectoryPostsHtml(entries));

  html = patchAuthorDirectoryHeadMeta(html, entries);

  const directoryCss = `<style id="astro-author-directory-css">
.elementor.elementor-73668{
  padding-top:100px;
}
@media (max-width:900px){
  .elementor.elementor-73668{padding-top:88px}
}
.elementor-73668 .elementor-element-eb64ecf{
  background-color:#fff;
  padding:48px 0 40px;
}
.elementor-73668 .elementor-element-86e3bc4{padding:40px 0 60px}
.elementor-73668 .elementor-element-86e3bc4 > .elementor-container{
  display:block;
  max-width:1140px;
}
.astro-author-directory-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:48px 24px;
  width:100%;
  justify-items:center;
}
@media (max-width:1024px){
  .astro-author-directory-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:767px){
  .astro-author-directory-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 16px}
}
@media (max-width:479px){
  .astro-author-directory-grid{grid-template-columns:1fr}
}
.astro-author-directory-grid .elementor-widget-image-box{
  width:100%;
  max-width:220px;
}
.astro-author-directory-grid .elementor-image-box-wrapper{
  text-align:center;
}
.astro-author-directory-grid .elementor-image-box-img{
  width:160px !important;
  max-width:160px;
  margin:0 auto 16px !important;
  background:transparent;
  border-radius:0;
  overflow:visible;
  padding:0;
  position:relative;
}
.astro-author-directory-grid .elementor-image-box-img::before{
  content:"";
  position:absolute;
  inset:-10px;
  border-radius:50%;
  background:#cfe0f5;
  z-index:0;
}
.astro-author-directory-grid .elementor-image-box-img a{
  position:relative;
  z-index:1;
  display:block;
  border-radius:50%;
  overflow:hidden;
  line-height:0;
}
.astro-author-directory-grid .elementor-image-box-img img{
  display:block;
  width:160px;
  height:160px;
  object-fit:cover;
  border-radius:50%;
  margin:0 auto;
}
.astro-author-directory-grid .elementor-image-box-content{
  text-align:center;
  padding-top:0;
}
.astro-author-directory-grid .elementor-image-box-title{
  margin:0;
  font-family:inherit;
  font-size:1.05rem;
  line-height:1.35;
  font-weight:700;
  letter-spacing:0;
}
.astro-author-directory-grid .elementor-image-box-title a{
  color:#0058b8;
  text-decoration:underline;
  text-underline-offset:3px;
}
.astro-author-directory-grid .elementor-image-box-title a:hover{
  color:#00294b;
}
.astro-author-directory-grid .elementor-image-box-description{
  margin:8px 0 0;
  font-size:0.9rem;
  line-height:1.45;
  color:#8a93a0;
}
</style>`;
  if (!html.includes('astro-author-directory-css')) {
    html = html.replace('</head>', `${directoryCss}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  if (!html.includes('data-payroll-migration-overrides') && !html.includes('/css/migration-overrides.css')) {
    html = html.replace(
      '</head>',
      '<link rel="stylesheet" href="/css/migration-overrides.css" data-payroll-migration-overrides="1" />\n</head>',
    );
  }

  // Swap peo Impreza header/footer for payroll Astra chrome (drops dead peo country links).
  html = applySharedChrome(html, 'author');

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
