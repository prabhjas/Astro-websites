/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://peomiddleast.com')
  .trim()
  .replace(/\/$/, '');

function normalizeLegacyDocumentUrls(html) {
  return html
    .replace(/https:\/\/peomiddleast\.com\//g, '/')
    .replace(/http:\/\/peomiddleast\.com\//g, '/')
    .replace(/https:\/\/www\.peomiddleast\.com\//g, '/')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/');
}

/** Resolve migrated relative SEO URLs to the canonical production origin. */
function absolutizeSeoUrls(html, slug = 'homepage') {
  const fallbackPath = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  const absolute = (value) => {
    try {
      return new URL(value || fallbackPath, `${SITE_ORIGIN}/`).href;
    } catch {
      return `${SITE_ORIGIN}${fallbackPath}`;
    }
  };

  let out = html
    .replace(/(<link\s+rel="canonical"\s+href=")([^"]+)("[^>]*>)/gi, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(/(<meta\s+property="og:url"\s+content=")([^"]+)("[^>]*>)/gi, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    );
  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absolute(fallbackPath)}" />\n</head>`);
  }
  return out;
}

/** @param {string} slug */
export function serveLegacyPage(slug) {
  const cleanedPath = join(process.cwd(), 'src/legacy', `${slug}.cleaned.html`);

  if (!existsSync(cleanedPath)) {
    // Public visitors must get a real 404 — never 503 or internal prepare:page hints.
    console.warn(`[legacy-page] Missing prepared HTML for "${slug}" → 404`);
    return notFoundResponse();
  }

  const raw = normalizeLegacyDocumentUrls(readFileSync(cleanedPath, 'utf-8'));
  let html = absolutizeSeoUrls(injectRuntimeGtmLoader(applySharedChrome(raw, slug)), slug);

  // Sitewide layout overrides (full-bleed stats bands, heroes, FAB stack).
  if (!html.includes('migration-overrides.css')) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/css/migration-overrides.css?v=20260827g" data-peo-migration-overrides="1" />\n</head>',
    );
  }
  // Late inline critical rules (peo-pedia offset + FAB stack only — no hero layout).
  if (!html.includes('data-peo-critical-overrides')) {
    html = html.replace(
      /<\/body>/i,
      `<style data-peo-critical-overrides="1">
.l-section.us_custom_cfb79a8a,.l-section.wpb_row.us_custom_cfb79a8a.height_large{margin-top:5rem!important}
a.w-toplink,a.w-toplink.pos_right,a.w-toplink.active{bottom:20px!important;right:90px!important;left:auto!important;margin:0!important;z-index:9998!important}
a[href*="wa.me"],a[href*="whatsapp"],.joinchat__button,.ht-ctc,.ht-ctc-chat,.whatsapp-float,[class*="whatsapp"],[id*="whatsapp"]{bottom:20px!important;right:20px!important;top:auto!important;z-index:9999!important}
</style>\n</body>`,
    );
  }

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  // CF7 → /api/contact + Ads/UTM capture (also injected at prepare time; keep as runtime safety).
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/astro-mirror-fixes.js?v=20260827e" defer></script>\n</body>',
    );
  } else if (!html.includes('astro-mirror-fixes.js?v=')) {
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?!\?)/g,
      '/js/astro-mirror-fixes.js?v=20260827e',
    );
  }

  if (!html.includes('blog-load-more.js') && /g-loadmore|pagination_ajax|ecs-load-more/i.test(html)) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/scripts/blog-load-more.js" defer></script>\n</body>',
    );
  }

  
  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  html = absolutizeMirrorSeoHtml(html, { siteOrigin: SITE_ORIGIN, path });
  html = sanitizeMirrorHtml(html);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
