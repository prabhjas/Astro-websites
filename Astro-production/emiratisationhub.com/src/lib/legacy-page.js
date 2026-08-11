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

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '')
  .trim()
  .replace(/\/$/, '');

function promoteLazyImages(html) {
  return html.replace(/<img\b([^>]*)\/?>/gi, (full, attrs) => {
    const lazySrc =
      attrs.match(/\bdata-lazy-src=(['"])(.*?)\1/i) ||
      attrs.match(/(?:^|\s)data-src=(['"])(.*?)\1/i);
    if (!lazySrc) return full;
    let next = String(attrs).replace(/\/\s*$/, '').trimEnd();
    // Avoid matching the "src=" inside "data-src=" / "data-lazy-src="
    if (/(?:^|\s)src=(['"])/.test(next)) {
      next = next.replace(/(?:^|\s)src=(['"])(.*?)\1/i, (m, q) => `${m.startsWith(' ') ? ' ' : ''}src=${q}${lazySrc[2]}${q}`);
    } else {
      next += ` src="${lazySrc[2]}"`;
    }
    const lazySrcset =
      next.match(/\bdata-lazy-srcset=(['"])(.*?)\1/i) ||
      next.match(/(?:^|\s)data-srcset=(['"])(.*?)\1/i);
    if (lazySrcset) {
      if (/(?:^|\s)srcset=(['"])/.test(next)) {
        next = next.replace(/(?:^|\s)srcset=(['"])(.*?)\1/i, (m, q) => `${m.startsWith(' ') ? ' ' : ''}srcset=${q}${lazySrcset[2]}${q}`);
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

  // Promote WP Rocket lazy images AND Elementor/Swiper lazy (data-src) so carousels paint.
  out = promoteLazyImages(out);

  // Ensure Elementor eicons (menu dropdown carets, FAQ icons)
  if (!/elementor-icons\.min\.css/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css" />\n</head>',
    );
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

  return out;
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

  // Normalize after chrome merge so header/footer srcsets are localized too.
  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = absolutizeSeoUrls(
    injectRuntimeGtmLoader(normalizeLegacyDocumentUrls(applySharedChrome(raw, slug))),
    slug,
  );

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
      '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>',
    );
  }

  html = sanitizeMirrorHtml(html);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
