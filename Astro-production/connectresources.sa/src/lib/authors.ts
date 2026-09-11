/**
 * Author directory + single-author archive for Connect Resources Saudi.
 * Figma: Connect-Resources-Saudi node 1209-2952 — grey portraits, color on hover.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import { applySharedChrome } from './shared-chrome.js';
import {
  AUTHOR_POSTS_PER_PAGE,
  buildPostCardHtml,
  getPostsByAuthorSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const ORIGIN = 'https://connectresources.sa';

const AUTHOR_BANNER_IMAGE = '/wp-content/uploads/2025/01/Background-Insights-image.webp';
const LINKEDIN_ICON = '/wp-content/uploads/2024/05/author-linkedin.svg';

/** Directory order matching Figma author set (L→R). */
const LIVE_AUTHOR_ORDER = ['timothy-partridge', 'gregg-steyn', 'david-walsh', 'dylan-wesley'];

/** Figma hover border: 10px linear-gradient(#EBFFED → Third #7FD884) */
const HOVER_BORDER_LIGHT = '#EBFFED';
const HOVER_BORDER_THIRD = '#7FD884';

export interface AuthorSocial {
  type: string;
  url: string;
}

export interface AuthorAvatar {
  src: string;
  alt?: string;
  gray?: string;
  color?: string;
}

export interface Author {
  slug: string;
  name: string;
  title?: string;
  bio?: string;
  avatar?: AuthorAvatar | null;
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
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
    .filter((author) => LIVE_AUTHOR_ORDER.includes(author.slug) || getPostsByAuthorSlug(author.slug).length > 0)
    .filter((author) => author.slug !== 'connect-staff')
    .map((author) => ({
      author,
      postCount: getPostsByAuthorSlug(author.slug).length,
    }));

  const preferred = LIVE_AUTHOR_ORDER.map((slug) => entries.find((entry) => entry.author.slug === slug)).filter(
    (entry): entry is AuthorDirectoryEntry => Boolean(entry),
  );
  return preferred.length ? preferred : entries.sort((a, b) => a.author.name.localeCompare(b.author.name));
}

function avatarPair(author: Author): { gray: string; color: string; alt: string } {
  const gray = author.avatar?.gray || author.avatar?.src || '';
  const color = author.avatar?.color || author.avatar?.src || gray;
  const alt = escapeHtml(author.avatar?.alt || author.name);
  return { gray, color, alt };
}

function linkedinUrl(author: Author): string | null {
  const link = author.social?.find((s) => /linkedin/i.test(s.type) || /linkedin\.com/i.test(s.url));
  return link?.url || null;
}

function linkedinHtml(author: Author, className: string, withLabel = false): string {
  const url = linkedinUrl(author);
  if (!url) return '';
  const label = withLabel ? `<span class="${className}-label">LinkedIn</span>` : '';
  return `<a class="${className}" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(author.name)} on LinkedIn">
    <img src="${LINKEDIN_ICON}" width="15" height="15" alt="" decoding="async" />
    ${label}
  </a>`;
}

function buildHoverAvatarHtml(
  author: Author,
  className: string,
  width: number,
  height: number,
): string {
  const { gray, color, alt } = avatarPair(author);
  if (!gray) {
    return `<span class="${className} ${className}--placeholder" aria-hidden="true">${escapeHtml(author.name.charAt(0))}</span>`;
  }
  return `<span class="${className}">
    <span class="${className}-frame">
      <img class="${className}__gray" width="${width}" height="${height}" src="${escapeAttr(gray)}" alt="${alt}" loading="lazy" decoding="async" />
      <img class="${className}__color" width="${width}" height="${height}" src="${escapeAttr(color)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    </span>
  </span>`;
}

function buildAuthorDirectoryHeroHtml(): string {
  return `<section class="crsa-authors-hero" aria-label="Authors">
    <div class="crsa-authors-hero__inner">
      <h1 class="crsa-authors-hero__title">Our Authors</h1>
      <p class="crsa-authors-hero__subtitle">Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.</p>
    </div>
  </section>`;
}

function buildAuthorDirectoryCardHtml(entry: AuthorDirectoryEntry): string {
  const { author } = entry;
  const href = `/author/${author.slug}/`;
  const title = author.title ? `<p class="crsa-author-card__title">${escapeHtml(author.title)}</p>` : '';
  const li = linkedinHtml(author, 'crsa-author-card__linkedin', true);

  return `<article class="crsa-author-card">
    <a class="crsa-author-card__media" href="${href}">
      ${buildHoverAvatarHtml(author, 'crsa-author-card__image', 230, 316)}
    </a>
    ${li}
    <h2 class="crsa-author-card__name"><a href="${href}">${escapeHtml(author.name)}</a></h2>
    ${title}
  </article>`;
}

