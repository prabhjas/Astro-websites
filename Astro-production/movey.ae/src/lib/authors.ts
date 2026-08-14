/**
 * Author archive types, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { injectRuntimeGtmLoader } from './gtm/inject';
import { applySharedChrome } from './shared-chrome.js';
import {
  LIVE_AUTHOR_ORDER,
  LIVE_AUTHOR_OVERRIDES,
  authorCanonical,
  authorProfilePath,
} from './author-display.ts';
import { buildAuthorBlogCardHtml } from './author-blog-card.ts';
import {
  AUTHOR_POSTS_PER_PAGE,
  getPostsByAuthorSlug,
  type BlogPost,
} from './blog.ts';

export { getPostsByAuthorSlug };

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const ORIGIN = 'https://movey.ae';

export { LIVE_AUTHOR_ORDER, LIVE_AUTHOR_OVERRIDES } from './author-display.ts';

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
  const author = JSON.parse(readFileSync(path, 'utf8')) as Author;
  const override = LIVE_AUTHOR_OVERRIDES[slug];
  if (!override) return withAuthorUrls(author);

  return withAuthorUrls({
    ...author,
    name: override.name || author.name,
    title: override.title || author.title,
    bio: override.bio || author.bio,
    avatar: override.avatar
      ? { src: override.avatar, alt: override.name || author.name }
      : author.avatar,
    canonical: authorCanonical(slug),
    sourceUrl: authorCanonical(slug),
  });
}

function withAuthorUrls(author: Author): Author {
  const normalized = normalizeAuthor(author);
  return {
    ...normalized,
    canonical: authorCanonical(normalized.slug),
    sourceUrl: authorCanonical(normalized.slug),
  };
}

function normalizeAuthor(author: Author): Author {
  let name = author.name || '';
  const imgMatch = name.match(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i);
  if (imgMatch) {
    const alt = imgMatch[2].replace(/^Picture of\s+/i, '').trim();
    return {
      ...author,
      name: alt || author.slug,
      avatar: author.avatar || { src: imgMatch[1], alt: alt || author.slug },
    };
  }
  if (name.includes('<')) {
    return { ...author, name: author.slug };
  }
  return author;
}

export function getAllAuthors(): Author[] {
  return getAllAuthorSlugs()
    .map((slug) => getAuthor(slug))
    .filter((author): author is Author => author !== null);
}

/** First batch on author profile; additional posts via load-more API */
export const AUTHOR_INITIAL_POSTS = 12;
export const AUTHOR_LOAD_MORE_PAGE = 12;

export function getAuthorProfileData(slug: string): {
  author: Author;
  posts: BlogPost[];
  totalPosts: number;
} | null {
  const author = getAuthor(slug);
  if (!author) return null;
  const allPosts = getPostsByAuthorSlug(slug);
  return {
    author,
    posts: allPosts.slice(0, AUTHOR_INITIAL_POSTS),
    totalPosts: allPosts.length,
  };
}

/** @deprecated Use getAuthorProfileData; kept for paginated route redirect */
export function getAuthorPageData(slug: string, page = 1): AuthorPageData | null {
  const profile = getAuthorProfileData(slug);
  if (!profile) return null;
  const totalPages = Math.max(1, Math.ceil(profile.totalPosts / AUTHOR_POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * AUTHOR_POSTS_PER_PAGE;
  const posts = getPostsByAuthorSlug(slug).slice(start, start + AUTHOR_POSTS_PER_PAGE);
  return {
    author: profile.author,
    posts,
    currentPage,
    totalPages,
    totalPosts: profile.totalPosts,
  };
}

export interface AuthorDirectoryEntry {
  author: Author;
  postCount: number;
}

export function getAuthorDirectoryEntries(): AuthorDirectoryEntry[] {
  // Directory shows only the six featured authors (live site parity).
  return LIVE_AUTHOR_ORDER.map((slug) => {
    const author = getAuthor(slug);
    if (!author) return null;
    return { author, postCount: getPostsByAuthorSlug(slug).length };
  }).filter((entry): entry is AuthorDirectoryEntry => Boolean(entry));
}

function socialIconClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'linkedin') return 'fab fa-linkedin';
  if (t === 'twitter' || t === 'x') return 'fab fa-twitter';
  if (t === 'facebook') return 'fab fa-facebook';
  if (t === 'instagram') return 'fab fa-instagram';
  return 'fas fa-link';
}

function socialLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === 'linkedin') return 'LinkedIn';
  if (t === 'twitter' || t === 'x') return 'Twitter';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function buildAuthorSocialHtml(author: Author): string {
  const links: { url: string; type: string }[] = [];
  for (const s of author.social || []) {
    if (s.url) links.push(s);
  }
  if (!links.length && author.slug === 'kate-c') {
    links.push({ type: 'linkedin', url: 'https://www.linkedin.com/in/kate-williams-59a784145/' });
  }
  if (!links.length) return '';
  return links
    .map(
      (s) =>
        `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer"><i class="${socialIconClass(s.type)}" aria-hidden="true"></i><span>${escapeHtml(socialLabel(s.type))}</span></a>`,
    )
    .join('\n');
}

function buildAuthorProfileSection(author: Author): string {
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = escapeHtml(override.name || author.name);
  const title = escapeHtml((override.title || author.title || '').trim());
  const bio = escapeHtml(override.bio || author.bio || '');
  const avatarSrc = escapeHtml(override.avatar || author.avatar?.src || '');
  const social = buildAuthorSocialHtml(author);

  const avatar = avatarSrc
    ? `<div class="kpmpro-author-profile__avatar"><img src="${avatarSrc}" alt="${name}" width="260" height="260" loading="eager" decoding="async" /></div>`
    : '';

  return `<header class="kpmpro-author-profile">
    ${avatar}
    <div class="kpmpro-author-profile__content">
      <h1 class="kpmpro-author-profile__name">${name}</h1>
      ${title ? `<p class="kpmpro-author-profile__role">${title}</p>` : ''}
      ${bio ? `<p class="kpmpro-author-profile__bio">${bio}</p>` : ''}
      ${social ? `<div class="kpmpro-author-profile__social">${social}</div>` : ''}
    </div>
  </header>`;
}

function buildAuthorDirectoryCard(entry: AuthorDirectoryEntry): string {
  const { author } = entry;
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const name = escapeHtml(override.name || author.name);
  const title = escapeHtml(override.title || author.title || '');
  const avatarSrc = escapeHtml(override.avatar || author.avatar?.src || '');
  const href = authorProfilePath(author.slug);

  return `<a class="kpmpro-author-directory-card" href="${href}">
    <div class="kpmpro-author-directory-card__image-wrap">
      ${avatarSrc ? `<img src="${avatarSrc}" alt="${name}" width="220" height="220" loading="lazy" decoding="async" />` : ''}
    </div>
    <h2 class="kpmpro-author-directory-card__name">${name}</h2>
    ${title ? `<p class="kpmpro-author-directory-card__title">${title}</p>` : ''}
  </a>`;
}

export function buildAuthorPostCardHtml(post: BlogPost): string {
  return buildAuthorBlogCardHtml(post);
}

const AUTHOR_HEAD_ASSETS = `<link rel="stylesheet" href="/css/kpmpro-authors.css" id="kpmpro-authors-css" />
<link rel="stylesheet" href="/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css" media="all" />
<link rel="stylesheet" href="/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css" media="all" />`;

