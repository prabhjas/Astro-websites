/**
 * Author archive types, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import {
  AUTHOR_POSTS_PER_PAGE,
  buildPostCardHtml,
  getPostsByAuthorSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const ORIGIN = '';

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

const LIVE_AUTHOR_ORDER = [
  'kate-williams',
  'liam-doherty',
  'sahiba',
  'david-walsh',
  'vijoy-vijayanandan',
  'nakul',
  'timothy-patridge',
  'harneet',
];

const LIVE_AUTHOR_OVERRIDES: Record<string, { name?: string; title?: string; avatar?: string }> = {
  'kate-williams': {
    name: 'Kate Williams',
    title: 'Managing Broker/Partner, e-PRO',
    avatar: '/wp-content/uploads/2024/05/KW.png',
  },
  'liam-doherty': { avatar: '/wp-content/uploads/2024/05/LD.png' },
  sahiba: { avatar: '/wp-content/uploads/2024/05/SM.png' },
  'david-walsh': { avatar: '/wp-content/uploads/2024/05/DW.png' },
  'vijoy-vijayanandan': { avatar: '/wp-content/uploads/2024/05/VV.png' },
  nakul: {
    title: 'Head of Recruitment & Business Development',
    avatar: '/wp-content/uploads/2024/05/NS.png',
  },
  'timothy-patridge': { name: 'Timothy Partridge', avatar: '/wp-content/uploads/2024/05/TP.png' },
  harneet: { avatar: '/wp-content/uploads/2024/05/HB.png' },
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

export function getAuthorPageData(slug: string, page = 1): AuthorPageData | null {
  let author = getAuthor(slug);
  const allPosts = getPostsByAuthorSlug(slug);
  if (!author) {
    if (!allPosts.length) return null;
    const rawName = String(allPosts[0].author?.name || slug).replace(/<[^>]+>/g, '').trim() || slug;
    author = {
      slug,
      name: rawName,
      canonical: `/author/${slug}/`,
      description: `Articles by ${rawName}`,
      sourceUrl: `/author/${slug}/`,
      migratedAt: new Date().toISOString(),
    };
  }

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
  const entries = getAllAuthors()
    .map((author) => ({
      author,
      postCount: getPostsByAuthorSlug(author.slug).length,
    }))
    .filter((entry) => entry.postCount > 0);

  const preferred = LIVE_AUTHOR_ORDER.map((slug) => entries.find((entry) => entry.author.slug === slug)).filter(
    (entry): entry is AuthorDirectoryEntry => Boolean(entry),
  );
  return preferred.length ? preferred : entries.sort((a, b) => a.author.name.localeCompare(b.author.name));
}

function buildProfileHtml(author: Author): string {
  const name = escapeHtml(author.name);
  const title = author.title ? escapeHtml(author.title) : '';
  const bio = author.bio ? escapeHtml(author.bio) : '';
  const avatarSrc = author.avatar?.src || '';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);

  const avatarHtml = avatarSrc
    ? `<div class="elementor-element elementor-element-c5e7b22 elementor-widget elementor-widget-image" data-widget_type="image.default">
        <img width="286" height="266" src="${avatarSrc}" alt="${avatarAlt}" class="attachment-large size-large" loading="lazy" />
      </div>`
    : '';

  const linkedin = author.social?.find((s) => s.type === 'linkedin');
  const linkedinHtml = linkedin
    ? `<div class="elementor-element elementor-element-6ff7a74 elementor-widget__width-auto elementor-view-default elementor-widget elementor-widget-icon" data-widget_type="icon.default">
        <div class="elementor-icon-wrapper">
          <a class="elementor-icon" href="${escapeHtml(linkedin.url)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg aria-hidden="true" class="e-font-icon-svg e-fab-linkedin" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"></path></svg>
          </a>
        </div>
      </div>`
    : '';

  return `<section class="elementor-section elementor-top-section elementor-element elementor-element-58abf12 elementor-section-boxed elementor-section-height-default" data-id="58abf12" data-element_type="section">
    <div class="elementor-container elementor-column-gap-default">
      <div class="elementor-column elementor-col-100 elementor-top-column elementor-element elementor-element-dce297d" data-id="dce297d" data-element_type="column">
        <div class="elementor-widget-wrap elementor-element-populated">
          <section class="elementor-section elementor-inner-section elementor-element elementor-element-c10a2ed main-auth elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="c10a2ed" data-element_type="section">
            <div class="elementor-container elementor-column-gap-default">
              <div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-bee1fb5">
                <div class="elementor-widget-wrap elementor-element-populated">${avatarHtml}</div>
              </div>
              <div class="elementor-column elementor-col-50 elementor-inner-column elementor-element elementor-element-3c484b8">
                <div class="elementor-widget-wrap elementor-element-populated">
                  <div class="elementor-element elementor-element-b5d8e9f elementor-widget__width-auto elementor-widget elementor-widget-heading" data-widget_type="heading.default">
                    <p class="elementor-heading-title elementor-size-default">${name}</p>
                  </div>
                  ${linkedinHtml}
                  ${title ? `<div class="elementor-element elementor-element-2e0fb4e elementor-widget elementor-widget-heading" data-widget_type="heading.default"><span class="elementor-heading-title elementor-size-default">${title}</span></div>` : ''}
                  ${bio ? `<div class="elementor-element elementor-element-bb840a7 elementor-widget elementor-widget-heading" data-widget_type="heading.default"><p class="elementor-heading-title elementor-size-default">${bio}</p></div>` : ''}
                </div>
              </div>
            </div>
          </section>
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
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = escapeHtml(override.name || author.name);
  const title = escapeHtml(override.title || author.title || '');
  const avatarSrc = override.avatar || author.avatar?.src || '/wp-content/uploads/2024/05/KW.png';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const href = `/author/${author.slug}/`;

  return `<article class="astro-author-card">
    <a class="astro-author-card__image-link" href="${href}">
      <img class="astro-author-card__image attachment-medium size-medium" width="286" height="266" src="${avatarSrc}" alt="${avatarAlt}" loading="lazy" decoding="async" />
    </a>
    <h3 class="elementor-heading-title elementor-size-default astro-author-card__name"><a href="${href}">${name}</a></h3>
    ${title ? `<p class="elementor-heading-title elementor-size-default astro-author-card__title">${title}</p>` : ''}
  </article>`;
}

function buildAuthorDirectoryPostsHtml(entries: AuthorDirectoryEntry[]): string {
  return entries.map((entry) => buildAuthorDirectoryCardHtml(entry)).join('\n');
}

function buildPaginationHtml(author: Author, currentPage: number, totalPages: number): string {
  if (totalPages <= 1) return '';

  const base = `/author/${author.slug}/`;
  const items: string[] = [];

  if (currentPage > 1) {
    const prev = currentPage === 2 ? base : `${base}page/${currentPage - 1}/`;
    items.push(`<a class="prev page-numbers" href="${prev}">Previous</a>`);
  }

  for (let p = 1; p <= totalPages; p++) {
    const href = p === 1 ? base : `${base}page/${p}/`;
    if (p === currentPage) {
      items.push(`<span aria-current="page" class="page-numbers current">${p}</span>`);
    } else {
      items.push(`<a class="page-numbers" href="${href}">${p}</a>`);
    }
  }

  if (currentPage < totalPages) {
    const next = `${base}page/${currentPage + 1}/`;
    items.push(`<a class="next page-numbers" href="${next}">Next</a>`);
  }

  return `<nav class="navigation pagination elementor-pagination" aria-label="Posts"><div class="nav-links">${items.join('\n')}</div></nav>`;
}

function patchHeadMeta(html: string, data: AuthorPageData): string {
  const { author, currentPage, totalPages } = data;
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage} of ${totalPages}` : '';
  const title = author.og?.title || `${author.name}, Author at Connect Group${pageSuffix}`;
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
  const title = 'Author - Connect Group';
  const description =
    'Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.';
  const canonical = `${ORIGIN}/author/`;
  const ogImage = first?.avatar?.src ? (first.avatar.src.startsWith('http') ? first.avatar.src : `${ORIGIN}${first.avatar.src}`) : `${ORIGIN}/wp-content/uploads/2024/05/KW.png`;

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
  const { author, posts, currentPage, totalPages } = data;

  const postsHtml = posts.map((p) => buildPostCardHtml(p)).join('\n');

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildProfileHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', buildPostsHeadingHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml)
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', buildPaginationHtml(author, currentPage, totalPages));

  html = patchHeadMeta(html, data);

  const loopCssPath = join(ROOT, 'src/legacy/loop-card-24831.css.html');
  const loopCss = existsSync(loopCssPath) ? readFileSync(loopCssPath, 'utf8') : '';
  const authorFixCss = `<style id="astro-author-archive-css">
.e-font-icon-svg{width:1em;height:1em;display:inline-block;vertical-align:middle;fill:currentColor}
.elementor-24831 .elementor-widget-theme-post-featured-image img{width:100%;height:auto;display:block;border-radius:10px 10px 0 0;object-fit:cover;aspect-ratio:16/9;object-position:center center}
.ecs-posts.elementor-posts-container{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:35px}
@media (max-width:767px){.ecs-posts.elementor-posts-container{grid-template-columns:1fr}}
.astro-author-profile-section,
.elementor-element-58abf12{padding:40px 0 20px;background:#f5f5f5}
.elementor-element-58abf12 > .elementor-container{max-width:var(--container-max-width,1140px);margin-inline:auto}
.main-auth{border-bottom:2px solid #241F7A;background:#fff;box-shadow:0 0 10px rgba(0,0,0,.07);border-radius:8px;padding:30px 40px;max-width:100%}
.main-auth .elementor-widget-image img{width:180px;height:180px;object-fit:cover;border-radius:50%;display:block;margin:0 auto}
.main-auth .elementor-element-b5d8e9f .elementor-heading-title{font-size:32px;font-weight:700;margin:0;color:#070c13}
.main-auth .elementor-element-2e0fb4e .elementor-heading-title{font-size:16px;color:#666;font-weight:500}
.main-auth .elementor-element-bb840a7 .elementor-heading-title{font-size:16px;line-height:1.6;color:#333;font-weight:400}
.main-auth .elementor-icon svg{width:20px;height:20px;fill:#0a66c2}
@media (max-width:767px){.main-auth{padding:24px 20px}}
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

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildAuthorDirectoryHeroHtml())
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', '')
    .replace('<!--ASTRO_AUTHOR:POSTS-->', buildAuthorDirectoryPostsHtml(entries))
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', '');

  html = patchAuthorDirectoryHeadMeta(html, entries);

  const authorDirectoryCss = `<style id="astro-author-directory-css">
/* Live Elementor page 21412 mirror */
.astro-author-hero,
.elementor-element-f45c242{
  background-image:url("/wp-content/uploads/2024/05/Rectangle-462.png");
  background-position:center center;
  background-repeat:no-repeat;
  background-size:cover;
  padding:70px 0 80px;
}
.astro-author-hero .elementor-widget-wrap,
.elementor-element-6c55a7e > .elementor-widget-wrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
}
.astro-author-hero .elementor-element-d0b4ef6,
.astro-author-hero .elementor-element-6ed679f{text-align:center}
.astro-author-hero .elementor-element-d0b4ef6 .elementor-heading-title{
  font-family:"SF Pro Display",sans-serif;
  font-size:56px;
  font-weight:500;
  line-height:1.2;
  color:#FFFFFF;
  margin:0 0 5px;
}
.astro-author-hero .elementor-element-6ed679f{
  width:555px;
  max-width:100%;
}
.astro-author-hero .elementor-element-6ed679f .elementor-heading-title{
  font-family:"SF Pro Display",sans-serif;
  font-size:18px;
  font-weight:500;
  line-height:1.3em;
  color:#FFFFFF;
  margin:0;
}
.elementor-element-fbd336b{
  background:transparent;
  padding-top:50px !important;
  padding-bottom:50px !important;
}
.elementor-element-6e1eaf5{display:none!important}
.elementor-widget-posts .elementor-widget-container{padding-top:0}
.ecs-posts.elementor-posts-container{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:30px 20px;
  justify-items:center;
}
.astro-author-card{
  text-align:center;
  width:100%;
  max-width:320px;
  margin:0 auto;
}
.astro-author-card__image-link{display:inline-block;text-decoration:none;line-height:0}
.astro-author-card__image{
  width:200px;
  max-width:100%;
  height:auto;
  display:block;
  margin:0 auto 12px;
  border-radius:0;
  object-fit:contain;
  box-shadow:none;
}
.ecs-posts .astro-author-card__name,
.ecs-posts h3.astro-author-card__name.elementor-heading-title,
.astro-author-card__name.elementor-heading-title{
  font-family:"SF Pro Display", SF Pro Display !important;
  font-size:24px !important;
  font-weight:700 !important;
  line-height:1.3em !important;
  margin:0 0 4px;
  text-align:center;
  color:#070C13;
}
.ecs-posts .astro-author-card__name a,
.astro-author-card__name a{
  font-family:inherit !important;
  font-size:inherit !important;
  font-weight:inherit !important;
  line-height:inherit !important;
  color:#070C13 !important;
  text-decoration:none;
}
.ecs-posts .astro-author-card__title,
.ecs-posts p.astro-author-card__title.elementor-heading-title,
.astro-author-card__title.elementor-heading-title{
  font-family:"SF Pro Display", SF Pro Display !important;
  font-size:15px !important;
  font-weight:400 !important;
  line-height:1.3em !important;
  color:#666666 !important;
  margin:0;
  text-align:center;
}
@media (max-width:1024px){
  .astro-author-hero .elementor-element-d0b4ef6 .elementor-heading-title{font-size:45px}
  .ecs-posts .astro-author-card__name,
  .ecs-posts h3.astro-author-card__name.elementor-heading-title,
  .astro-author-card__name.elementor-heading-title{font-size:18px !important}
  .ecs-posts.elementor-posts-container{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:767px){
  .astro-author-hero,.elementor-element-f45c242{padding:50px 0 60px}
  .astro-author-hero .elementor-element-d0b4ef6 .elementor-heading-title{font-size:40px}
  .ecs-posts .astro-author-card__name,
  .ecs-posts h3.astro-author-card__name.elementor-heading-title,
  .astro-author-card__name.elementor-heading-title{font-size:22px !important}
  .ecs-posts .astro-author-card__title,
  .ecs-posts p.astro-author-card__title.elementor-heading-title,
  .astro-author-card__title.elementor-heading-title{font-size:16px !important}
  .ecs-posts.elementor-posts-container{grid-template-columns:1fr}
  .elementor-element-fbd336b{padding:30px 0}
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
