/**
 * Assemble author archive pages from the live blog HTML shell so header,
 * footer, CSS, and scripts match /blog/ and the homepage exactly.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { injectRuntimeGtmLoader } from "./gtm/inject";
import { absolutizeMirrorSeoHtml } from "@connect/site-cms";
import { buildAuthorHeroHtml, buildAuthorPostsGridHtml, buildAuthorPostsHeadingHtml } from "./author-archive-html";
import { APB_POSTS_PER_PAGE } from "./apb-card-html";
import {
  getAuthorBySlug,
  getPostsByAuthor,
  paginate,
  stripHtml,
  type AuthorEntry,
  type PostEntry,
} from "./content";

const SITE_ORIGIN = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://emiratiguard.com"
)
  .trim()
  .replace(/\/$/, "");

const BLOG_SHELL = join(process.cwd(), "src/legacy/blog.cleaned.html");

function normalizeLegacyDocumentUrls(html: string): string {
  return html
    .replace(/https:\/\/(?:www\.)?emiratiguard\.com\//g, "/")
    .replace(/http:\/\/(?:www\.)?emiratiguard\.com\//g, "/")
    .replace(/(?<!:)\/\/(?:www\.)?emiratiguard\.com\//g, "/")
    .replace(/https:\/(?!\/)(wp-content|wp-includes)\//gi, "/$1/")
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, "$1=$2/")
    .replace(
      /(<script[^>]*id=["']twentytwenty-js-js["'][^>]*)\s+async(\s|>)/gi,
      "$1$2",
    );
}

function ensureStylesheet(html: string, href: string): string {
  if (html.includes(href)) return html;
  return html.replace(
    /<\/head>/i,
    `<link rel="stylesheet" href="${href}" data-eg-author-archive="1" />\n</head>`,
  );
}

function ensureScript(html: string, src: string): string {
  if (html.includes(src)) return html;
  return html.replace(/<\/body>/i, `<script src="${src}" defer><\/script>\n</body>`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPaginationHtml(
  basePath: string,
  page: number,
  totalPages: number,
): string {
  if (totalPages <= 1) return "";
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;

  function hrefFor(n: number) {
    if (n <= 1) return base;
    return `${base}page/${n}/`;
  }

  const parts: string[] = [];
  parts.push(
    page > 1
      ? `<a href="${hrefFor(page - 1)}" rel="prev">Prev</a>`
      : `<span>Prev</span>`,
  );
  for (let n = 1; n <= totalPages; n += 1) {
    if (n === page) {
      parts.push(`<span class="is-active" aria-current="page">${n}</span>`);
    } else {
      parts.push(`<a href="${hrefFor(n)}">${n}</a>`);
    }
  }
  parts.push(
    page < totalPages
      ? `<a href="${hrefFor(page + 1)}" rel="next">Next</a>`
      : `<span>Next</span>`,
  );

  return `<nav class="sp-pagination author-archive-pagination" aria-label="Pagination">${parts.join("\n")}</nav>`;
}

function buildMainHtml(
  author: AuthorEntry,
  posts: PostEntry[],
  page: number,
  totalPages: number,
): string {
  const postsBlock = posts.length
    ? buildAuthorPostsGridHtml(author, posts)
    : `${buildAuthorPostsHeadingHtml(author)}\n<p>No posts by this author.</p>`;
  const pagination = buildPaginationHtml(author.path, page, totalPages);

  return `<main id="site-content">
<article class="author-archive post author author-${author.id} type-author status-publish hentry" id="author-${author.slug}">
${buildAuthorHeroHtml(author)}
	<div class="post-inner thin ">
		<div class="entry-content">
${postsBlock}
${pagination}
		</div><!-- .entry-content -->
	</div><!-- .post-inner -->
</article>
</main><!-- #site-content -->`;
}

function patchHeadMeta(
  html: string,
  author: AuthorEntry,
  page: number,
  totalPages: number,
): string {
  const name = stripHtml(author.name);
  const pageSuffix = page > 1 ? ` — Page ${page}` : "";
  const title = `${name} | Author | Emirati Guard${pageSuffix}`;
  const description =
    author.description ||
    `Articles by ${name} on Emirati Guard — security services and UAE staffing insights.`;
  const canonicalPath =
    page <= 1
      ? author.path.endsWith("/")
        ? author.path
        : `${author.path}/`
      : `${author.path.replace(/\/?$/, "/")}page/${page}/`;
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;

  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  if (/name=["']description["']/i.test(out)) {
    out = out.replace(
      /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  } else {
    out = out.replace(
      /<\/head>/i,
      `<meta name="description" content="${escapeHtml(description)}" />\n</head>`,
    );
  }

  if (/rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
      `<link rel="canonical" href="${canonical}" />`,
    );
  } else {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${canonical}" />\n</head>`);
  }

  out = out.replace(
    /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  );
  out = out.replace(
    /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  out = out.replace(
    /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
  );

  // Keep Blog nav active (author archives are part of the blog experience).
  out = out.replace(
    /(<li[^>]*id=["']menu-item-20["'][^>]*class=["'])([^"']*)(["'])/i,
    (_m, pre, cls, post) => {
      let next = cls
        .replace(/\bcurrent-menu-item\b/g, "")
        .replace(/\bcurrent_page_item\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
      next = `${next} current-menu-item current_page_item`.trim();
      return `${pre}${next}${post}`;
    },
  );

  // Body class: archive author, keep twentytwenty / blog page chrome classes.
  out = out.replace(/<body([^>]*)class=["']([^"']*)["']/i, (_m, attrs, cls) => {
    const cleaned = cls
      .replace(/\bhome\b/g, "")
      .replace(/\bpage-id-\d+\b/g, "page-id-9")
      .replace(/\s+/g, " ")
      .trim();
    const extra = [
      "archive",
      "author",
      `author-${author.slug}`,
      `author-${author.id}`,
      page > 1 ? `paged paged-${page}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<body${attrs}class="${cleaned} ${extra}"`;
  });

  void totalPages;
  return out;
}

export function assembleAuthorArchiveHtml(slug: string, pageNum = 1): string | null {
  if (!existsSync(BLOG_SHELL)) return null;

  const author = getAuthorBySlug(slug);
  if (!author) return null;

  const sorted = getPostsByAuthor(author.id);
  const { items, page, totalPages } = paginate(sorted, pageNum, APB_POSTS_PER_PAGE);
  if (pageNum > totalPages) return null;

  let html = normalizeLegacyDocumentUrls(readFileSync(BLOG_SHELL, "utf8"));

  html = html.replace(
    /<main id="site-content">[\s\S]*?<\/main><!-- #site-content -->/i,
    buildMainHtml(author, items, page, totalPages),
  );

  html = patchHeadMeta(html, author, page, totalPages);
  html = injectRuntimeGtmLoader(html);
  html = ensureStylesheet(html, "/css/author-archive.css");
  html = ensureStylesheet(html, "/css/form-mirror-fixes.css");
  html = ensureStylesheet(html, "/css/vc-background-fallback.css");
  html = ensureScript(html, "/scripts/cf7-bridge.js");
  html = ensureScript(html, "/js/astro-mirror-fixes.js");

  const path =
    page <= 1
      ? author.path
      : `${author.path.replace(/\/?$/, "/")}page/${page}/`;
  html = absolutizeMirrorSeoHtml(html, { siteOrigin: SITE_ORIGIN, path });

  return html;
}

export function serveAuthorArchive(slug: string, pageNum = 1): Response {
  const html = assembleAuthorArchiveHtml(slug, pageNum);
  if (!html) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0",
    },
  });
}
