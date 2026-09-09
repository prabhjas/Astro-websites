/**
 * KinzaHR author directory + author archive (Figma Author-Pages).
 * Body only — header/footer come from the homepage chrome shell.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import { applySharedChrome } from './shared-chrome.js';
import {
  getPostExcerpt,
  getPostsByAuthorSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const ORIGIN = 'https://kinzahr.com';

/** Initial batch on author single; further posts via Load More. */
export const AUTHOR_POSTS_PER_PAGE = 6;

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

export interface AuthorSocial {
  type: string;
  url: string;
}

export interface Author {
  slug: string;
  name: string;
  title?: string;
  bio?: string;
  avatar?: { src: string; alt?: string } | null;
  social?: AuthorSocial[];
  canonical?: string;
  description?: string;
  og?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  sourceUrl?: string;
  migratedAt?: string;
  notes?: string[];
  url?: string;
}

export interface AuthorPageData {
  author: Author;
  posts: BlogPost[];
  currentPage: number;
  totalPages: number;
  totalPosts: number;
}

/** Authors that have published posts — display order for /author/. */
const LIVE_AUTHOR_ORDER = [
  'nakul-sachdeva',
  'dylan-wesley',
  'tanzyn-giovanna-amisha-stanley',
  'binju-t-robert',
  'siva-rama-krishnan',
];

const LIVE_AUTHOR_OVERRIDES: Record<
  string,
  { name?: string; title?: string; bio?: string; avatar?: string; linkedin?: string }
> = {
  'nakul-sachdeva': {
    name: 'Nakul Sachdeva',
    title: 'Head of Recruitment & Business Development',
    avatar: '/wp-content/uploads/2024/05/Nakul-Sachdeva-2.png',
    linkedin: 'https://www.linkedin.com/in/nakul-sachdeva-717590118/',
  },
  'dylan-wesley': {
    name: 'Dylan Wesley',
    title: 'Business Development Manager',
    avatar: '/wp-content/uploads/2024/05/dylan-wesley-portrait.png',
    linkedin: 'https://www.linkedin.com/in/dylan-wright-405298254/',
  },
  'tanzyn-giovanna-amisha-stanley': {
    name: 'Tanzyn Giovanna',
    title: 'Recruitment & Sales',
    avatar: '/wp-content/uploads/2024/05/tanzyn-giovanna-portrait.png',
    linkedin: 'https://www.linkedin.com/in/tanzyn-stanley/',
  },
  'binju-t-robert': {
    name: 'Binju T. Robert',
    title: 'HR & Marketing Specialist',
    avatar: '/wp-content/uploads/2024/05/binju-t-robert-portrait.png',
    linkedin: 'https://www.linkedin.com/in/binju-tr/',
  },
  'siva-rama-krishnan': {
    name: 'Siva Rama Krishnan',
    title: 'Global Talent Consultant',
    avatar: '/wp-content/uploads/2024/05/siva-rama-krishnan-lg.jpg',
    linkedin: 'https://www.linkedin.com/in/siva-rama-krishna-kv-690620119/',
  },
};

