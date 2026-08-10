/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://snapsale.ae')
  .trim()
  .replace(/\/$/, '');

function normalizeLegacyDocumentUrls(html) {
  return html
    .replace(/https:\/\/snapsale\.ae\//g, '/')
    .replace(/http:\/\/snapsale\.ae\//g, '/')
    .replace(/https:\/\/www\.snapsale\.ae\//g, '/')
    .replace(/http:\/\/www\.snapsale\.ae\//g, '/')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/')
    // Drop WordPress discovery endpoints (not served on Astro).
    .replace(/<link\b[^>]+(?:wp-json|oembed|EditURI|shortlink)[^>]*>\s*/gi, '')
    // Cloudflare email-protection is unavailable locally / on Astro.
    .replace(
      /href=(["'])\/cdn-cgi\/l\/email-protection[^"']*\1/gi,
      'href=$1mailto:contact@snapsale.ae$1',
    )
    .replace(
      /<script\b[^>]*cdn-cgi\/scripts\/[^>]*email-decode[^>]*>\s*<\/script>/gi,
      '',
    );
}

const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/wp-content/uploads/2024/10/Hero-image-Snapsale.webp`;

function ensureOrganizationJsonLd(html) {
  const orgBlock = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Snapsale',
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/wp-content/uploads/2024/10/Logo-Snapsale-Black-2.svg`,
    parentOrganization: {
      '@type': 'Organization',
      name: 'Connect Group',
      url: 'https://connectgroup.co/',
    },
  };
  const script = `<script type="application/ld+json">${JSON.stringify(orgBlock)}</script>`;
  if (/parentOrganization/i.test(html) && /"@type"\s*:\s*"Organization"/i.test(html)) {
    return html;
  }
  // Prefer injecting a dedicated Organization graph even when Rank Math already emitted other nodes.
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${script}\n</head>`);
  }
  return html;
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
    )
    .replace(/(<meta\s+property="og:image"\s+content=")([^"]+)("[^>]*>)/i, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    );
  if (!/rel=["']canonical["']/i.test(out)) {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absolute(fallbackPath)}" />\n</head>`);
  }
  if (!/property=["']og:url["']/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      `<meta property="og:url" content="${absolute(fallbackPath)}" />\n</head>`,
    );
  }
  if (!/property=["']og:image["']/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />\n</head>`,
    );
  }
  return ensureOrganizationJsonLd(out);
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

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