function buildAuthorDirectoryPostsHtml(entries: AuthorDirectoryEntry[]): string {
  return `<div class="crsa-author-directory">${entries.map((entry) => buildAuthorDirectoryCardHtml(entry)).join('\n')}</div>`;
}

function buildProfileHtml(author: Author): string {
  const title = author.title ? `<p class="crsa-author-profile__role">${escapeHtml(author.title)}</p>` : '';
  const bioText = (author.bio || '').trim();
  const bio = bioText ? `<div class="crsa-author-profile__bio"><p>${escapeHtml(bioText)}</p></div>` : '';
  const { color, gray, alt } = avatarPair(author);
  const portraitSrc = color || gray;
  const portrait = portraitSrc
    ? `<img class="crsa-author-profile__image" width="299" height="412" src="${escapeAttr(portraitSrc)}" alt="${alt}" loading="eager" decoding="async" />`
    : `<span class="crsa-author-profile__image crsa-author-profile__image--placeholder" aria-hidden="true">${escapeHtml(author.name.charAt(0))}</span>`;

  return `<section class="crsa-author-profile" aria-label="${escapeHtml(author.name)}">
    <div class="crsa-author-profile__banner">
      <div class="crsa-author-profile__inner">
        <div class="crsa-author-profile__avatar">${portrait}</div>
        <div class="crsa-author-profile__content">
          <div class="crsa-author-profile__heading">
            <h1 class="crsa-author-profile__name">${escapeHtml(author.name)}</h1>
            ${linkedinHtml(author, 'crsa-author-profile__linkedin')}
          </div>
          ${title}
          ${bio}
        </div>
      </div>
    </div>
  </section>`;
}

function buildPostsHeadingHtml(author: Author): string {
  return `<h2 class="crsa-author-articles__title">Latest Articles by ${escapeHtml(author.name)}</h2>`;
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
    items.push(`<a class="next page-numbers" href="${base}page/${currentPage + 1}/">Next</a>`);
  }

  return `<nav class="navigation pagination elementor-pagination" aria-label="Posts"><div class="nav-links">${items.join('\n')}</div></nav>`;
}

function patchHeadMeta(html: string, data: AuthorPageData): string {
  const { author, currentPage, totalPages } = data;
  const pageSuffix = currentPage > 1 ? ` - Page ${currentPage} of ${totalPages}` : '';
  const title = author.og?.title || `${author.name}, Author at Connect Resources Saudi${pageSuffix}`;
  const description = author.description || author.bio || '';
  const canonical =
    currentPage === 1 ? `${ORIGIN}/author/${author.slug}/` : `${ORIGIN}/author/${author.slug}/page/${currentPage}/`;

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
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);

  return out;
}

function patchAuthorDirectoryHeadMeta(html: string): string {
  const title = 'Authors - Connect Resources Saudi';
  const description =
    'Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.';
  const canonical = `${ORIGIN}/author/`;

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

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

  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);

  return out;
}

