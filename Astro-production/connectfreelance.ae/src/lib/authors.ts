/**
 * Author archive types, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import {
  AUTHOR_POSTS_PER_PAGE,
  excerptFromContent,
  getPostsByAuthorSlug as getPostsByAuthorSlugRaw,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const ARCHIVE_SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const DIRECTORY_SHELL_PATH = join(ROOT, 'src/legacy/author.cleaned.html');
const ORIGIN = 'https://connectfreelance.ae';

const LINKEDIN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><g id="atoms/icons/black/rounded/linkedin"><path id="linkedin" fill-rule="evenodd" clip-rule="evenodd" d="M0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16C32 24.8366 24.8366 32 16 32C7.16344 32 0 24.8366 0 16ZM8.2 13.3V24H11.6V13.3H8.2ZM8 9.9C8 11 8.8 11.8 9.9 11.8C11 11.8 11.8 11 11.8 9.9C11.8 8.8 11 8 9.9 8C8.9 8 8 8.8 8 9.9ZM20.6 24H23.8V17.4C23.8 14.1 21.8 13 19.9 13C18.2 13 17 14.1 16.7 14.8V13.3H13.5V24H16.9V18.3C16.9 16.8 17.9 16 18.9 16C19.9 16 20.6 16.5 20.6 18.2V24Z" fill="#0762C8"></path></g></svg>`;

/** Strip accidental HTML from migrated author display names (e.g. avatar <img> dumped into name). */
function cleanAuthorName(raw: string, fallback = 'Author'): string {
  const text = String(raw || '')
    .replace(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/Picture of\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
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

const AUTHOR_SLUG_ALIASES: Record<string, string> = {
  'jerryl-lance-alva': 'jerryl-lance',
  'desery-dandan': 'desery',
  jerryl: 'jerryl-lance',
};

const LIVE_AUTHOR_ORDER = [
  'jerryl-lance',
  'sreya-sarkar',
  'timothy-duncan',
  'romee-giri',
  'desery',
  'mehvish-beg',
  'michelle-solon',
  'gian-orillo',
];

const LIVE_AUTHOR_OVERRIDES: Record<
  string,
  { name?: string; title?: string; bio?: string; avatar?: string; linkedin?: string }
> = {
  'jerryl-lance': {
    name: 'Jerryl Lance',
    title: 'Accountant',
    avatar: '/wp-content/uploads/2024/07/jerryl-lance-alva.png',
    linkedin: 'https://www.linkedin.com/in/jerryl-lance-alva-0b9507254/',
    bio: "I'm Lance Alva, a meticulous and detail-oriented accountant with a passion for numbers and financial analysis. With over a decade of experience in the field, I've honed my skills in financial management, auditing, and taxation. I thrive in environments that require analytical thinking and problem-solving, and I'm always eager to dive into complex financial data to uncover insights that drive business decisions.Strong administrative professional with a Bachelor's Degree focused in Business computing from Limerick Institute of Technology.",
  },
  'sreya-sarkar': {
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/07/Sreya-Sarkar.png',
    linkedin: 'https://www.linkedin.com/in/sreya-sarkar-040b7181/',
    bio: "I'm Sreya Sarkar, a dynamic professional with a passion for driving business growth and fostering strategic partnerships. With a background in business development and a keen understanding of market dynamics, I thrive in fast-paced environments where I can leverage my skills to propel companies forward.",
  },
  'timothy-duncan': {
    title: 'Business Development Manager',
    avatar: '/wp-content/uploads/2024/07/timothy-duncan.png',
    linkedin: 'https://www.linkedin.com/in/timothy-duncan-097a971a3/',
    bio: 'Timothy Duncan is an accomplished Business Development Manager with a proven track record of driving revenue growth and fostering strategic partnerships. With over 10 years of experience in the field, Timothy possesses a keen understanding of market dynamics and a knack for identifying lucrative business opportunities. His expertise lies in formulating and executing innovative strategies to expand market presence and maximize profitability. Timothy is a results-driven professional known for his strong negotiation skills, exceptional communication abilities, and ability to cultivate long-term client relationships.',
  },
  'romee-giri': {
    title: 'Passionate Learner',
    avatar: '/wp-content/uploads/2024/07/Romee-Giri.png',
    linkedin: 'https://www.linkedin.com/in/romee-giri-34103b106/',
    bio: 'Romee Giri is a driven Software Developer based in Toronto, Canada, with a deep passion for technology and a relentless drive for personal growth. A self-proclaimed "Passionate Learner," Romee is always eager to delve into new technologies, programming languages, and frameworks. With a keen eye for detail and a knack for problem-solving, Romee thrives in dynamic environments where innovation and creativity are encouraged.',
  },
  desery: {
    name: 'Desery Dandan',
    title: 'Freelance Admin',
    avatar: '/wp-content/uploads/2024/07/Desery-Dandan.png',
    linkedin: 'https://www.linkedin.com/in/desery-dandan-8b061420b/',
    bio: 'Experienced and detail-oriented freelance administrative professional with a proven track record of efficiently managing administrative tasks across various industries. Possesses excellent organizational skills, a keen eye for detail, and a strong commitment to delivering high-quality work. Skilled in providing comprehensive administrative support to individuals and businesses, ensuring smooth operations and increased productivity.',
  },
  'mehvish-beg': {
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/07/Mehvish-Beg.png',
    linkedin: 'https://www.linkedin.com/in/mehvish-beg-12291016a/',
    bio: 'Mehvish Beg is a dynamic and results-oriented Business Development Executive with a passion for driving growth and building strategic partnerships. With a keen understanding of market trends and customer needs, Mehvish excels in identifying new business opportunities and forging strong relationships with clients and stakeholders. With a proven track record of exceeding targets and delivering innovative solutions, Mehvish is dedicated to driving revenue growth and expanding market presence.',
  },
  'michelle-solon': {
    title: 'Administrator',
    avatar: '/wp-content/uploads/2024/07/Michelle-Solon.png',
    linkedin: 'https://www.linkedin.com/in/michelle-solon-853428257/',
    bio: 'Michelle Solon is an experienced administrator with a passion for organization and efficiency. With over a decade of experience in administrative roles across various industries, Michelle has honed her skills in managing office operations, coordinating schedules, and facilitating effective communication among team members.',
  },
  'gian-orillo': {
    title: 'Business Development Executive',
    avatar: '/wp-content/uploads/2024/07/Banner-cf.png',
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveAuthorSlug(slug: string): string {
  return AUTHOR_SLUG_ALIASES[slug] || slug;
}

function enrichAuthor(author: Author): Author {
  const canonical = resolveAuthorSlug(author.slug);
  const override = LIVE_AUTHOR_OVERRIDES[canonical] || {};
  const name = cleanAuthorName(override.name || author.name, canonical);
  const linkedin = override.linkedin || author.social?.find((s) => s.type === 'linkedin')?.url;
  const social = linkedin
    ? [{ type: 'linkedin', url: linkedin }, ...(author.social?.filter((s) => s.type !== 'linkedin') || [])]
    : author.social;

  return {
    ...author,
    slug: canonical,
    name,
    title: override.title || author.title,
    bio: override.bio || author.bio,
    avatar: override.avatar
      ? { src: override.avatar, alt: name }
      : author.avatar?.src
        ? { ...author.avatar, alt: cleanAuthorName(author.avatar.alt || name, name) }
        : author.avatar,
    social,
    canonical: `${ORIGIN}/author/${canonical}/`,
  };
}

export function getAllAuthorSlugs(): string[] {
  if (!existsSync(join(ROOT, 'src/content/authors'))) return [];
  return readdirSync(join(ROOT, 'src/content/authors'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

export function getAuthor(slug: string): Author | null {
  const canonical = resolveAuthorSlug(slug);
  const path = join(ROOT, 'src/content/authors', `${canonical}.json`);
  if (!existsSync(path)) return null;
  const author = JSON.parse(readFileSync(path, 'utf8')) as Author;
  author.name = cleanAuthorName(author.name, canonical);
  if (author.avatar?.alt) author.avatar.alt = cleanAuthorName(author.avatar.alt, author.name);
  if (!author.avatar?.src) {
    const raw = readFileSync(path, 'utf8');
    const m =
      raw.match(/src=\\"(\/wp-content\/uploads\/[^\\"]+)\\"/) ||
      raw.match(/src="(\/wp-content\/uploads\/[^"]+)"/);
    if (m?.[1]) {
      author.avatar = { src: m[1], alt: author.name };
    }
  }
  return enrichAuthor(author);
}

export function getAllAuthors(): Author[] {
  const seen = new Set<string>();
  const authors: Author[] = [];
  for (const slug of getAllAuthorSlugs()) {
    const canonical = resolveAuthorSlug(slug);
    if (seen.has(canonical)) continue;
    const author = getAuthor(canonical);
    if (author) {
      seen.add(canonical);
      authors.push(author);
    }
  }
  return authors;
}

export function getPostsByAuthorSlug(authorSlug: string): BlogPost[] {
  const canonical = resolveAuthorSlug(authorSlug);
  const aliasSlugs = Object.entries(AUTHOR_SLUG_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([alias]) => alias);
  const slugs = new Set([canonical, ...aliasSlugs]);
  const posts = new Map<string, BlogPost>();
  for (const slug of slugs) {
    for (const post of getPostsByAuthorSlugRaw(slug)) {
      posts.set(post.slug, post);
    }
  }
  return [...posts.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getAuthorPageData(slug: string, page = 1): AuthorPageData | null {
  let author = getAuthor(slug);
  const allPosts = getPostsByAuthorSlug(author ? author.slug : slug);
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
  const entries: AuthorDirectoryEntry[] = [];
  for (const slug of LIVE_AUTHOR_ORDER) {
    const author = getAuthor(slug);
    if (!author) continue;
    const postCount = getPostsByAuthorSlug(slug).length;
    if (postCount === 0) continue;
    entries.push({ author, postCount });
  }
  return entries;
}

function buildCfProfileHtml(author: Author): string {
  const name = escapeHtml(author.name);
  const bio = author.bio ? escapeHtml(author.bio) : '';
  const avatarSrc = author.avatar?.src || '';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const linkedin = author.social?.find((s) => s.type === 'linkedin');

  const avatarHtml = avatarSrc
    ? `<img src="${avatarSrc}" alt="${avatarAlt}" width="278" height="287" loading="lazy" decoding="async" />`
    : '';

  const linkedinHtml = linkedin
    ? `<a href="${escapeHtml(linkedin.url)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">${LINKEDIN_ICON_SVG}</a>`
    : '';

  return `<div class="author-sec2">
  <div class="auth-img">${avatarHtml}</div>
  <div class="auth-name">
    <h2>${name}</h2>
    ${linkedinHtml}
  </div>
  ${bio ? `<div class="auth-bio"><p>${bio}</p></div>` : ''}
</div>`;
}

function getAuthorPostExcerpt(post: BlogPost): string {
  return excerptFromContent(post.contentHtml || post.description || '', 12000);
}

function buildCfAuthorPostHtml(post: BlogPost, index: number, paginated = false): string {
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(getAuthorPostExcerpt(post));
  const img = post.featuredImage;
  const imgSrc = img?.src || '';
  const imgAlt = escapeHtml(img?.alt || post.title);
  const imgTag = imgSrc
    ? `<img width="1920" height="1080" src="${imgSrc}" alt="${imgAlt}" loading="lazy" decoding="async" />`
    : '';
  const visibilityClass =
    paginated || index < 9 ? 'astro-author-visible' : 'astro-author-hidden';

  return `<a href="${postUrl}" class="main-post post-wrap filter main-profile ${visibilityClass}">
  <div class="img-wrap">${imgTag}</div>
  <div class="post-ct">
    <h3>${title}</h3>
    <p>${excerpt}</p>
  </div>
</a>`;
}

function buildAuthorLoadMoreHtml(show: boolean): string {
  if (!show) return '';
  return `<div id="loadMore"><a href="#">Load More</a></div>`;
}

function buildCfAuthorDirectoryCardHtml(entry: AuthorDirectoryEntry): string {
  const { author } = entry;
  const name = escapeHtml(author.name);
  const title = author.title ? escapeHtml(author.title) : '';
  const avatarSrc = author.avatar?.src || '';
  const avatarAlt = escapeHtml(author.avatar?.alt || author.name);
  const href = `/author/${author.slug}/`;
  const linkedin = author.social?.find((s) => s.type === 'linkedin');

  const linkedinHtml = linkedin
    ? `<div class="elementor-element elementor-widget__width-auto elementor-view-default elementor-widget elementor-widget-icon" data-widget_type="icon.default">
        <div class="elementor-widget-container">
          <div class="elementor-icon-wrapper">
            <a class="elementor-icon" href="${escapeHtml(linkedin.url)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">${LINKEDIN_ICON_SVG}</a>
          </div>
        </div>
      </div>`
    : '';

  return `<div class="elementor-column elementor-col-25 elementor-top-column astro-author-dir-col" data-element_type="column">
  <div class="elementor-widget-wrap elementor-element-populated">
    <div class="elementor-element elementor-widget elementor-widget-image" data-widget_type="image.default">
      <div class="elementor-widget-container">
        <a href="${href}"><img decoding="async" width="278" height="287" src="${avatarSrc}" class="attachment-large size-large" alt="${avatarAlt}" loading="lazy" /></a>
      </div>
    </div>
    <div class="astro-author-meta-row">
      <div class="elementor-element elementor-widget__width-auto elementor-widget elementor-widget-heading" data-widget_type="heading.default">
        <div class="elementor-widget-container">
          <h5 class="elementor-heading-title elementor-size-default"><a href="${href}">${name}</a></h5>
        </div>
      </div>
      ${linkedinHtml}
    </div>
    ${title ? `<div class="elementor-element elementor-widget elementor-widget-heading" data-widget_type="heading.default"><div class="elementor-widget-container"><p class="elementor-heading-title elementor-size-default">${title}</p></div></div>` : ''}
  </div>
</div>`;
}

function buildCfAuthorDirectoryGridHtml(entries: AuthorDirectoryEntry[]): string {
  return entries.map((entry) => buildCfAuthorDirectoryCardHtml(entry)).join('\n');
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
  const title = author.og?.title || `${author.name}, Author at Connect Freelance${pageSuffix}`;
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

  if (author.avatar?.src) {
    const ogImage = author.avatar.src.startsWith('http') ? author.avatar.src : `${ORIGIN}${author.avatar.src}`;
    out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`);
    out = out.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${ogImage}" />`);
  }

  return out;
}

function patchAuthorDirectoryHeadMeta(html: string, entries: AuthorDirectoryEntry[]): string {
  const first = entries[0]?.author;
  const title = 'Author - Ultimate Blogging Championship | Connect Freelance';
  const description =
    'Discover diverse insights from our skilled authors, each bringing valuable expertise to our professional blog.';
  const canonical = `${ORIGIN}/author/`;
  const ogImage = first?.avatar?.src
    ? first.avatar.src.startsWith('http')
      ? first.avatar.src
      : `${ORIGIN}${first.avatar.src}`
    : `${ORIGIN}/wp-content/uploads/2024/07/jerryl-lance-alva.png`;

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

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

  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);
  out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${ogImage}" />`);
  out = out.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${ogImage}" />`);

  return out;
}

export function assembleAuthorArchiveHtml(data: AuthorPageData): string {
  if (!existsSync(ARCHIVE_SHELL_PATH)) {
    throw new Error('Author archive shell missing. Run: node scripts/prepare-author-shell.mjs');
  }

  let html = readFileSync(ARCHIVE_SHELL_PATH, 'utf8');
  const { author, posts, currentPage, totalPages } = data;
  const displayAuthor = enrichAuthor(author);
  const useLoadMore = currentPage === 1 && posts.length > 9;
  const postsHtml = posts
    .map((p, index) => buildCfAuthorPostHtml(p, index, currentPage > 1))
    .join('\n');
  const pagination = buildPaginationHtml(displayAuthor, currentPage, totalPages);

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildCfProfileHtml(displayAuthor))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml)
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', pagination);

  if (useLoadMore) {
    html = html.replace(
      /<div class="filter-post">([\s\S]*?)<\/div>\s*<div class="astro-author-pagination">/,
      `<div class="filter-post">$1</div>\n${buildAuthorLoadMoreHtml(true)}\n<div class="astro-author-pagination">`,
    );
  }

  html = html.replace(/\.main-profile\s*\{\s*display:\s*none;?\s*\}/gi, '.main-profile {}');

  // Remove legacy WP Rocket load-more script if still present in shell.
  html = html.replace(/<div id="loadMore">[\s\S]*?<\/div>\s*<script[^>]*>[\s\S]*?loadMore[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?\$\("#loadMore"\)[\s\S]*?<\/script>/gi, '');

  html = patchHeadMeta(html, { ...data, author: displayAuthor });

  const authorAssets = `<link rel="stylesheet" href="/css/cf-author-layout.css" data-cf-author-layout="1" />
<link rel="stylesheet" href="/css/kinza-form-fix.css" data-kinza-form-fix="1" />`;

  if (!html.includes('cf-author-layout.css')) {
    html = html.replace('</head>', `${authorAssets}\n</head>`);
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
  if (!existsSync(DIRECTORY_SHELL_PATH)) {
    throw new Error('Author directory shell missing: src/legacy/author.cleaned.html');
  }

  const entries = getAuthorDirectoryEntries();
  let html = readFileSync(DIRECTORY_SHELL_PATH, 'utf8');
  const cards = buildCfAuthorDirectoryGridHtml(entries);

  html = html.replace(
    /(<section[^>]*data-id="edfd3ac"[^>]*>\s*<div class="elementor-container[^"]*">)([\s\S]*?)(<\/div>\s*<\/section>)/i,
    `$1\n${cards}\n$3`,
  );
  html = html.replace(/<section[^>]*data-id="d93b959"[^>]*>[\s\S]*?<\/section>\s*/i, '');

  html = patchAuthorDirectoryHeadMeta(html, entries);

  const dirAssets = `<link rel="stylesheet" href="/css/cf-author-layout.css" data-cf-author-layout="1" />
<link rel="stylesheet" href="/css/kinza-form-fix.css" data-kinza-form-fix="1" />`;

  if (!html.includes('cf-author-layout.css')) {
    html = html.replace('</head>', `${dirAssets}\n</head>`);
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
