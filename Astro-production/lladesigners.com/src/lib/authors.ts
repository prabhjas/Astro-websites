/**
 * Author archive types, shell assembly, and content loading.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject';
import {
  getPostsByAuthorSlug,
  type BlogPost,
} from './blog.ts';

const ROOT = process.cwd();
const AUTHORS_DIR = join(ROOT, 'src/content/authors');
const SHELL_PATH = join(ROOT, 'src/legacy/author-shell/template.html');
const ORIGIN = 'https://lladesigners.com';

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

const LIVE_AUTHOR_ORDER = ['lana-vasiljeva', 'jermaine-odtujan', 'kate', 'nakul', 'timothy-patridge', 'alexander-m'];

const LIVE_AUTHOR_OVERRIDES: Record<
  string,
  { name?: string; title?: string; bio?: string; avatar?: string; cardImage?: string; linkedin?: string }
> = {
  'lana-vasiljeva': {
    name: 'Lana Vasiljeva',
    title: 'Chief Marketing Officer',
    bio: 'As a Chief Marketing Officer at LLA Designer I am passionate about creating engaging marketing initiatives that drives brand growth with diverse approach to the audience.',
    avatar: '/wp-content/uploads/2024/05/lana-lla.png',
    cardImage: '/wp-content/uploads/2024/05/1-1.jpg',
    linkedin: 'https://www.linkedin.com/in/lana-vasiljeva-389aa8139/',
  },
  'jermaine-odtujan': {
    name: 'Jermaine Odtujan',
    title: 'Sales Coordinator',
    bio: 'He excels in managing sales databases, coordinating sales activities, and providing exceptional administrative support to sales teams. His proactive approach and strong communication skills make his a valuable asset in ensuring seamless collaboration between sales, marketing, and other departments.',
    avatar: '/wp-content/uploads/2024/05/1.jpg',
    cardImage: '/wp-content/uploads/2024/05/1.jpg',
    linkedin: 'https://www.linkedin.com/in/jermaine-odtujan-9ab182248/',
  },
  kate: {
    name: 'Kate',
    bio: 'Kate is the Global Strategy Director at Connect Group. She is specialized in company formation, international business expansion and employee relocation. She studied in Southampton (United Kingdom) and moved to the UAE in 2014.',
    avatar:
      '/wp-content/uploads/2024/02/6dfde67c6b3244b4063868f5cdd4ec044ec6626f519f259cb459879715caaa09-96x96.png',
  },
  nakul: {
    name: 'Nakul',
    bio: 'Nakul Sachdeva is Head of Recruitment at Connect Resources. His expertise has crossed multiple categories and channels with functional expertise in a variety of industries. He has 10 years of career in executive search firms and supported end to end Recruitment for Major Banks, Financial Institution, IT and Consulting firms based out of Toronto, Canada and Dubai, UAE. He manages end to end Recruitment at Connect Resources as well as serves as the client’s initial point of contact when seeking recruiting services.',
    avatar:
      '/wp-content/uploads/2024/02/1948c721253c374176e07cb97d9a202f660ff32f7b275c0691fcbda9cf221629-96x96.jpeg',
  },
  'timothy-patridge': {
    name: 'Timothy Patridge',
    title: 'Enterprise Development',
    bio: 'Tim is a Business Development Manager at Connect Resources. Seeking out new business opportunities for the company by building and Maintaining Relationships with partnerships/connections both locally and internationally. Tim has a background in Logistics, working in the UK for a number of years at large Organizations.',
  },
  'alexander-m': {
    name: 'Alexander M',
    bio: 'Alex joined Connect Group as a Document Controller couple of years back. He is in charge of all controlled documents for the company, making sure everyone is on the same page when they need to be. He also create, design and maintain the architecture for document processes and procedures and enforce the proper chain of action and document identification. Alex go through all confidential documents and make edits, updates, and check for accuracy. Once this process is completed, he will approve the documents and distribute it to the right team. He also ensures proper labeling, numbering, and accessibility of the documents to all team members.',
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Migrated author names sometimes include Elementor avatar <img> markup — strip it. */
function cleanAuthorName(raw: string): string {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAvatarFromCorruptName(raw: string): string | undefined {
  const m = String(raw || '').match(/src=["']([^"']+)["']/i);
  return m?.[1]?.replace(/&amp;/g, '&');
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
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Author & { url?: string };
  const override = LIVE_AUTHOR_OVERRIDES[slug];
  const cleanedName = cleanAuthorName(raw.name);
  const avatarSrc =
    override?.avatar ||
    raw.avatar?.src ||
    extractAvatarFromCorruptName(raw.name) ||
    undefined;
  const name = override?.name || cleanedName || slug;
  return {
    ...raw,
    slug,
    name,
    title: override?.title || raw.title,
    bio: override?.bio || raw.bio,
    avatar: avatarSrc
      ? { src: avatarSrc, alt: raw.avatar?.alt || name }
      : raw.avatar,
    social: override?.linkedin
      ? [{ type: 'linkedin', url: override.linkedin }, ...(raw.social || []).filter((s) => s.type !== 'linkedin')]
      : raw.social,
    canonical: raw.canonical || `${ORIGIN}/author/${slug}/`,
    sourceUrl: raw.sourceUrl || `${ORIGIN}/author/${slug}/`,
    migratedAt: raw.migratedAt || new Date().toISOString(),
    og: {
      ...(raw.og || {}),
      title: `${name}, Author at LLA Designers`,
    },
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

  // Live dumps all author posts into the shortcode grid; JS shows 9 + Load More.
  const posts = getPostsByAuthorSlug(slug);
  const totalPosts = posts.length;
  return { author, posts, currentPage: 1, totalPages: 1, totalPosts };
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
  const linkedin = author.social?.find((s) => s.type === 'linkedin');

  const linkedinHtml = linkedin
    ? `<div class="elementor-element elementor-element-df5b09c elementor-widget__width-auto elementor-view-default elementor-widget elementor-widget-icon" data-id="df5b09c" data-element_type="widget" data-widget_type="icon.default">
        <div class="elementor-widget-container">
          <div class="elementor-icon-wrapper">
            <a class="elementor-icon" href="${escapeHtml(linkedin.url)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i aria-hidden="true" class="fab fa-linkedin"></i>
            </a>
          </div>
        </div>
      </div>`
    : '';

  const avatarHtml = avatarSrc
    ? `<div class="elementor-element elementor-element-b0b15c5 elementor-widget elementor-widget-image" data-id="b0b15c5" data-element_type="widget" data-widget_type="image.default">
        <div class="elementor-widget-container">
          <img width="1686" height="1646" src="${avatarSrc}" alt="${avatarAlt}" loading="lazy" decoding="async" />
        </div>
      </div>`
    : '';

  return `<section class="elementor-section elementor-top-section elementor-element elementor-element-a78c16e elementor-section-full_width elementor-section-height-default" data-id="a78c16e" data-element_type="section">
    <div class="elementor-container elementor-column-gap-default">
      <div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-28b0ef1" data-id="28b0ef1" data-element_type="column">
        <div class="elementor-widget-wrap elementor-element-populated">
          <div class="elementor-element elementor-element-137e113 elementor-widget__width-auto elementor-widget elementor-widget-heading" data-id="137e113" data-widget_type="heading.default">
            <div class="elementor-widget-container">
              <h2 class="elementor-heading-title elementor-size-default">${name}</h2>
            </div>
          </div>
          ${linkedinHtml}
          ${
            title
              ? `<div class="elementor-element elementor-element-0c8b2f8 elementor-widget elementor-widget-heading" data-id="0c8b2f8" data-widget_type="heading.default">
            <div class="elementor-widget-container">
              <span class="elementor-heading-title elementor-size-default">${title}</span>
            </div>
          </div>`
              : ''
          }
          ${
            bio
              ? `<div class="elementor-element elementor-element-3e80f9d elementor-widget elementor-widget-heading" data-id="3e80f9d" data-widget_type="heading.default">
            <div class="elementor-widget-container">
              <p class="elementor-heading-title elementor-size-default">${bio}</p>
            </div>
          </div>`
              : ''
          }
        </div>
      </div>
      <div class="elementor-column elementor-col-50 elementor-top-column elementor-element elementor-element-a613a32" data-id="a613a32" data-element_type="column">
        <div class="elementor-widget-wrap elementor-element-populated">${avatarHtml}</div>
      </div>
    </div>
  </section>`;
}

function buildPostsHeadingHtml(author: Author): string {
  return `<h2 class="elementor-heading-title elementor-size-default">Article By ${escapeHtml(author.name)}</h2>`;
}

function formatAuthorPostDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return '';
  }
}