function authorPagesCss(): string {
  return `<style id="crsa-author-pages-css">
/* Figma Connect-Resources-Saudi · Authors 1209:2952 — white directory + mint hover */
[data-author-directory] .astro-author-profile-section,
[data-author-directory] .elementor-element-fbd336b{
  background:#fff !important;padding:0 !important;margin:0 !important;
}
[data-author-directory] .elementor-element-fbd336b > .elementor-container{
  max-width:1280px;width:100%;margin-inline:auto;padding:0 !important;box-sizing:border-box;
}
[data-author-directory] .elementor-element-fbd336b .elementor-column,
[data-author-directory] .elementor-element-fbd336b .elementor-widget-wrap,
[data-author-directory] .elementor-element-fbd336b .elementor-widget,
[data-author-directory] .elementor-element-fbd336b .elementor-widget-container,
[data-author-directory] .elementor-element-fbd336b .ecs-posts{
  width:100% !important;max-width:none !important;box-sizing:border-box;
}
[data-author-directory] .elementor-element-fbd336b .elementor-widget-wrap{
  padding:0 !important;
}
[data-author-directory] .ecs-posts.elementor-posts-container{
  display:block !important;grid-template-columns:none !important;gap:0 !important;
}

.crsa-authors-hero{
  background:#fff;box-sizing:border-box;padding:80px 0 0;
  display:flex;align-items:center;justify-content:center;text-align:center;
}
.crsa-authors-hero__inner{
  max-width:695px;width:100%;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:16px;
}
.crsa-authors-hero__title{
  margin:0 !important;font-family:"Libre Franklin",sans-serif !important;
  font-size:42px !important;font-weight:700 !important;line-height:1.2 !important;
  letter-spacing:0 !important;color:#1A1A1A !important;
}
.crsa-authors-hero__subtitle{
  margin:0 !important;max-width:695px;width:100%;text-align:center;
  font-family:"Libre Franklin",sans-serif !important;
  font-size:20px !important;font-style:normal !important;font-weight:400 !important;
  line-height:150% !important;color:#1F232B !important;
}

/* Figma: 1280px container — 4 equal columns, aspect 8/11, 40px gap under subtitle */
.crsa-author-directory{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:40px 32px;
  width:100%;max-width:1280px;margin:0 auto;padding:40px 20px 100px;box-sizing:border-box;
}
.crsa-author-card{
  width:100%;max-width:none;margin:0;text-align:left;min-width:0;
  font-family:"Libre Franklin",sans-serif;
}
.crsa-author-card__media{display:block;text-decoration:none;position:relative}
.crsa-author-card__image{position:relative;display:block;width:100%}
.crsa-author-card__image-frame{
  position:relative;display:block;width:100%;height:auto;aspect-ratio:8/11;
  border-radius:15px;overflow:hidden;background:#f0f0f0;
  box-sizing:border-box;border:10px solid transparent;
  transition:border-color .3s ease, background .3s ease;
  background-clip:padding-box;
}
.crsa-author-card__image img.crsa-author-card__image__gray,
.crsa-author-card__image img.crsa-author-card__image__color{
  position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;
  display:block;border-radius:5px;transition:opacity .35s ease;
}
.crsa-author-card__image__gray{opacity:1;z-index:1;filter:grayscale(1)}
.crsa-author-card__image__color{opacity:0;z-index:2;filter:none}

/* Hover — Figma: border 10px, radius 15px, linear-gradient(#EBFFED → Third #7FD884) */
.crsa-author-card:hover .crsa-author-card__image-frame,
.crsa-author-card__media:focus-visible .crsa-author-card__image-frame{
  border-color:transparent;
  background:
    linear-gradient(#f0f0f0,#f0f0f0) padding-box,
    linear-gradient(180deg, ${HOVER_BORDER_LIGHT} 0%, ${HOVER_BORDER_THIRD} 100%) border-box;
  box-shadow:none;
}
.crsa-author-card:hover .crsa-author-card__image__gray,
.crsa-author-card__media:focus-visible .crsa-author-card__image__gray{opacity:0}
.crsa-author-card:hover .crsa-author-card__image__color,
.crsa-author-card__media:focus-visible .crsa-author-card__image__color{opacity:1}

.crsa-author-card__linkedin{
  display:inline-flex;align-items:center;gap:6px;margin:14px 0 8px;
  text-decoration:none;color:#4A4D52 !important;font-size:14px !important;font-weight:400;line-height:1;
}
.crsa-author-card__linkedin img{width:14px;height:14px;display:block;opacity:1;filter:none}
.crsa-author-card__linkedin-label{
  font-family:"Libre Franklin",sans-serif !important;font-size:14px !important;font-weight:400;color:#4A4D52 !important;
}
.crsa-author-card__linkedin:hover{color:#1E1E1E !important}
.crsa-author-card__name{
  margin:0 !important;font-family:"Libre Franklin",sans-serif !important;
  font-size:24px !important;font-style:normal !important;font-weight:700 !important;
  line-height:140% !important;color:#1E1E1E !important;
}
.crsa-author-card__name a{color:inherit !important;text-decoration:none}
.crsa-author-card__title{
  margin:6px 0 0 !important;font-family:"Libre Franklin",sans-serif !important;
  font-size:14px !important;font-style:normal !important;font-weight:400 !important;
  line-height:150% !important;color:#4D4D4D !important;
}

/* Single author profile (kept for /author/{slug}/) */
.crsa-author-profile{padding:0;background:#fff}
.crsa-author-profile__banner{
  background:#0B3D2E url("${AUTHOR_BANNER_IMAGE}") center/cover no-repeat;
  box-sizing:border-box;padding:48px 20px;display:flex;align-items:center;
}
.crsa-author-profile__inner{
  max-width:1280px;width:100%;margin:0 auto;display:flex;gap:32px;align-items:center;
}
.crsa-author-profile__avatar{flex:0 0 220px;width:220px}
.crsa-author-profile__image{
  width:220px;height:303px;object-fit:cover;object-position:center top;display:block;
  border-radius:20px;background:rgba(255,255,255,.12);
}
.crsa-author-profile__image--placeholder{
  display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:700;color:#fff;
  background:rgba(255,255,255,.15);border-radius:20px;width:220px;height:303px;
}
.crsa-author-profile__content{flex:1;min-width:0;color:#fff;font-family:"Libre Franklin",sans-serif}
.crsa-author-profile__heading{display:flex;align-items:flex-start;gap:12px;margin:0 0 8px;flex-wrap:wrap}
.crsa-author-profile__name{margin:0;font-size:42px;font-weight:700;line-height:1.15;color:#fff}
.crsa-author-profile__linkedin{
  width:28px;height:28px;margin-top:10px;display:inline-flex;align-items:center;justify-content:center;
  background:#fff;border-radius:4px;padding:6px;box-sizing:border-box;
}
.crsa-author-profile__linkedin img{width:15px;height:15px;display:block}
.crsa-author-profile__linkedin:hover{opacity:.85}
.crsa-author-profile__role{margin:0 0 14px;font-size:18px;font-weight:500;line-height:1.4;color:#fff}
.crsa-author-profile__bio p{margin:0;font-size:16px;font-weight:400;line-height:1.6;color:rgba(255,255,255,.92);max-width:760px}
.crsa-author-articles__title{
  font-family:"Libre Franklin",sans-serif;font-size:32px;font-weight:700;line-height:1.3;
  color:#070C13;margin:0 0 28px;text-align:left;
}
[data-astro-author-page]:not([data-author-directory]) .elementor-element-fbd336b{padding:50px 20px 70px !important;background:#fff}
[data-astro-author-page]:not([data-author-directory]) .elementor-element-fbd336b > .elementor-container{max-width:1280px;margin-inline:auto}
[data-astro-author-page]:not([data-author-directory]) .ecs-posts.elementor-posts-container{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:35px;
}
@media (max-width:1100px){
  .crsa-author-directory{grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 28px}
  .crsa-authors-hero__title{font-size:40px !important}
  .crsa-author-profile__name{font-size:34px}
}
@media (max-width:767px){
  .crsa-authors-hero{padding:48px 0 0}
  .crsa-authors-hero__title{font-size:32px !important}
  .crsa-authors-hero__subtitle{font-size:18px !important}
  .crsa-author-directory{grid-template-columns:1fr;justify-items:stretch;padding:40px 20px 60px;gap:36px}
  .crsa-author-card{max-width:none}
  .crsa-author-card__image-frame{height:auto;min-height:0}
  .crsa-author-card__name{font-size:20px !important}
  .crsa-author-profile__inner{flex-direction:column;text-align:center;gap:20px}
  .crsa-author-profile__heading{justify-content:center}
  .crsa-author-profile__name{font-size:30px}
  .crsa-author-profile__bio p{margin-inline:auto}
  .crsa-author-articles__title{font-size:24px;text-align:center}
  [data-astro-author-page]:not([data-author-directory]) .ecs-posts.elementor-posts-container{grid-template-columns:1fr}
}
</style>`;
}

