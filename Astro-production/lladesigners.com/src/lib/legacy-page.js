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
import { resolveSiteOrigin } from './seo/site-url.ts';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://lladesigners.com')
  .trim()
  .replace(/\/$/, '');

/**
 * prepare-page rewrites absolute origins to root-relative paths for assets.
 * SEO tags must stay absolute https://canonical (fleet go-live checklist §2).
 * @param {string} html
 * @param {string} slug
 */
function absolutizeSeoUrls(html, slug) {
  let origin;
  try {
    origin = resolveSiteOrigin();
  } catch {
    origin = 'https://lladesigners.com';
  }

  const path = slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/+|\/+$/g, '')}/`;
  const absolutePage = `${origin}${path}`;

  let out = html;
  if (/rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
      `<link rel="canonical" href="${absolutePage}" />`,
    );
  } else {
    out = out.replace(/<\/head>/i, `<link rel="canonical" href="${absolutePage}" />\n</head>`);
  }

  if (/og:url/i.test(out)) {
    out = out.replace(
      /<meta\s+[^>]*property=["']og:url["'][^>]*>/gi,
      `<meta property="og:url" content="${absolutePage}" />`,
    );
  }

  // Absolute-ize relative og:image / twitter:image pointing at local uploads.
  out = out.replace(
    /(<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["'])(\/[^"']+)(["'])/gi,
    `$1${origin}$2$3`,
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
  let html = injectRuntimeGtmLoader(applySharedChrome(raw, slug));


  // Impreza blog pagination active/current styling (us-nav-style_6).
  if ((slug === 'blog' || slug.startsWith('blog/')) && !html.includes('data-lladesigners-blog-pagination-css')) {
    const css = `<style data-lladesigners-blog-pagination-css="1">
.nav-links.custom.us-nav-style_6{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin:2rem 0 1rem;}
.nav-links.custom.us-nav-style_6 .page-numbers{
  display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:42px;padding:0 12px;
  border-radius:8px;font-weight:600;text-decoration:none;border:1px solid transparent;cursor:pointer;pointer-events:auto!important;z-index:2;position:relative;
}
.nav-links.custom.us-nav-style_6 a.page-numbers{background:var(--color-content-primary,#00a88e);color:#fff!important;border-color:transparent;}
.nav-links.custom.us-nav-style_6 a.page-numbers:hover{filter:brightness(0.95);}
.nav-links.custom.us-nav-style_6 span.page-numbers.current{
  background:#fff;color:#1a1a1a!important;border:1px solid #d0d5dd;cursor:default;
}
.nav-links.custom.us-nav-style_6 span.page-numbers.dots{background:transparent;border:0;min-width:auto;color:#667085;}
.nav-links.custom.us-nav-style_6 a.prev.page-numbers,
.nav-links.custom.us-nav-style_6 a.next.page-numbers{background:var(--color-content-primary,#00a88e);color:#fff!important;}
</style>`;
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${css}\n</head>`) : css + html;
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
      '<script src="/js/astro-mirror-fixes.js?v=20260810-faq1" defer></script>\n</body>',
    );
  } else {
    // Bust stale broken builds that browsers may have cached.
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?/g,
      '/js/astro-mirror-fixes.js?v=20260810-faq1',
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