function wrapInAuthorShell(
  mainInner: string,
  meta: { title: string; description: string; canonical: string },
  options: { loadMoreScript?: boolean } = {},
): string {
  if (!existsSync(SHELL_PATH)) {
    throw new Error('Author shell missing. Run: npm run prepare:author-shell');
  }

  let html = readFileSync(SHELL_PATH, 'utf8');
  const $ = cheerio.load(html, { xml: { decodeEntities: false } } as any);
  $('.elementor-location-archive').html(`<div class="kpmpro-author-page">${mainInner}</div>`);
  html = $.html();

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  if (html.includes('name="description"')) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    );
  } else {
    html = html.replace('</head>', `<meta name="description" content="${escapeHtml(meta.description)}" />\n</head>`);
  }

  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${meta.canonical}" />`);
  } else {
    html = html.replace('</head>', `<link rel="canonical" href="${meta.canonical}" />\n</head>`);
  }

  if (!html.includes('kpmpro-authors.css')) {
    html = html.replace('</head>', `${AUTHOR_HEAD_ASSETS}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>');
  }

  if (options.loadMoreScript && !html.includes('author-load-more.js')) {
    html = html.replace('</body>', '<script src="/js/author-load-more.js" defer></script>\n</body>');
  }

  return injectRuntimeGtmLoader(applySharedChrome(html, 'author'));
}

function buildAuthorDirectoryMain(entries: AuthorDirectoryEntry[]): string {
  const cards = entries.map((e) => buildAuthorDirectoryCard(e)).join('\n');
  return `<div class="kpmpro-author-hero">
    <h1>Authors</h1>
    <p>Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.</p>
  </div>
  <div class="kpmpro-author-directory-grid">${cards}</div>`;
}

function buildAuthorProfileMain(author: Author, posts: BlogPost[], totalPosts: number): string {
  const override = LIVE_AUTHOR_OVERRIDES[author.slug] || {};
  const displayName = escapeHtml(override.name || author.name);
  const postsHtml = posts.map((p) => buildAuthorPostCardHtml(p)).join('\n');
  const hasMore = totalPosts > posts.length;
  const loadMoreClass = hasMore ? '' : ' is-hidden';

  return `${buildAuthorProfileSection(author)}
  <h2 class="kpmpro-author-posts-heading">Articles by ${displayName}</h2>
  <div class="kpmpro-author-posts-grid"
    data-kpmpro-author-posts
    data-author-slug="${escapeHtml(author.slug)}"
    data-offset="${posts.length}"
    data-per-page="${AUTHOR_LOAD_MORE_PAGE}"
    data-total="${totalPosts}">
    ${postsHtml}
  </div>
  <div class="kpmpro-author-load-more-wrap">
    <button type="button" class="kpmpro-author-load-more${loadMoreClass}" data-kpmpro-author-load-more>Load more</button>
  </div>`;
}

export function assembleAuthorProfileHtml(data: {
  author: Author;
  posts: BlogPost[];
  totalPosts: number;
}): string {
  const { author, posts, totalPosts } = data;
  const title = author.og?.title || `${author.name}, Author at KPMPRO`;
  const description = author.description || author.bio || '';
  const main = buildAuthorProfileMain(author, posts, totalPosts);
  return wrapInAuthorShell(
    main,
    { title, description, canonical: author.canonical },
    { loadMoreScript: totalPosts > posts.length },
  );
}

export function serveAuthorProfile(data: {
  author: Author;
  posts: BlogPost[];
  totalPosts: number;
}): Response {
  const html = assembleAuthorProfileHtml(data);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}

export function assembleAuthorArchiveHtml(data: AuthorPageData): string {
  return assembleAuthorProfileHtml({
    author: data.author,
    posts: data.posts,
    totalPosts: data.totalPosts,
  });
}

export function serveAuthorArchive(data: AuthorPageData): Response {
  return serveAuthorProfile({
    author: data.author,
    posts: data.posts,
    totalPosts: data.totalPosts,
  });
}

export function assembleAuthorDirectoryHtml(): string {
  const entries = getAuthorDirectoryEntries();
  const title = 'Authors | KPMPRO';
  const description =
    'Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.';
  const main = buildAuthorDirectoryMain(entries);
  return wrapInAuthorShell(main, {
    title,
    description,
    canonical: `${ORIGIN}/author/`,
  });
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