function stripAuthorPageCta(html: string): string {
  // Hide leftover blog "Reach out" CTA if present in chrome/footer
  if (!/Reach out with any/i.test(html)) return html;
  return html.replace(
    /<section\b[^>]*>[\s\S]*?Reach out with any[\s\S]*?<\/section>/i,
    '<!-- author-page: CTA removed -->',
  );
}

function finalizeHtml(html: string, slug: string): string {
  let out = applySharedChrome(html, slug);
  out = stripAuthorPageCta(out);
  if (!out.includes('crsa-author-pages-css')) {
    out = out.replace('</head>', `${authorPagesCss()}\n</head>`);
  }
  if (!out.includes('astro-mirror-fixes.js')) {
    out = out.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }
  return injectRuntimeGtmLoader(out);
}

export function assembleAuthorArchiveHtml(data: AuthorPageData): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Author shell missing. Run: node scripts/prepare-author-shell.mjs');
  }

  let html = readFileSync(SHELL_PATH, 'utf8');
  const { author, posts, currentPage, totalPages } = data;
  const postsHtml = posts.map((p) => buildPostCardHtml(p)).join('\n');

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildProfileHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', buildPostsHeadingHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml || '<p class="crsa-author-empty">No articles yet.</p>')
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', buildPaginationHtml(author, currentPage, totalPages));

  html = patchHeadMeta(html, data);
  return finalizeHtml(html, `author/${author.slug}`);
}

export function serveAuthorArchive(data: AuthorPageData): Response {
  return new Response(assembleAuthorArchiveHtml(data), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}

export function assembleAuthorDirectoryHtml(): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Author shell missing. Run: node scripts/prepare-author-shell.mjs');
  }

  const entries = getAuthorDirectoryEntries();
  let html = readFileSync(SHELL_PATH, 'utf8');

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildAuthorDirectoryHeroHtml())
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', '')
    .replace('<!--ASTRO_AUTHOR:POSTS-->', buildAuthorDirectoryPostsHtml(entries))
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', '');

  html = html.replace('data-astro-author-page', 'data-astro-author-page data-author-directory');
  html = patchAuthorDirectoryHeadMeta(html);
  return finalizeHtml(html, 'author');
}

export function serveAuthorDirectory(): Response {
  return new Response(assembleAuthorDirectoryHtml(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
