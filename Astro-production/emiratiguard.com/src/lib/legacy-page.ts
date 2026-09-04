/**
 * Serve a full cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { absolutizeMirrorSeoHtml } from "@connect/site-cms";
import { injectRuntimeGtmLoader } from "./gtm/inject";
import { injectBlogApbPosts } from "./inject-blog-apb";
import { notFoundResponse } from "./not-found";

const SITE_ORIGIN = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://emiratiguard.com"
)
  .trim()
  .replace(/\/$/, "");

export function pathToLegacySlug(pathname: string): string {
  let p = pathname || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p !== "/" && !p.endsWith("/")) p += "/";
  if (p === "/") return "homepage";
  return p.replace(/^\/|\/$/g, "");
}

function normalizeLegacyDocumentUrls(html: string): string {
  return html
    .replace(/https:\/\/(?:www\.)?emiratiguard\.com\//g, "/")
    .replace(/http:\/\/(?:www\.)?emiratiguard\.com\//g, "/")
    .replace(/(?<!:)\/\/(?:www\.)?emiratiguard\.com\//g, "/")
    .replace(/https:\/(?!\/)(wp-content|wp-includes)\//gi, "/$1/")
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, "$1=$2/")
    // Ensure Twenty Twenty menu JS runs even after DOMContentLoaded (async can miss it)
    .replace(
      /(<script[^>]*id=["']twentytwenty-js-js["'][^>]*)\s+async(\s|>)/gi,
      "$1$2",
    );
}

function absolutizeSeoUrls(html: string, slug: string): string {
  const fallbackPath = !slug || slug === "homepage" ? "/" : `/${String(slug).replace(/^\/|\/$/g, "")}/`;
  const absolute = (value: string) => {
    try {
      return new URL(value || fallbackPath, `${SITE_ORIGIN}/`).href;
    } catch {
      return `${SITE_ORIGIN}${fallbackPath}`;
    }
  };

  let out = html
    .replace(
      /(<link\s+rel=["']canonical["']\s+href=["'])([^"']+)(["'][^>]*>)/gi,
      (_, before, value, after) => `${before}${absolute(value)}${after}`,
    )
    .replace(
      /(<meta\s+property=["']og:url["']\s+content=["'])([^"']+)(["'][^>]*>)/gi,
      (_, before, value, after) => `${before}${absolute(value)}${after}`,
    );

  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absolute(fallbackPath)}" />\n</head>`);
  }
  return out;
}

function ensureScript(html: string, src: string): string {
  if (html.includes(src)) return html;
  return html.replace(/<\/body>/i, `<script src="${src}" defer><\/script>\n</body>`);
}

/** Inject Elementor locals before body scripts (legacy mirrors omit WP localize). */
function ensureElementorFrontendConfig(html: string): string {
  if (html.includes("elementorFrontendConfig")) return html;
  const stub = `<script>window.elementorFrontendConfig=window.elementorFrontendConfig||{environmentMode:{edit:!1,wpPreview:!1,isScriptDebug:!1},i18n:{},is_rtl:!1,breakpoints:{xs:0,sm:480,md:768,lg:1025,xl:1440,xxl:1600},responsive:{breakpoints:{}},version:"3.31.2",is_static:!1,experimentalFeatures:{},urls:{assets:"/wp-content/plugins/elementor/assets/"},settings:{page:[],editorPreferences:[]},kit:{},post:{id:0,title:"",excerpt:"",featuredImage:!1},elements:{data:{},nestedElements:{},hasPopUps:!1}};window.ElementorProFrontendConfig=window.ElementorProFrontendConfig||{ajaxurl:"/api/contact/",nonce:"astro",urls:{assets:"/wp-content/plugins/elementor-pro/assets/",rest:"/"},settings:{},popup:{hasPopUps:!1}};</script>`;
  return html.replace(/<\/head>/i, `${stub}\n</head>`);
}

function ensureStylesheet(html: string, href: string): string {
  if (html.includes(href)) return html;
  return html.replace(
    /<\/head>/i,
    `<link rel="stylesheet" href="${href}" data-eg-form-fixes="1" />\n</head>`,
  );
}

/** @param {string} slug e.g. homepage | about-us | police-clearance-certificate-dubai */
export function serveLegacyPage(slug: string): Response {
  const cleanedPath = join(process.cwd(), "src/legacy", `${slug}.cleaned.html`);
  if (!existsSync(cleanedPath)) {
    console.warn(`[legacy-page] Missing mirror for "${slug}" → 404`);
    return notFoundResponse();
  }

  let html = normalizeLegacyDocumentUrls(readFileSync(cleanedPath, "utf8"));
  // Shared logo lives in every WP dump — set brand alt once at serve time.
  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!/logo-horizontal-emiratiguard-white/i.test(tag)) return tag;
    if (/\balt="Emirati Guard"/i.test(tag)) return tag;
    if (/\balt="/i.test(tag)) return tag.replace(/\balt="[^"]*"/i, 'alt="Emirati Guard"');
    return tag.replace(/<img\b/i, '<img alt="Emirati Guard"');
  });
  html = injectRuntimeGtmLoader(html);
  html = absolutizeSeoUrls(html, slug);
  html = ensureElementorFrontendConfig(html);
  if (slug === "blog") {
    html = injectBlogApbPosts(html);
    html = ensureStylesheet(html, "/css/apb-ssr-fallback.css");
  }
  html = ensureStylesheet(html, "/css/form-mirror-fixes.css");
  // VC plugin assets were never mirrored — backgrounds need this fallback.
  html = ensureStylesheet(html, "/css/vc-background-fallback.css");
  html = ensureScript(html, "/scripts/cf7-bridge.js");
  html = ensureScript(html, "/js/astro-mirror-fixes.js");

  // Keep live robots meta as-is (do not inject or rewrite).

  const path = !slug || slug === "homepage" ? "/" : `/${String(slug).replace(/^\/|\/$/g, "")}/`;
  html = absolutizeMirrorSeoHtml(html, { siteOrigin: SITE_ORIGIN, path });
  // Trusted WP/Elementor/VC mirrors — do not run sanitizeMirrorHtml (broke layouts).

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0",
    },
  });
}

export function serveLegacyPath(pathname: string): Response {
  return serveLegacyPage(pathToLegacySlug(pathname));
}
