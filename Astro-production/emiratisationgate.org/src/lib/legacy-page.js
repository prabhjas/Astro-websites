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
    origin = 'https://emiratisationgate.org';
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

/**
 * Wire ECS "Load More" to /api/blog/load-more (WP admin-ajax is unavailable).
 * Author mirrors: /author/<slug>/ → ?author=<slug>
 * @param {string} html
 * @param {string} slug
 */
function decorateEcsLoadMore(html, slug) {
  if (!/ecs-load-more-button/i.test(html)) return html;
  let out = html;

  // Strip ECS WP admin-ajax — conflicts with Astro /api/blog/load-more.
  out = out.replace(
    /<script[^>]*src="[^"]*ecs_ajax_pagination\.js[^"]*"[^>]*><\/script>/gi,
    '<!-- ecs_ajax_pagination removed (Astro /api/blog/load-more) -->',
  );
  out = out.replace(
    /<script[^>]*>\s*var\s+ecs_ajax_params\s*=[\s\S]*?<\/script>/gi,
    '<!-- ecs_ajax_params removed -->',
  );

  let perPage = 9;
  let offset = 9;
  const block = out.match(
    /<div[^>]*class="[^"]*ecs-posts[^"]*elementor-posts-container[^"]*"[\s\S]*?<nav[^>]*class="[^"]*ecs-load-more-button/i,
  );
  if (block) {
    const count = (block[0].match(/<article\b/gi) || []).length;
    if (count > 0) {
      perPage = count;
      offset = count;
    }
  }

  const authorMatch = String(slug || '').match(/^author\/([^/]+)/i);
  const author = authorMatch ? authorMatch[1] : '';
  const authorAttr = author ? ` data-author="${author}"` : '';

  out = out.replace(
    /<nav([^>]*class="[^"]*ecs-load-more-button[^"]*"[^>]*)>/i,
    `<nav$1 data-cs-blog-load-more data-next-page="2" data-per-page="${perPage}" data-offset="${offset}" data-loading-text="Loading..."${authorAttr}>`,
  );
  out = out.replace(
    /(<nav[^>]*ecs-load-more-button[\s\S]*?<a[^>]*href=")[^"]*(")/i,
    '$1javascript:void(0)$2',
  );

  if (!out.includes('blog-load-more.js')) {
    out = out.replace(
      /<\/body>/i,
      `<script src="/js/blog-load-more.js?v=20260806-author1" defer></script>\n</body>`,
    );
  } else {
    out = out.replace(
      /\/js\/blog-load-more\.js(?:\?[^"']*)?/g,
      '/js/blog-load-more.js?v=20260806-author1',
    );
  }

  return out;
}

/**
 * WP nbcpf country-phone double-inits intlTelInput with Astro ensurePhoneCountryFields → orphan flags.
 * Keep CSS/JS assets; strip the inline init so Astro owns dial-code + IP geo.
 * @param {string} html
 */
function neutralizeWpPhoneInit(html) {
  let out = html;
  out = out.replace(
    /<script[^>]*id=["']nbcpf-countryFlag-script-js-after["'][^>]*>[\s\S]*?<\/script>/gi,
    '<!-- nbcpf intlTelInput init removed (Astro ensurePhoneCountryFields) -->',
  );
  // Some prepares emit without id on the after block — catch IP-info init pattern.
  out = out.replace(
    /<script[^>]*>\s*window\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\s*\)\s*\{[\s\S]*?wpcf7-phonetext[\s\S]*?intlTelInput\([\s\S]*?\}\s*\)\s*;?\s*<\/script>/gi,
    '<!-- nbcpf intlTelInput init removed (Astro ensurePhoneCountryFields) -->',
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
  html = absolutizeSeoUrls(html, slug);
  html = neutralizeWpPhoneInit(html);
  html = decorateEcsLoadMore(html, slug);

  // Impreza blog pagination active/current styling (us-nav-style_6).
  if ((slug === 'blog' || slug.startsWith('blog/')) && !html.includes('data-emiratisationgate-blog-pagination-css')) {
    const css = `<style data-emiratisationgate-blog-pagination-css="1">
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
      '<script src="/js/astro-mirror-fixes.js?v=20260806-flag4" defer></script>\n</body>',
    );
  } else {
    // Bust stale broken builds that browsers may have cached.
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?/g,
      '/js/astro-mirror-fixes.js?v=20260806-flag4',
    );
  }

  let siteOrigin;
  try {
    siteOrigin = resolveSiteOrigin();
  } catch {
    siteOrigin = 'https://emiratisationgate.org';
  }
  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  html = absolutizeMirrorSeoHtml(html, { siteOrigin, path });
  html = sanitizeMirrorHtml(html);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
