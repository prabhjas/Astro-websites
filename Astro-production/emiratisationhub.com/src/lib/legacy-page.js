import { sanitizeMirrorHtml } from '@connect/site-cms';
/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://emiratisationhub.com')
  .trim()
  .replace(/\/$/, '');

function promoteLazyImages(html) {
  return html.replace(/<img\b([^>]*)\/?>/gi, (full, attrs) => {
    const lazySrc =
      attrs.match(/\bdata-lazy-src=(['"])(.*?)\1/i) ||
      attrs.match(/(?:^|\s)data-src=(['"])(.*?)\1/i);
    if (!lazySrc) return full;
    let next = String(attrs).replace(/\/\s*$/, '').trimEnd();
    // Replace existing src (including SVG placeholders) with the real lazy src.
    // Use a negative lookbehind to avoid matching inside "data-src=" / "data-lazy-src=".
    if (/(?<![a-z-])src=(['"])/i.test(next)) {
      next = next.replace(/(?<![a-z-])src=(['"])(.*?)\1/i, (_m, q) => `src=${q}${lazySrc[2]}${q}`);
    } else {
      next += ` src="${lazySrc[2]}"`;
    }
    const lazySrcset =
      next.match(/\bdata-lazy-srcset=(['"])(.*?)\1/i) ||
      next.match(/(?:^|\s)data-srcset=(['"])(.*?)\1/i);
    if (lazySrcset) {
      if (/(?<![a-z-])srcset=(['"])/i.test(next)) {
        next = next.replace(/(?<![a-z-])srcset=(['"])(.*?)\1/i, (_m, q) => `srcset=${q}${lazySrcset[2]}${q}`);
      } else {
        next += ` srcset="${lazySrcset[2]}"`;
      }
    }
    next = next
      .replace(/\sdata-lazy-src=(['"]).*?\1/gi, '')
      .replace(/\sdata-src=(['"]).*?\1/gi, '')
      .replace(/\sdata-lazy-srcset=(['"]).*?\1/gi, '')
      .replace(/\sdata-srcset=(['"]).*?\1/gi, '')
      .replace(/\sdata-lazy-sizes=(['"]).*?\1/gi, '')
      .replace(/\bswiper-lazy\b/g, '');
    return `<img ${next.trim()} />`;
  }).replace(/<div class="swiper-lazy-preloader"><\/div>/gi, '');
}

function normalizeLegacyDocumentUrls(html) {
  let out = html
    .replace(/https:\/\/(?:www\.)?emiratisationhub\.com\//g, '/')
    .replace(/http:\/\/(?:www\.)?emiratisationhub\.com\//g, '/')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/');

  // Some migrated 2024/11 banner "png" assets are actually HTML fallback pages.
  // Remap known broken service/about hero files to the valid local banner.
  out = out.replace(
    /\/wp-content\/uploads\/2024\/11\/(?:BG-min|BG-1-min|BG-2-min|about-banner-min)\.png/g,
    '/wp-content/uploads/2024/02/Contact-banner.png',
  );

  // Promote WP Rocket lazy images AND Elementor/Swiper lazy (data-src) so carousels paint.
  out = promoteLazyImages(out);

  // Ensure Elementor eicons (menu dropdown carets, FAQ icons)
  if (!/elementor-icons\.min\.css/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css" />\n</head>',
    );
  }

  // WP Rocket min cache breaks icon webfont paths on the Astro mirror.
  out = out.replace(
    /\/wp-content\/cache\/min\/\d+\/wp-content\/plugins\/elementor\/assets\/lib\/(font-awesome|eicons)\//gi,
    '/wp-content/plugins/elementor/assets/lib/$1/',
  );

  out = out.replace(
    /\/wp-content\/plugins\/elementor\/assets\/lib\/css\/elementor-icons\.min\.css/gi,
    '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
  );

  const iconCss = [
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/regular.min.css',
  ];
  for (const href of iconCss) {
    if (!out.includes(href)) {
      out = out.replace(/<\/head>/i, `<link rel="stylesheet" href="${href}" />\n</head>`);
    }
  }

  // WP Rocket defers CSS behind user-interaction events (data-rocket-async="style").
  // On the Astro mirror the interaction triggers never fire in automation / first-paint,
  // leaving 30+ stylesheets as <link rel="preload"> with no applied CSS.
  // Convert them all to immediate <link rel="stylesheet"> at serve-time.
  out = out.replace(
    /<link([^>]*)\sdata-rocket-async="style"([^>]*)\sas="style"([^>]*)>/g,
    (match, pre, mid, post) => {
      // Remove data-rocket-async, as="style", onload and onerror attrs; set rel=stylesheet
      let attrs = (pre + ' ' + mid + ' ' + post)
        .replace(/\s*data-rocket-async="style"/g, '')
        .replace(/\s*as="style"/g, '')
        .replace(/\s*onload="[^"]*"/g, '')
        .replace(/\s*onerror="[^"]*"/g, '')
        .replace(/\brel=['"]preload['"]/g, 'rel="stylesheet"');
      return `<link${attrs}>`;
    },
  );

  // WP Rocket's bootstrap class hijacks DOMContentLoaded/load/jQuery.ready and waits
  // for user interaction before firing deferred scripts. Remove it entirely so
  // Elementor, Swiper, and other widgets initialize immediately on page load.
  out = out.replace(/<script[^>]*>\s*\(?\(\)\s*=>\s*\{class RocketLazyLoadScripts[\s\S]*?RocketLazyLoadScripts\.run\(\)\s*\}\s*\)?\(\)\s*;?\s*<\/script>/i, '');

  // Convert WP Rocket deferred scripts to real scripts.
  out = out
    .replace(/<script\b([^>]*)\btype=["']rocketlazyloadscript["']([^>]*)>/gi, (_m, pre, post) => {
      let attrs = (pre + post)
        .replace(/\sdata-rocket-src=["']([^"']*)["']/gi, ' src="$1"')
        .replace(/\sdata-rocket-defer\b/gi, ' defer');
      return `<script${attrs}>`;
    });

  // Also handle data-rocket-type (Elementor modules)
  out = out.replace(/\sdata-rocket-type=["']([^"']*)["']/gi, ' type="$1"');

  return out;
}

/** Per-page meta descriptions for key service pages missing them. */
const PAGE_DESCRIPTIONS = {
  'emiratisation': 'Hire Emirati talent with expert Emiratisation solutions in the UAE. Meet workforce requirements, stay compliant, and build a skilled local team with Emiratisation Hub.',
  'about-us': 'Learn about Emiratisation Hub — our mission to support UAE businesses in building a strong national workforce through expert Emiratisation services.',
  'recruitment': 'Top Emiratisation recruitment agency in Dubai. Recruit and hire Emirati nationals for your company with professional recruitment services from Emiratisation Hub.',
  'staff-outsourcing': 'Premium staff outsourcing services in the UAE. Emiratisation Hub helps you find the perfect staff, handle recruitment, and follow Emiratisation guidelines.',
  'blog': 'Read the latest articles on Emiratisation, UAE labour laws, recruitment trends, and workforce management from the experts at Emiratisation Hub.',
  'homepage': 'Emiratisation Hub provides expert Emiratisation solutions, recruitment, and staff outsourcing services in the UAE. Connect with our experts today.',
};

/** Resolve migrated relative SEO URLs to the canonical production origin. */
function absolutizeSeoUrls(html, slug = 'homepage') {
  const fallbackPath = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  const canonicalTarget = `${SITE_ORIGIN}${fallbackPath}`;
  const absolute = (value) => {
    try {
      return new URL(value || fallbackPath, `${SITE_ORIGIN}/`).href;
    } catch {
      return `${SITE_ORIGIN}${fallbackPath}`;
    }
  };

  let out = html
    .replace(/(<meta\s+property="og:url"\s+content=")([^"]+)("[^>]*>)/i, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    );

  // Force canonical to an absolute production URL for the current slug.
  if (/rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /<link\b[^>]*rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${canonicalTarget}" />`,
    );
  } else {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${canonicalTarget}" />\n</head>`);
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

  // Normalize after chrome merge so header/footer srcsets are localized too.
  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = absolutizeSeoUrls(
    injectRuntimeGtmLoader(normalizeLegacyDocumentUrls(applySharedChrome(raw, slug))),
    slug,
  );

  // Enforce per-page meta description (replace if present, insert if absent).
  if (PAGE_DESCRIPTIONS[slug]) {
    if (/<meta[^>]*name=["']description["'][^>]*>/i.test(html)) {
      html = html.replace(
        /<meta[^>]*name=["']description["'][^>]*>/i,
        `<meta name="description" content="${PAGE_DESCRIPTIONS[slug]}" />`,
      );
    } else {
      html = html.replace(/<\/head>/i, `<meta name="description" content="${PAGE_DESCRIPTIONS[slug]}" />\n</head>`);
    }
  }

  // Homepage skips shared chrome — still need form/menu caret CSS.
  if (!html.includes('form-fix.css') && !html.includes('data-eme-form-fix')) {
    const formCss = '<link rel="stylesheet" href="/css/form-fix.css" data-eme-form-fix="1" />';
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `${formCss}\n</head>`)
      : formCss + html;
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
      '<script src="/js/astro-mirror-fixes.js?v=20260819-icons3" defer></script>\n</body>',
    );
  } else if (!html.includes('astro-mirror-fixes.js?v=20260819-icons3')) {
    html = html.replace(/astro-mirror-fixes\.js(?:\?[^"']*)?/g, 'astro-mirror-fixes.js?v=20260819-icons3');
  }

  html = sanitizeMirrorHtml(html);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
