import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';
/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://connectstaff.ae')
  .trim()
  .replace(/\/$/, '');

const HOME_PERF_MARK = 'data-connectstaff-home-perf="20260814"';
const HOME_CRITICAL_MARK = 'data-connectstaff-home-critical="20260814"';
const HOME_STAFF_PRELOADS = [
  '<link rel="preload" as="image" href="/wp-content/uploads/2024/07/staff-1.webp" type="image/webp" fetchpriority="high">',
  '<link rel="preload" as="image" href="/wp-content/uploads/2024/07/staff-2.webp" type="image/webp" fetchpriority="high">',
];
const HOME_DEFERRED_CSS_PATHS = new Set([
  '/wp-content/themes/Impreza/css/style.min.css',
  '/wp-content/cache/min/1/wp-content/plugins/Elementor-Widgets-Mega-Pack-v1.1/assets/css/style.css',
]);

const HOME_CRITICAL_CSS = `<style ${HOME_CRITICAL_MARK}>
html{font-family:Inter,Arial,sans-serif;-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:#101820}
img{max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
header[data-elementor-type="header"]{position:relative;z-index:20;background:#fff}
header[data-elementor-type="header"] .elementor-section{width:100%}
header[data-elementor-type="header"] .elementor-container{display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:12px 16px}
header[data-elementor-type="header"] .elementor-widget-wrap{display:flex;align-items:center;gap:20px;width:100%}
header[data-elementor-type="header"] img{display:block;width:auto;max-width:137px;height:auto}
header[data-elementor-type="header"] ul{list-style:none;margin:0;padding:0}
header[data-elementor-type="header"] .elementor-nav-menu{display:flex;align-items:center;gap:18px}
header[data-elementor-type="header"] .sub-menu{display:none}
header[data-elementor-type="header"] .elementor-item,header[data-elementor-type="header"] .elementor-sub-item{font-size:14px;font-weight:600;color:#101820}
header[data-elementor-type="header"] .elementor-menu-toggle{display:none}
.elementor{box-sizing:border-box}
.elementor *,.elementor :after,.elementor :before{box-sizing:border-box}
.elementor-section{position:relative}
.elementor-section .elementor-container{display:flex;position:relative;margin-left:auto;margin-right:auto;max-width:1200px}
.elementor-column{position:relative;display:flex;min-height:1px}
.elementor-col-100{width:100%}
.elementor-col-50{width:50%}
.elementor-widget-wrap{position:relative;display:flex;align-content:flex-start;flex-wrap:wrap;width:100%}
.elementor-widget{position:relative;width:100%}
.elementor-widget-container{transition:background .3s,border .3s,border-radius .3s,box-shadow .3s}
.elementor-19889 .elementor-element.elementor-element-5234bc3:not(.elementor-motion-effects-element-type-background),.elementor-19889 .elementor-element.elementor-element-5234bc3>.elementor-motion-effects-container>.elementor-motion-effects-layer{background-image:url("/wp-content/uploads/2024/07/Hero-optimized.webp");background-position:center center;background-repeat:no-repeat;background-size:cover}
.elementor-19889 .elementor-element.elementor-element-5234bc3>.elementor-container{min-height:600px}
.elementor-19889 .elementor-element.elementor-element-562bca4{padding:40px 10px;border-radius:0 0 50px 50px}
.elementor-19889 .elementor-element.elementor-element-3d9207d,.elementor-19889 .elementor-element.elementor-element-31cafa4{text-align:center}
.elementor-19889 .elementor-element.elementor-element-3d9207d .elementor-heading-title{margin:0 0 8px;font-size:18px;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:#000}
.elementor-19889 .elementor-element.elementor-element-31cafa4 .elementor-heading-title{margin:0 0 24px;font-size:32px;font-weight:800;line-height:1.18;text-transform:uppercase;letter-spacing:2.5px;color:#000}
.elementor-19889 .elementor-element.elementor-element-fe62c77 .elementor-widget-container{position:relative;overflow:hidden}
.elementor-19889 .elementor-element.elementor-element-fe62c77 .hajs-slick{display:flex;overflow:hidden;gap:0;min-height:223px}
.elementor-19889 .elementor-element.elementor-element-fe62c77 .ha-slick-slide{display:block;flex:0 0 20%;max-width:20%;min-width:0}
.elementor-19889 .elementor-element.elementor-element-fe62c77 .ha-slick-item{padding:0 6px}
.elementor-19889 .elementor-element.elementor-element-fe62c77 .ha-slick-img{display:block;width:100%;height:auto;aspect-ratio:400/446;object-fit:cover}
.elementor-19889 .elementor-element.elementor-element-fe62c77 .slick-prev,.elementor-19889 .elementor-element.elementor-element-fe62c77 .slick-next{display:none}
.elementor-19889 .elementor-element.elementor-element-a980a07{padding:2rem 0}
.elementor-19889 .elementor-element.elementor-element-a980a07>.elementor-container>.elementor-column>.elementor-widget-wrap{align-content:center;align-items:center}
.elementor-19889 .elementor-element.elementor-element-1991e7d .elementor-heading-title{font-size:24px;font-weight:800;text-transform:uppercase}
.elementor-19889 .elementor-element.elementor-element-1ad8c2b .elementor-heading-title{font-size:38px;font-weight:600;line-height:1.2;color:#000}
.elementor-19889 .elementor-element.elementor-element-b26d376{font-size:16px;font-weight:400;line-height:1.4;color:#485259}
.elementor-19889 .elementor-element.elementor-element-0d11614 .elementor-button{display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;background:#000;color:#fff;border-radius:100px;font-size:18px;font-weight:600}
@media (max-width:1024px){
  header[data-elementor-type="header"] .elementor-nav-menu--main{display:none}
  header[data-elementor-type="header"] .elementor-menu-toggle{display:block;margin-left:auto}
  .elementor-19889 .elementor-element.elementor-element-5234bc3>.elementor-container{min-height:450px}
  .elementor-19889 .elementor-element.elementor-element-fe62c77 .ha-slick-slide{flex-basis:33.333%;max-width:33.333%}
}
@media (max-width:767px){
  header[data-elementor-type="header"] .elementor-container{padding:10px 14px}
  .elementor-section .elementor-container{display:block}
  .elementor-col-50{width:100%}
  .elementor-19889 .elementor-element.elementor-element-5234bc3>.elementor-container{min-height:250px}
  .elementor-19889 .elementor-element.elementor-element-562bca4{padding:50px 10px 40px}
  .elementor-19889 .elementor-element.elementor-element-31cafa4 .elementor-heading-title{font-size:30px;letter-spacing:1.2px}
  .elementor-19889 .elementor-element.elementor-element-fe62c77 .hajs-slick{min-height:205px}
  .elementor-19889 .elementor-element.elementor-element-fe62c77 .ha-slick-slide{flex-basis:50%;max-width:50%}
  .elementor-19889 .elementor-element.elementor-element-a980a07{padding:1.5rem 0}
  .elementor-19889 .elementor-element.elementor-element-1ad8c2b .elementor-heading-title{font-size:34px}
}
</style>`;

