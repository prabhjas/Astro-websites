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

const HOME_PERF_MARK = 'data-connectstaff-home-perf="20260818h"';
const HOME_CRITICAL_MARK = 'data-connectstaff-home-critical="20260820d"';
const HOME_DEFERRED_CSS_MARK = 'data-connectstaff-home-deferred-css';
const HOME_HEADER_CSS_HREF = '/chrome/header-v2.css?v=navhash13';
/** Stylesheets required for above-the-fold header — must not be deferred (prevents reload FOUC). */
const HOME_HEADER_STYLESHEET_IDS = new Set([
  'elementor-frontend-css',
  'elementor-post-635-css',
  'elementor-post-24-css',
  'widget-nav-menu-css',
  'widget-image-css',
  'e-sticky-css',
  'elementor-icons-css',
  'ecs-container-layout-css',
  'ecs-mobile-menu-css',
  'ecs-styles-css',
  'elementor-gf-local-inter-css',
  'font-awesome-5-all-css',
  'font-awesome-css',
  'elementor-icons-shared-0-css',
  'elementor-icons-fa-solid-css',
  'elementor-icons-fa-regular-css',
]);
const HOME_STAFF_PRELOADS = [
  '<link rel="preload" as="image" href="/wp-content/uploads/2024/07/staff-1.webp" type="image/webp" fetchpriority="high">',
  '<link rel="preload" as="image" href="/wp-content/uploads/2024/07/staff-2.webp" type="image/webp" fetchpriority="high">',
];