function categoryFilterClass(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Live author archive shortcode card (.post-wrap). */
function buildAuthorPostCardHtml(post: BlogPost): string {
  const postUrl = `/${post.slug}/`;
  const title = escapeHtml(post.title);
  const imgSrc = post.featuredImage?.src || '';
  const imgAlt = escapeHtml(post.featuredImage?.alt || post.title);
  const dateDisplay = formatAuthorPostDate(post.publishedAt);
  const cats = post.categories || [];
  const filterClasses = cats.map((c) => categoryFilterClass(c.name)).filter(Boolean).join(' ');
  const catHtml = cats
    .map(
      (c) =>
        `<span style="color:#DD9665;">⎯ </span>
                    <span class="cat-name"> ${escapeHtml(c.name)}  </span>
                    <span class="post-date">${dateDisplay}</span>`,
    )
    .join('\n');

  const imgTag = imgSrc
    ? `<img width="1920" height="1080" src="${imgSrc}" alt="${imgAlt}" loading="lazy" decoding="async" />`
    : '';

  return `<div class="main-post post-wrap filter ${filterClasses}">
     	<a href="${postUrl}">
     			  <div class="s2img">${imgTag}</div>
                  <div class="post-ct">
${catHtml}
                      <h3>${title}</h3>
                                   		</div>
             </a>
       </div>`;
}

const AUTHOR_POSTS_SHORTCODE_CSS = `<style id="astro-author-posts-css">
.filter-wrap{display:flex;justify-content:space-between;align-items:center}
.filter-box{width:22%}
.post-wrap{display:none}
.filter-post{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:20px}
.main-post{border:1px solid #DFDFDF;background:#FFFFFF}
.post-wrap img{width:100%;margin-bottom:10px}
.post-wrap h3{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#1C232D;font-family:Roboto,sans-serif;font-size:22px;font-weight:500;line-height:30px;margin:5px 0 15px}
.cat-name{color:#0C0C0C;font-family:Roboto,sans-serif;font-size:14px;font-weight:400;text-transform:uppercase;line-height:21px;margin-right:8px}
.post-date{color:#DD9665;font-family:Roboto,sans-serif;font-size:14px;font-weight:400;text-transform:uppercase;line-height:21px}
.post-ct{padding:10px 20px}
.s2img{height:320px}
.s2img img{width:100%;height:100%;object-fit:cover}
#loadMore{width:200px;color:#fff;display:block;text-align:center;margin:20px auto;padding:10px 20px;border-radius:10px;border:1px solid transparent;background-color:#dd9665;transition:.3s;cursor:pointer}
#loadMore:hover{color:#dd9665;background-color:#fff;border:1px solid #dd9665;text-decoration:none}
.noContent{color:#000!important;background-color:transparent!important;pointer-events:none}
@media only screen and (min-width:768px) and (max-width:991px){.s2img{height:221px}}
@media only screen and (max-width:767px){.s2img{height:221px}.post-wrap h3{font-size:20px;margin:0}.filter-post{grid-template-columns:repeat(1,1fr)!important}}
</style>`;

function buildAuthorPostsShortcodeHtml(posts: BlogPost[]): string {
  const cards = posts.map((p) => buildAuthorPostCardHtml(p)).join('\n');
  const loadMore =
    posts.length > 9
      ? `<div id="loadMore" role="button" tabindex="0">Load More</div>`
      : '';
  return `${AUTHOR_POSTS_SHORTCODE_CSS}
<div class="filter-post">
${cards}
</div>
${loadMore}
<script>
(function(){
  function showInitial(){
    var posts = document.querySelectorAll('.filter-post .post-wrap');
    for (var i = 0; i < posts.length && i < 9; i++) posts[i].style.display = 'block';
  }
  function boot($){
    $(".post-wrap").hide().slice(0, 9).show();
    $("#loadMore").on("click", function(e){
      e.preventDefault();
      $(".post-wrap:hidden").slice(0, 3).slideDown();
      if($(".post-wrap:hidden").length == 0) {
        $("#loadMore").text("No Content").addClass("noContent");
      }
    });
  }
  showInitial();
  if (window.jQuery) boot(window.jQuery);
  else {
    document.addEventListener('DOMContentLoaded', function(){
      showInitial();
      if (window.jQuery) boot(window.jQuery);
    });
    window.addEventListener('rocket-allScriptsLoaded', function(){
      if (window.jQuery) boot(window.jQuery);
    });
  }
})();
</script>`;
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
  const title = author.og?.title || `${author.name}, Author at LLA Designers${pageSuffix}`;
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
  const title = 'Meet Our Expert Authors | LLA Designers';
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
    throw new Error('Author shell missing. Run: node scripts/prepare-lla-authors.mjs');
  }

  let html = readFileSync(SHELL_PATH, 'utf8');
  const { author, posts, currentPage, totalPages } = data;

  const postsHtml = buildAuthorPostsShortcodeHtml(posts);

  html = html
    .replace('<!--ASTRO_AUTHOR:PROFILE-->', buildProfileHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS_HEADING-->', buildPostsHeadingHtml(author))
    .replace('<!--ASTRO_AUTHOR:POSTS-->', postsHtml)
    .replace('<!--ASTRO_AUTHOR:PAGINATION-->', buildPaginationHtml(author, currentPage, totalPages));

  html = patchHeadMeta(html, data);

  const authorFixCss = `<style id="astro-author-archive-css">
.elementor-element-a78c16e{padding:60px 0 20px}
.elementor-element-a78c16e > .elementor-container{max-width:1140px;margin-inline:auto;align-items:center}
.elementor-element-28b0ef1 > .elementor-widget-wrap{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.elementor-element-137e113 .elementor-heading-title{font-size:42px;font-weight:700;margin:0;color:#070c13;line-height:1.2}
.elementor-element-0c8b2f8{flex:1 1 100%}
.elementor-element-0c8b2f8 .elementor-heading-title{font-size:18px;font-weight:500;color:#333;display:block;margin-top:4px}
.elementor-element-3e80f9d{flex:1 1 100%}
.elementor-element-3e80f9d .elementor-heading-title{font-size:16px;font-weight:400;line-height:1.6;color:#444;margin-top:12px}
.elementor-element-df5b09c .elementor-icon{color:#0a66c2;font-size:22px}
.elementor-element-b0b15c5 img{width:100%;max-width:420px;height:auto;display:block;margin-left:auto;object-fit:contain}
.elementor-element-4b8abe4{padding:20px 0 60px}
.elementor-element-8a5fe32 .elementor-heading-title,
.elementor-element-4b8abe4 h2.elementor-heading-title{font-size:28px;font-weight:700;margin:0 0 10px;color:#070c13}
@media (max-width:767px){
  .elementor-element-a78c16e > .elementor-container{flex-wrap:wrap}
  .elementor-element-137e113 .elementor-heading-title{font-size:32px}
  .elementor-element-b0b15c5 img{margin:20px auto 0}
}
</style>`;

  if (!html.includes('astro-author-archive-css')) {
    html = html.replace('</head>', `${authorFixCss}\n</head>`);
  }

  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260810-qa3" defer></script>\n</body>');
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
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260810-qa3" defer></script>\n</body>');
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
