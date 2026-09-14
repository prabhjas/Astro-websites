/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { injectPageBreadcrumbs } from './page-breadcrumbs.js';
import { applySharedChrome } from './shared-chrome.js';
import { injectHomepageLatestBlog } from './blog.ts';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://kpmpro.ae')
  .trim()
  .replace(/\/$/, '');

function normalizeLegacyDocumentUrls(html) {
  return html
    .replace(/https:\/\/kpmpro\.ae\//g, '/')
    .replace(/http:\/\/kpmpro\.ae\//g, '/')
    .replace(/https:\/\/www\.kpmpro\.ae\//g, '/')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/');
}

/**
 * Move FAQPage JSON-LD out of the article body into <head>.
 * Body placement gets swallowed into the last hidden FAQ accordion panel
 * after client enhancement, so Rich Results / schema tools miss FAQ schema.
 */
function hoistFaqPageJsonLd(html) {
  let out = String(html || '');
  const blocks = [];
  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
    if (!/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) return match;
    if (!/"@type"\s*:\s*"FAQPage"/i.test(body)) return match;
    blocks.push(`<script type="application/ld+json">${body.trim()}</script>`);
    return '';
  });
  if (!blocks.length) return html;
  out = out.replace(/<p>\s*<\/p>/gi, '');
  const headEnd = out.search(/<\/head>/i);
  if (headEnd === -1) return html;
  const head = out.slice(0, headEnd);
  const unique = blocks.filter((block) => !head.includes(block));
  if (!unique.length) return out;
  return out.replace(/<\/head>/i, `${unique.join('\n')}\n</head>`);
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

/** @param {string} slug */
export function serveLegacyPage(slug) {
  const cleanedPath = join(process.cwd(), 'src/legacy', `${slug}.cleaned.html`);

  if (!existsSync(cleanedPath)) {
    // Public visitors must get a real 404 — never 503 or internal prepare:page hints.
    console.warn(`[legacy-page] Missing prepared HTML for "${slug}" → 404`);
    return notFoundResponse();
  }

  const raw = normalizeLegacyDocumentUrls(readFileSync(cleanedPath, 'utf-8'));
  let withLatest =
    !slug || slug === 'homepage' ? injectHomepageLatestBlog(raw, 3) : raw;
  let html = absolutizeSeoUrls(
    injectPageBreadcrumbs(injectRuntimeGtmLoader(applySharedChrome(withLatest, slug)), slug),
    slug,
  );

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
      '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>',
    );
  }

  // Unclosed "Prepared for Astro" comments can swallow <meta viewport> and force
  // mobile Chrome into ~980px layout (sidebar form stays on the right).
  html = html.replace(
    /(<!--\s*Prepared for Astro Phase 1[^>]{0,160}?)(<meta|<script|<link)/i,
    (match, comment, next) => (comment.includes('-->') ? match : `${comment} -->\n${next}`),
  );
  if (!/<meta\s[^>]*name=["']viewport["']/i.test(html)) {
    html = html.replace(
      /<head([^>]*)>/i,
      '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  }

  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  html = absolutizeMirrorSeoHtml(html, { siteOrigin: SITE_ORIGIN, path });
  html = sanitizeMirrorHtml(html);
  html = hoistFaqPageJsonLd(html);

    // Force browsers past Cloudflare-cached broken mirror-fixes (no trailing slash).
  html = html.replace(
    /src=("|')\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?\1/g,
    'src=$1/js/astro-mirror-fixes.js?v=mofa-spacing-20260914$1'
  );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