const HOME_CRITICAL_CSS = `<style ${HOME_CRITICAL_MARK}>
html{font-family:Inter,Arial,sans-serif;-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:#101820}
img{max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
header[data-elementor-type="header"]{position:relative;z-index:20;background:#fff}
header[data-elementor-type="header"] .elementor-section{width:100%}
header[data-elementor-type="header"] .elementor-element-571634e7{display:none!important}
header[data-elementor-type="header"] .elementor-section-boxed>.elementor-container{display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:12px 16px}
header[data-elementor-type="header"] section.bg_r{width:100%!important;max-width:100%!important;margin-top:0!important;background:linear-gradient(90deg,#04C2CD 0%,#4D47F3 43.75%,#7D2AE7 100%)!important}
header[data-elementor-type="header"] section.bg_r>.elementor-container{display:flex;align-items:center;max-width:1200px;width:100%;margin:0 auto!important;padding:8px 16px!important;background:transparent!important}
header[data-elementor-type="header"] section.bg_r .elementor-button{display:inline-flex!important;align-items:center!important;font-size:12px!important;line-height:1.2!important;padding:0!important}
header[data-elementor-type="header"] section.bg_r .elementor-button-content-wrapper{display:inline-flex!important;align-items:center!important;flex-direction:row!important;gap:6px!important}
header[data-elementor-type="header"] section.bg_r .elementor-button-icon{display:inline-flex!important;align-items:center!important;line-height:0!important}
header[data-elementor-type="header"] section.bg_r .elementor-button-icon svg{display:block;width:14px;height:14px}
header[data-elementor-type="header"] section.bg_r .elementor-button-text{display:inline-flex;align-items:center;line-height:1.2!important}
header[data-elementor-type="header"] section.bg_r .elementor-widget-button{width:auto!important;max-width:none!important}
header[data-elementor-type="header"] .elementor-element-59cc52f7.elementor-sticky--active,header[data-elementor-type="header"] .elementor-element-3e632d52.elementor-sticky--active{padding-top:0!important;margin-top:0!important;top:0!important}
header[data-elementor-type="header"] .elementor-widget-wrap{display:flex;align-items:center;gap:20px;width:100%}
header[data-elementor-type="header"] img{display:block;width:auto;max-width:137px;height:auto}
header[data-elementor-type="header"] ul{list-style:none;margin:0;padding:0}
header[data-elementor-type="header"] .elementor-nav-menu{display:flex;align-items:center;gap:18px}
header[data-elementor-type="header"] .elementor-nav-menu--dropdown{display:none}
header[data-elementor-type="header"] .sub-menu{display:none}
header[data-elementor-type="header"] .elementor-item,header[data-elementor-type="header"] .elementor-sub-item{font-size:14px;font-weight:600;color:#101820}
header[data-elementor-type="header"] .elementor-menu-toggle{display:none}
.elementor{box-sizing:border-box}
.elementor *,.elementor :after,.elementor :before{box-sizing:border-box}
.elementor-section{position:relative}
.elementor-19889 .elementor-section .elementor-container{display:flex;position:relative;margin-left:auto;margin-right:auto;max-width:1200px}
.elementor-column{position:relative;display:flex;min-height:1px}
.elementor-col-100{width:100%}
.elementor-col-50{width:50%}
.elementor-widget-wrap{position:relative;display:flex;align-content:flex-start;flex-wrap:wrap;width:100%}
.elementor-widget{position:relative;width:100%}
.elementor-widget-container{transition:background .3s,border .3s,border-radius .3s,box-shadow .3s}
.elementor-col-33{width:33.333%}
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
  .elementor-hidden-tablet{display:none!important}
  header[data-elementor-type="header"] .elementor-nav-menu--main{display:none}
  header[data-elementor-type="header"] .elementor-menu-toggle{display:block;margin-left:auto}
  .elementor-19889 .elementor-element.elementor-element-5234bc3>.elementor-container{min-height:450px}
  .elementor-19889 .elementor-element.elementor-element-fe62c77 .ha-slick-slide{flex-basis:33.333%;max-width:33.333%}
}
@media (min-width:1025px){.elementor-hidden-desktop{display:none!important}}
@media (min-width:768px) and (max-width:1024px){.elementor-hidden-tablet{display:none!important}}
@media (max-width:767px){
  .elementor-hidden-mobile{display:none!important}
  header[data-elementor-type="header"] .elementor-section-boxed>.elementor-container{padding:10px 14px}
  header[data-elementor-type="header"] section.bg_r>.elementor-container{padding:8px 14px!important}
  .elementor-19889 .elementor-section .elementor-container{display:block}
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

function attrValue(tag, name) {
  return tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, 'i'))?.[2] || '';
}

function isHomepageHeaderStylesheet(tag) {
  const id = attrValue(tag, 'id');
  if (id && HOME_HEADER_STYLESHEET_IDS.has(id)) return true;
  const href = attrValue(tag, 'href').toLowerCase();
  if (!href) return false;
  if (href.includes('/elementor/css/post-635.css')) return true;
  if (href.includes('/chrome/header-v2.css') || href.includes('/chrome/header.css')) return true;
  if (href.includes('font-awesome')) return true;
  return false;
}

function deferHomepageStylesheetTag(tag) {
  if (isHomepageHeaderStylesheet(tag)) return tag;
  if (!attrValue(tag, 'href')) return tag;
  if (new RegExp(`${HOME_DEFERRED_CSS_MARK}=`, 'i').test(tag)) return tag;
  if (/data-astro-deferred-css=/i.test(tag)) return tag;

  const media = attrValue(tag, 'media').toLowerCase().replace(/\s+/g, '');
  if (media && media !== 'all') return tag;

  let deferred = setOrAppendAttr(tag, 'media', 'print');
  deferred = setOrAppendAttr(deferred, 'onload', "this.onload=null;this.media='all'");
  deferred = setOrAppendAttr(deferred, HOME_DEFERRED_CSS_MARK, '1');

  let fallback = removeAttr(tag, 'onload');
  fallback = removeAttr(fallback, HOME_DEFERRED_CSS_MARK);
  fallback = setOrAppendAttr(fallback, 'media', 'all');
  return `${deferred}<noscript data-connectstaff-home-css-fallback="1">${fallback}</noscript>`;
}

function protectNoscriptBlocks(html, transform) {
  const blocks = [];
  const withPlaceholders = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, (block) => {
    const index = blocks.push(block) - 1;
    return `%%CONNECTSTAFF_NOSCRIPT_${index}%%`;
  });

  const transformed = transform(withPlaceholders);
  return transformed.replace(/%%CONNECTSTAFF_NOSCRIPT_(\d+)%%/g, (_, rawIndex) => {
    const index = Number(rawIndex);
    return blocks[index] || '';
  });
}

function deferHomepageStylesheets(html) {
  return protectNoscriptBlocks(html, (next) =>
    next.replace(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>/gi, deferHomepageStylesheetTag));
}

function insertBeforeHeadClose(html, fragment) {
  if (!fragment || html.includes(fragment)) return html;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fragment}\n</head>`) : `${fragment}\n${html}`;
}

