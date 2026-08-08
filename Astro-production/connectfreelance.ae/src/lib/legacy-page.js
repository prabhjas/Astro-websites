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

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://connectfreelance.ae')
  .trim()
  .replace(/\/$/, '');

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
    .replace(/(<link\s+rel="canonical"\s+href=")([^"]+)("[^>]*>)/i, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(/(<meta\s+property="og:url"\s+content=")([^"]+)("[^>]*>)/i, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    );
  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absolute(fallbackPath)}" />\n</head>`);
  }
  return out;
}

function decodeCfEmail(hex) {
  if (!hex || hex.length < 4) return '';
  const key = parseInt(hex.slice(0, 2), 16);
  if (Number.isNaN(key)) return '';
  let out = '';
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
}

/** Decode Cloudflare email protection placeholders in mirrored HTML. */
function decodeProtectedEmailsInHtml(html) {
  let out = html.replace(
    /<span class="__cf_email__" data-cfemail="([^"]+)">[^<]*<\/span>/gi,
    (_, enc) => {
      const mail = decodeCfEmail(enc);
      return mail ? `<span class="__cf_email__">${mail}</span>` : _;
    },
  );
  out = out.replace(
    /<a([^>]*?)href="\/cdn-cgi\/l\/email-protection(?:#([0-9a-f]+))?"([^>]*)class="__cf_email__" data-cfemail="([^"]+)"([^>]*)>[^<]*<\/a>/gi,
    (full, pre, _hash, mid, enc, post) => {
      const mail = decodeCfEmail(enc);
      if (!mail) return full;
      return `<a${pre}href="mailto:${mail}"${mid}${post}>${mail}</a>`;
    },
  );
  out = out.replace(
    /<a([^>]*?)href="\/cdn-cgi\/l\/email-protection#([0-9a-f]+)"([^>]*)>/gi,
    (full, pre, hex, post) => {
      const mail = decodeCfEmail(hex);
      if (!mail) return full;
      return `<a${pre}href="mailto:${mail}"${post}>`;
    },
  );
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

  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = absolutizeSeoUrls(injectRuntimeGtmLoader(applySharedChrome(raw, slug)), slug);

  // Form skin (homepage skips shared chrome — still needs full-width CF7 fields)
  if (!html.includes('data-kinza-form-fix') && !html.includes('/css/kinza-form-fix.css')) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/css/kinza-form-fix.css" data-kinza-form-fix="1" />\n</head>',
    );
  }

  // Site-wide typography / TOC / card polish
  if (!html.includes('cf-site-polish.css')) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/css/cf-site-polish.css" data-cf-site-polish="1" />\n</head>',
    );
  }

  // Insights listing layout (equal-height cards, load more, category filter)
  if (
    (slug === 'insights' || /ecs-load-more-button|elementor-element-0215441/i.test(html)) &&
    !html.includes('cf-insights-layout.css')
  ) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/css/cf-insights-layout.css" data-cf-insights-layout="1" />\n</head>',
    );
  }

  // Decode Cloudflare-obfuscated emails in HTML so meta/authors render without waiting on JS.
  html = decodeProtectedEmailsInHtml(html);

  // CF7 → /api/contact + Ads/UTM capture (also injected at prepare time; keep as runtime safety).
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>',
    );
  }

  // Insights Load More (replaces broken ECS admin-ajax)
  if (/ecs-load-more-button|data-cs-blog-load-more/i.test(html) && !html.includes('blog-load-more.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/blog-load-more.js" defer></script>\n</body>',
    );
  }

  // Elementor Pro TOC fallback when webpack chunk is missing / stuck on spinner
  if (
    /elementor-widget-table-of-contents/i.test(html) &&
    !html.includes('elementor-toc-fallback.js')
  ) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/elementor-toc-fallback.js" defer></script>\n</body>',
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