const DEFAULT_LINKEDIN = 'https://www.linkedin.com/company/kinzahr/';
const AUTHOR_BANNER_BG = '#0F202B';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanName(name: string): string {
  return String(name || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function initials(name: string): string {
  const parts = cleanName(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] || ''}${parts[parts.length - 1]![0] || ''}`.toUpperCase();
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
  let raw: Author;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as Author;
  } catch {
    return null;
  }
  const override = LIVE_AUTHOR_OVERRIDES[slug] || {};
  let name = cleanName(override.name || raw.name || slug);
  // Guard against polluted migrations that appended bio into the name field.
  if (!override.name && name.length > 80) {
    name = name.split(/\s{2,}|\./)[0]!.trim() || slug;
  }
  const avatarSrc = override.avatar || raw.avatar?.src || '';
  const linkedin =
    override.linkedin ||
    raw.social?.find((s) => /linkedin/i.test(s.type) || /linkedin\.com/i.test(s.url))?.url ||
    DEFAULT_LINKEDIN;
  const social: AuthorSocial[] = [{ type: 'linkedin', url: linkedin }];
  return {
    ...raw,
    slug,
    name,
    title: override.title || raw.title || '',
    bio: (override.bio || raw.bio || '').trim(),
    avatar: avatarSrc
      ? { src: avatarSrc, alt: name }
      : raw.avatar?.src
        ? { ...raw.avatar, alt: name }
        : null,
    social,
    canonical: raw.canonical || `/author/${slug}/`,
    description: raw.description || (override.bio || raw.bio || '').trim(),
  };
}

export function getAllAuthors(): Author[] {
  return getAllAuthorSlugs()
    .map((slug) => getAuthor(slug))
    .filter((author): author is Author => author !== null);
}

export function getAuthorPageData(slug: string, page = 1): AuthorPageData | null {
  const author = getAuthor(slug);
  if (!author) return null;

  const allPosts = getPostsByAuthorSlug(slug);
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
  const preferredSlugs = new Set(preferred.map((e) => e.author.slug));
  const rest = entries
    .filter((e) => !preferredSlugs.has(e.author.slug))
    .sort((a, b) => a.author.name.localeCompare(b.author.name));
  return [...preferred, ...rest];
}

function avatarHtml(author: Author, className: string, width: number, height: number): string {
  const name = escapeHtml(author.name);
  const src = author.avatar?.src;
  if (src) {
    return `<img class="${className}" width="${width}" height="${height}" src="${escapeAttr(src)}" alt="${name}" loading="lazy" decoding="async" />`;
  }
  return `<span class="${className} ${className}--placeholder" aria-hidden="true">${escapeHtml(initials(author.name))}</span>`;
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function linkedinHtml(author: Author, className = 'kinza-author-linkedin'): string {
  const linkedin =
    author.social?.find((s) => /linkedin/i.test(s.type) || /linkedin\.com/i.test(s.url))?.url ||
    DEFAULT_LINKEDIN;
  return `<a class="${className}" href="${escapeAttr(linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(author.name)} on LinkedIn">
    <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"/></svg>
  </a>`;
}

function buildAuthorDirectoryHeroHtml(): string {
  return `<section class="kinza-authors-hero" aria-label="Authors">
    <div class="kinza-authors-hero__inner">
      <h1 class="kinza-authors-hero__title">Our Authors</h1>
      <p class="kinza-authors-hero__subtitle">Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.</p>
    </div>
  </section>`;
}

function buildAuthorDirectoryCardHtml(entry: AuthorDirectoryEntry): string {
  const { author } = entry;
  const href = `/author/${author.slug}/`;
  const title = author.title ? `<p class="kinza-author-card__title">${escapeHtml(author.title)}</p>` : '';

  return `<article class="kinza-author-card">
    <a class="kinza-author-card__media" href="${href}">
      ${avatarHtml(author, 'kinza-author-card__image', 282, 269)}
    </a>
    <div class="kinza-author-card__meta">
      <div class="kinza-author-card__text">
        <h2 class="kinza-author-card__name"><a href="${href}">${escapeHtml(author.name)}</a></h2>
        ${title}
      </div>
      ${linkedinHtml(author, 'kinza-author-card__linkedin')}
    </div>
  </article>`;
}

function buildAuthorDirectoryPostsHtml(entries: AuthorDirectoryEntry[]): string {
  return `<div class="kinza-author-directory">${entries.map((entry) => buildAuthorDirectoryCardHtml(entry)).join('\n')}</div>`;
}

function buildProfileHtml(author: Author): string {
  const title = author.title ? `<p class="kinza-author-profile__role">${escapeHtml(author.title)}</p>` : '';
  const bioText = (author.bio || '').trim();
  const bio = bioText
    ? `<div class="kinza-author-profile__bio"><p>${escapeHtml(bioText)}</p></div>`
    : '';

  return `<section class="kinza-author-profile" aria-label="${escapeHtml(author.name)}">
    <div class="kinza-author-profile__banner">
      <div class="kinza-author-profile__inner">
        <div class="kinza-author-profile__avatar">
          ${avatarHtml(author, 'kinza-author-profile__image', 262, 250)}
        </div>
        <div class="kinza-author-profile__content">
          <div class="kinza-author-profile__heading">
            <h1 class="kinza-author-profile__name">${escapeHtml(author.name)}</h1>
            ${linkedinHtml(author, 'kinza-author-profile__linkedin')}
          </div>
          ${title}
          ${bio}
        </div>
      </div>
    </div>
  </section>`;
}

function buildPostsHeadingHtml(author: Author): string {
  return `<h2 class="kinza-author-articles__title">Articles by ${escapeHtml(author.name)}</h2>`;
}

/** Figma 1:2155 “ithem service” / Frame 22 article card. */
export function buildAuthorArticleCardHtml(post: BlogPost): string {
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const excerpt = escapeHtml(getPostExcerpt(post, 140));
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const imgTag = imgSrc
    ? `<img src="${escapeAttr(imgSrc)}" alt="${imgAlt}" width="392" height="230" loading="lazy" decoding="async" />`
    : `<span class="kinza-article-card__image-fallback" aria-hidden="true"></span>`;

  return `<article class="kinza-article-card">
    <a class="kinza-article-card__media" href="${postUrl}">${imgTag}</a>
    <div class="kinza-article-card__body">
      <h3 class="kinza-article-card__title"><a href="${postUrl}">${title}</a></h3>
      <p class="kinza-article-card__excerpt">${excerpt}</p>
      <a class="kinza-article-card__more" href="${postUrl}">
        <span>Read More</span>
        <svg class="kinza-article-card__more-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M5 12h12.17l-4.58-4.59L14 6l7 7-7 7-1.41-1.41L17.17 13H5z"/></svg>
      </a>
    </div>
  </article>`;
}

function buildLoadMoreHtml(author: Author, totalPosts: number, shown: number): string {
  if (shown >= totalPosts) return '';
  return `<button type="button" class="kinza-author-loadmore" data-kinza-author-load-more data-author-slug="${escapeAttr(author.slug)}" data-offset="${shown}" data-total="${totalPosts}">
    Load More
  </button>`;
}

function authorPagesCss(): string {
  return `<style id="kinza-author-pages-css">
/* Figma Author-Pages · archive 11:1394 · single 1:2155 */
.kinza-author-page{font-family:"SF Pro Display","SF PRO DISPLAY",sans-serif;color:#070C13;background:#fff}
.kinza-authors-hero{
  background:${AUTHOR_BANNER_BG};box-sizing:border-box;height:326px;min-height:326px;
  display:flex;align-items:center;justify-content:center;
  text-align:center;color:#fff;padding:40px 20px
}
.kinza-authors-hero__inner{
  max-width:555px;width:100%;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:8px
}
.kinza-authors-hero__title{margin:0;font-size:56px;font-weight:700;line-height:1.2;color:#fff}
.kinza-authors-hero__subtitle{margin:0;max-width:555px;font-size:18px;font-weight:500;line-height:1.3;color:#fff}
/* Figma grid: x=117 w=1278, cards 282, gap 50 */
.kinza-author-directory{
  display:grid;grid-template-columns:repeat(4,minmax(0,282px));gap:50px;
  justify-content:center;max-width:1278px;margin:0 auto;padding:70px 20px 80px
}
.kinza-author-card{width:100%;max-width:282px;margin:0;position:relative}
.kinza-author-card__media{display:block;line-height:0;text-decoration:none}
.kinza-author-card__image{
  width:282px;max-width:100%;height:269px;object-fit:cover;object-position:center top;
  display:block;border-radius:0;background:#e8e8ef
}
.kinza-author-card__image--placeholder{
  display:flex;align-items:center;justify-content:center;
  font-size:42px;font-weight:700;color:#24495F;background:#e8e8ef
}
.kinza-author-card__meta{
  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:12px;min-height:58px
}
.kinza-author-card__text{min-width:0;flex:1}
.kinza-author-card__name{margin:0 0 0;font-size:24px;font-weight:700;line-height:1.4}
.kinza-author-card__name a{color:#070C13;text-decoration:none}
.kinza-author-card__title{margin:0;font-size:16px;font-weight:400;line-height:1.5;color:#666}
.kinza-author-card__linkedin{
  color:#0a66c2;display:inline-flex;flex-shrink:0;width:24px;height:24px;margin-top:6px
}
.kinza-author-card__linkedin:hover{opacity:.85}
.kinza-author-card__linkedin svg,.kinza-author-profile__linkedin svg{width:24px;height:24px;display:block}

/* Single author — Figma AUTHOR PAGE Desktop 1:2155 · Frame 465 (400) */
.kinza-author-profile{padding:0;background:#fff}
.kinza-author-profile__banner{
  background:${AUTHOR_BANNER_BG};box-sizing:border-box;min-height:0;height:auto;
  padding:40px 20px;display:flex;align-items:flex-start
}
.kinza-author-profile__media,.kinza-author-profile__bg{display:none!important}
.kinza-author-profile__inner{
  max-width:1280px;width:100%;margin:0 auto;display:flex;gap:25px;align-items:flex-start
}
.kinza-author-profile__avatar{flex:0 0 262px;width:262px}
.kinza-author-profile__image{
  width:262px;height:250px;object-fit:cover;object-position:center top;display:block;
  border-radius:0;background:rgba(255,255,255,.12)
}
.kinza-author-profile__image--placeholder{
  display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:700;color:#fff;background:rgba(255,255,255,.15)
}
.kinza-author-profile__content{
  flex:1;min-width:0;max-width:993px;padding-top:0;color:#fff;
  font-family:"SF Pro Display","SF PRO DISPLAY",sans-serif
}
.kinza-author-profile__heading{
  display:flex;align-items:flex-start;gap:12px;margin:0 0 5px;flex-wrap:wrap;position:relative
}
.kinza-author-profile__name{
  margin:0;font-size:42px;font-weight:700;line-height:42px;letter-spacing:0;color:#fff
}
.kinza-author-profile__linkedin{
  color:#fff;width:29px;height:28px;margin-top:8px;display:inline-flex;flex-shrink:0
}
.kinza-author-profile__linkedin:hover{opacity:.85}
.kinza-author-profile__linkedin svg{width:29px;height:28px}
.kinza-author-profile__role{
  margin:0 0 16px;font-size:18px;font-weight:500;line-height:24px;color:#fff
}
.kinza-author-profile__bio p{
  margin:0;font-size:16px;line-height:1.45;color:#fff;font-weight:400;max-width:993px
}

/* POPULAR ARTICLES — Figma 1:2168 */
.kinza-author-articles{padding:50px 20px 94px;background:#fff}
.kinza-author-articles__inner{max-width:1280px;margin:0 auto}
.kinza-author-articles__title{
  margin:0 0 30px;font-size:40px;font-weight:700;line-height:48px;color:#070C13;
  font-family:"SF Pro Display","SF PRO DISPLAY",sans-serif
}
.kinza-author-page[data-author-directory] .kinza-author-articles{padding:0}
.kinza-author-page[data-author-directory] .kinza-author-posts{display:block!important}
.kinza-author-posts{
  display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px 50px;margin:0
}
/* Figma ithem service ~391×538 — Kinza card shadow matches blog cards */
.kinza-article-card{
  background:#fff;border:0;border-radius:0;overflow:hidden;
  display:flex;flex-direction:column;min-height:100%;
  box-shadow:0 0 10px 0 rgba(0,0,0,.15)
}
.kinza-article-card__media{display:block;line-height:0}
.kinza-article-card__media img,.kinza-article-card__image-fallback{
  width:100%;height:230px;object-fit:cover;display:block;background:#e8e8ef;border-radius:0
}
.kinza-article-card__body{
  padding:30px;display:flex;flex-direction:column;flex:1;background:#fff
}
.kinza-article-card__title{
  margin:0 0 12px;font-size:20px;font-weight:600;line-height:1.5;min-height:0;
  font-family:"SF Pro Display","SF PRO DISPLAY",sans-serif
}
.kinza-article-card__title a{color:#070C13;text-decoration:none}
.kinza-article-card__title a:hover{color:#24495F}
.kinza-article-card__excerpt{
  margin:0 0 15px;font-size:16px;line-height:1.5;color:#555;font-weight:400;flex:1;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden
}
.kinza-article-card__more{
  display:inline-flex;align-items:center;gap:10px;margin-top:auto;padding-top:15px;
  font-size:14px;font-weight:600;line-height:21px;color:#24495F;text-decoration:none;
  font-family:"SF Pro Display","SF PRO DISPLAY",sans-serif
}
.kinza-article-card__more:hover{opacity:.85}
.kinza-article-card__more-icon{transform:rotate(-45deg);flex-shrink:0}
.kinza-author-loadmore-wrap{display:flex;justify-content:center;margin-top:50px}
.kinza-author-loadmore{
  appearance:none;border:1px solid #24495F;background:#24495F;color:#fff;
  border-radius:4px;padding:14px 36px;font:600 16px/1.2 "SF Pro Display",sans-serif;
  cursor:pointer;min-width:160px;box-shadow:0 0 10px 0 rgba(36,73,95,.2)
}
.kinza-author-loadmore:hover{background:#1a3545;border-color:#1a3545}
.kinza-author-loadmore[disabled]{opacity:.6;cursor:default}
.kinza-author-loadmore.is-hidden{display:none!important}

@media (max-width:1100px){
  .kinza-author-directory{grid-template-columns:repeat(3,minmax(0,282px));gap:40px 30px}
  .kinza-author-posts{grid-template-columns:repeat(2,minmax(0,1fr));gap:30px}
  .kinza-author-profile__name{font-size:34px;line-height:1.15}
  .kinza-author-articles__title{font-size:34px;line-height:1.2}
}
@media (max-width:900px){
  .kinza-author-profile__banner{height:auto;min-height:0;padding:48px 20px}
  .kinza-author-profile__inner{flex-direction:column;align-items:center;text-align:center}
  .kinza-author-profile__heading{justify-content:center}
  .kinza-author-profile__linkedin{margin-top:6px}
  .kinza-author-profile__bio p{margin-inline:auto}
  .kinza-authors-hero__title{font-size:40px}
}
@media (max-width:767px){
  .kinza-author-directory{grid-template-columns:1fr;justify-items:center;gap:40px;padding:40px 16px 60px}
  .kinza-author-posts{grid-template-columns:1fr;gap:30px}
  .kinza-authors-hero{height:auto;min-height:220px;padding:40px 16px}
  .kinza-authors-hero__title{font-size:40px}
  .kinza-author-profile__banner{height:auto;min-height:0;padding:40px 16px}
  .kinza-author-profile__avatar{flex:none;width:100%;max-width:262px}
  .kinza-author-profile__image{width:100%;max-width:262px;height:auto;aspect-ratio:262/250}
  .kinza-author-profile__name{font-size:28px;line-height:1.2}
  .kinza-author-profile__role{font-size:16px}
  .kinza-author-articles{padding:40px 16px 60px}
  .kinza-author-articles__title{font-size:26px;line-height:1.25;margin-bottom:24px}
  .kinza-author-card__name{font-size:22px}
  .kinza-author-card__image{width:100%;height:auto;aspect-ratio:282/269}
  .kinza-article-card__title{font-size:18px}
  .kinza-article-card__body{padding:24px}
}
</style>`;
}

function patchHeadMeta(html: string, data: AuthorPageData): string {
  const { author } = data;
  const title = author.og?.title || `${author.name}, Author at KinzaHR`;
  const description = author.description || author.bio || `Articles by ${author.name} on KinzaHR.`;
  const canonical = absoluteSeoUrl(author.canonical || `/author/${author.slug}/`, `/author/${author.slug}/`);

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
  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);
  return out;
}

function patchAuthorDirectoryHeadMeta(html: string): string {
  const title = 'Authors - KinzaHR';
  const description =
    'Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.';
  const canonical = absoluteSeoUrl('/author/', '/author/');
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
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);
  return out;
}

function finalizeHtml(html: string, slug: string): string {
  let out = applySharedChrome(html, slug);
  if (!out.includes('kinza-author-pages-css')) {
    out = out.replace('</head>', `${authorPagesCss()}\n</head>`);
  }
  if (!out.includes('astro-mirror-fixes.js')) {
    out = out.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }
  if (!out.includes('author-load-more.js')) {
    out = out.replace('</body>', '<script src="/js/author-load-more.js" defer></script>\n</body>');
  }
  return injectRuntimeGtmLoader(out);
}

export function assembleAuthorArchiveHtml(data: AuthorPageData): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Author shell missing. Run: node scripts/prepare-author-shell.mjs');
  }

  let html = readFileSync(SHELL_PATH, 'utf8');
  const { author, posts, totalPosts } = data;
  const postsHtml = posts.map((p) => buildAuthorArticleCardHtml(p)).join('\n');

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildProfileHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', buildPostsHeadingHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml)
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', buildLoadMoreHtml(author, totalPosts, posts.length));

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

  // Directory uses hero + cards; hide the articles chrome wrapper extras via CSS class.
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