function applyHomepagePerformanceCanary(html) {
  if (html.includes(HOME_PERF_MARK)) return html;
  let next = deferHomepageStylesheets(html);
  const preloadFragment = HOME_STAFF_PRELOADS.filter((tag) => {
    const href = tag.match(/\shref="([^"]+)"/i)?.[1];
    return href && !next.includes(`href="${href}"`);
  }).join('\n');
  next = insertBeforeHeadClose(next, preloadFragment);
  if (!next.includes(HOME_HEADER_CSS_HREF)) {
    next = insertBeforeHeadClose(
      next,
      `<link rel="stylesheet" href="${HOME_HEADER_CSS_HREF}" data-connectstaff-home-header-css="1" />`,
    );
  }
  next = insertBeforeHeadClose(next, HOME_CRITICAL_CSS);
  return next.replace(/<html\b/i, `<html ${HOME_PERF_MARK}`);
}

function fixBrokenAssetUrls(html) {
  return html.replace(/https?:\/(?!\/)(wp-content|wp-includes)\//gi, '/$1/');
}

function humanizeAltFromSrc(src) {
  const file = (src.split('/').pop() || '').replace(/\.[^.]+$/, '');
  if (/^staff-\d+$/i.test(file)) {
    return 'Connect Staff temporary staffing professional in the UAE';
  }
  if (!file) return 'Connect Staff';
  return file
    .replace(/[-_]+/g, ' ')
    .replace(/\s+\d+$/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function fixEmptyImgAlts(html) {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    const src = attrs.match(/\bsrc=(['"])(.*?)\1/i)?.[2] || '';
    const altMatch = attrs.match(/\balt=(['"])(.*?)\1/i);
    const alt = altMatch?.[2]?.trim() ?? '';
    if (alt) return full;
    const generated = humanizeAltFromSrc(src);
    if (altMatch) {
      return `<img${attrs.replace(/\balt=(['"]).*?\1/i, ` alt="${generated}"`)}>`;
    }
    return `<img${attrs} alt="${generated}">`;
  });
}

function ensureFavicon(html) {
  const liveFavicon = [
    '<link rel="icon" href="/wp-content/uploads/2024/06/favicon-2.ico" sizes="32x32" />',
    '<link rel="icon" href="/wp-content/uploads/2024/06/favicon-2.ico" sizes="192x192" />',
    '<link rel="apple-touch-icon" href="/wp-content/uploads/2024/06/favicon-2.ico" />',
    '<meta name="msapplication-TileImage" content="/wp-content/uploads/2024/06/favicon-2.ico" />',
  ].join('\n');

  let out = html.replace(
    /<link\s+rel="(?:icon|apple-touch-icon|shortcut icon)"\s+href="[^"]*(?:favicon\.svg|\/favicon\.ico)[^"]*"[^>]*>\s*/gi,
    '',
  );
  out = out.replace(
    /<link\s+rel="(?:icon|apple-touch-icon)"\s+href="[^"]*"[^>]*>\s*/gi,
    '',
  );
  out = out.replace(/<meta\s+name="msapplication-TileImage"[^>]*>\s*/gi, '');
  return insertBeforeHeadClose(out, liveFavicon);
}

function stripHtmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHomepageFaqSchema(html) {
  const items = [];
  const itemRe =
    /<div class="elementor-accordion-item">[\s\S]*?<a class="elementor-accordion-title"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="elementor-tab-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  for (const match of html.matchAll(itemRe)) {
    const name = stripHtmlToText(match[1]);
    const text = stripHtmlToText(match[2]);
    if (name && text) {
      items.push({
        '@type': 'Question',
        name,
        acceptedAnswer: { '@type': 'Answer', text },
      });
    }
  }
  if (!items.length) return html;
  if (html.includes('"@type":"FAQPage"') || html.includes('"@type": "FAQPage"')) return html;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items,
  };
  const block = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  return insertBeforeHeadClose(html, block);
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
  html = fixBrokenAssetUrls(html);
  html = fixEmptyImgAlts(html);
  html = sanitizeMirrorHtml(html);
  html = ensureFavicon(html);

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  if (slug === 'homepage') {
    html = buildHomepageFaqSchema(html);
    html = applyHomepagePerformanceCanary(html);
  }
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