function cssPathFromHref(href) {
  return String(href || '')
    .replace(/&amp;/g, '&')
    .split('?')[0]
    .trim();
}

function setOrAppendAttr(tag, name, value) {
  const attrRe = new RegExp(`\\s${name}(?:=(?:"[^"]*"|'[^']*'|[^\\s"'=<>]+))?`, 'i');
  const attr = ` ${name}="${value}"`;
  if (attrRe.test(tag)) return tag.replace(attrRe, attr);
  return tag.replace(/\s*\/?>$/, (end) => `${attr}${end}`);
}

function removeAttr(tag, name) {
  const attrRe = new RegExp(`\\s${name}(?:=(?:"[^"]*"|'[^']*'|[^\\s"'=<>]+))?`, 'ig');
  return tag.replace(attrRe, '');
}

function deferHomepageStylesheetTag(tag) {
  const hrefMatch = tag.match(/\shref=(["'])(.*?)\1/i);
  if (!hrefMatch || !HOME_DEFERRED_CSS_PATHS.has(cssPathFromHref(hrefMatch[2]))) return tag;
  if (/data-connectstaff-home-deferred-css=/i.test(tag)) return tag;

  let deferred = setOrAppendAttr(tag, 'media', 'print');
  deferred = setOrAppendAttr(deferred, 'onload', "this.onload=null;this.media='all'");
  deferred = setOrAppendAttr(deferred, 'data-connectstaff-home-deferred-css', '1');

  let fallback = removeAttr(tag, 'onload');
  fallback = removeAttr(fallback, 'data-connectstaff-home-deferred-css');
  fallback = setOrAppendAttr(fallback, 'media', 'all');
  return `${deferred}<noscript>${fallback}</noscript>`;
}

function insertBeforeHeadClose(html, fragment) {
  if (!fragment || html.includes(fragment)) return html;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fragment}\n</head>`) : `${fragment}\n${html}`;
}

function applyHomepagePerformanceCanary(html) {
  if (html.includes(HOME_PERF_MARK)) return html;
  let next = html.replace(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>/gi, deferHomepageStylesheetTag);
  const preloadFragment = HOME_STAFF_PRELOADS.filter((tag) => {
    const href = tag.match(/\shref="([^"]+)"/i)?.[1];
    return href && !next.includes(`href="${href}"`);
  }).join('\n');
  next = insertBeforeHeadClose(next, preloadFragment);
  next = insertBeforeHeadClose(next, HOME_CRITICAL_CSS);
  return next.replace(/<html\b/i, `<html ${HOME_PERF_MARK}`);
}

/** @param {string} slug */
export function serveLegacyPage(slug) {
  const cleanedPath = join(process.cwd(), 'src/legacy', `${slug}.cleaned.html`);

  if (!existsSync(cleanedPath)) {
    // Public visitors must get a real 404 — never 503 or internal prepare:page hints.
    console.warn(`[legacy-page] Missing prepared HTML for "${slug}" → 404`);
    return notFoundResponse();
  }

  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = absolutizeMirrorSeoHtml(injectRuntimeGtmLoader(applySharedChrome(raw, slug)), {
    siteOrigin: SITE_ORIGIN,
    path,
  });

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  html = sanitizeMirrorHtml(html);
  if (slug === 'homepage') {
    html = applyHomepagePerformanceCanary(html);
  }
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
