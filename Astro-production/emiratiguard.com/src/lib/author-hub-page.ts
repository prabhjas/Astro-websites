/**
 * Assemble /author/ hub from the blog HTML shell so header, footer, CSS, and
 * scripts match /blog/ and the homepage exactly.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { injectRuntimeGtmLoader } from "./gtm/inject";
import { absolutizeMirrorSeoHtml } from "@connect/site-cms";
import { getPageByPath, stripHtml, type PageEntry } from "./content";

const SITE_ORIGIN = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://emiratiguard.com"
)
  .trim()
  .replace(/\/$/, "");

const BLOG_SHELL = join(process.cwd(), "src/legacy/blog.cleaned.html");
const AUTHOR_PATH = "/author/";

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
    `<link rel="stylesheet" href="${href}" data-eg-author-hub="1" />\n</head>`,
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

function pageBodyHtml(page: PageEntry): string {
  return normalizeLegacyDocumentUrls(page.bodyHtml || page.content || "");
}

function buildMainHtml(page: PageEntry): string {
  const body = pageBodyHtml(page);
  return `<main id="site-content">
<article class="post-${page.id} page type-page status-publish hentry author-hub" id="post-${page.id}">
	<div class="sp-page-content author-hub-content">
${body}
	</div>
</article>
</main><!-- #site-content -->`;
}

function patchHeadMeta(html: string, page: PageEntry): string {
  const title = page.seo.title || `${stripHtml(page.title)} | Emirati Guard`;
  const description =
    page.seo.description ||
    "Meet the Emirati Guard authors — security industry experts sharing insights from the UAE.";
  const canonical = `${SITE_ORIGIN}${AUTHOR_PATH}`;

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

  out = out.replace(/<body([^>]*)class=["'][^"']*["']/i, (_m, attrs) => {
    const bodyClass = [
      "wp-custom-logo",
      "wp-embed-responsive",
      "wp-theme-twentytwenty",
      "vcwb",
      "elementor-default",
      "elementor-kit-215",
      "elementor-page",
      `elementor-page-${page.id}`,
      "page",
      `page-id-${page.id}`,
      "footer-top-visible",
      "author-hub",
    ].join(" ");
    return `<body${attrs}class="${bodyClass}"`;
  });

  return out;
}

export function assembleAuthorHubHtml(): string | null {
  if (!existsSync(BLOG_SHELL)) return null;

  const page = getPageByPath(AUTHOR_PATH);
  if (!page) return null;

  let html = normalizeLegacyDocumentUrls(readFileSync(BLOG_SHELL, "utf8"));

  html = html.replace(
    /<main id="site-content">[\s\S]*?<\/main><!-- #site-content -->/i,
    buildMainHtml(page),
  );

  html = patchHeadMeta(html, page);
  html = injectRuntimeGtmLoader(html);

  const pageStyles = [
    page.elementorCss || `/wp-content/uploads/elementor/css/post-${page.id}.css`,
    "/wp-content/plugins/elementor/assets/css/widget-heading.min.css",
    "/wp-content/plugins/elementor/assets/css/widget-image-box.min.css",
    "/wp-content/uploads/elementor/google-fonts/css/poppins.css",
    ...(page.pageCss || []),
  ];
  for (const href of pageStyles) {
    if (href && typeof href === "string") html = ensureStylesheet(html, href);
  }

  html = ensureStylesheet(html, "/css/author-hub.css");
  html = ensureStylesheet(html, "/css/migration-overrides.css");
  html = ensureStylesheet(html, "/css/form-mirror-fixes.css");
  html = ensureStylesheet(html, "/css/vc-background-fallback.css");
  html = ensureScript(html, "/scripts/cf7-bridge.js");
  html = ensureScript(html, "/js/astro-mirror-fixes.js");

  html = absolutizeMirrorSeoHtml(html, { siteOrigin: SITE_ORIGIN, path: AUTHOR_PATH });

  return html;
}

export function serveAuthorHub(): Response {
  const html = assembleAuthorHubHtml();
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
