import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';
/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { isPostSlug } from './inventory.js';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://theuaegate.com')
  .trim()
  .replace(/\/$/, '');

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

  // CF7 → /api/contact + Ads/UTM capture (also injected at prepare time; keep as runtime safety).
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/astro-mirror-fixes.js" defer></script>\n</body>',
    );
  }

  // Category Ajax Filter → Astro CAF API (WP admin-ajax is not available).
  if (html.includes('tc_caf_ajax') || html.includes('caf-post-layout-container')) {
    html = html.replace(
      /var tc_caf_ajax\s*=\s*\{[\s\S]*?\};\s*\n/,
      'var tc_caf_ajax = {"ajax_url":"/api/blog/caf/","nonce":"local","plugin_path":"/wp-content/plugins/category-ajax-filter/"};\n',
    );
  }

  // Insights blog grid (#blog-list) — Impreza-child used WP admin-ajax get_blog_posts.
  if (html.includes('id="blog-list"') || html.includes("id='blog-list'")) {
    html = html.replace(
      /var ajax_object\s*=\s*\{\s*"ajax_url"\s*:\s*"\/wp-admin\/admin-ajax\.php"\s*\}\s*;/g,
      'var ajax_object = {"ajax_url":"/api/blog/listing/"};',
    );
    html = html.replace(
      /<script[^>]*id="custom-blog-listing-script-js"[^>]*><\/script>/i,
      '<!-- WP custom-blog-listing removed -->',
    );
    html = html.replace(
      /<script[^>]*src="[^"]*Impreza-child\/custom-scripts\.js[^"]*"[^>]*><\/script>/i,
      '<!-- WP Impreza-child custom-scripts removed -->',
    );
    if (!html.includes('theuaegate-blog-listing.js')) {
      html = html.replace(
        /<\/body>/i,
        '<script src="/js/theuaegate-blog-listing.js" defer></script>\n</body>',
      );
    }
    if (!html.includes('data-cbc-blog-css')) {
      const css = `<style data-cbc-blog-css="1">
#blog-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:30px;}
@media (max-width:767px){#blog-list{grid-template-columns:1fr;}}
#blog-list .post img{height:267px;width:100%;object-fit:cover;display:block;}
#blog-list .postcategory{font-size:14px;color:#667085;font-weight:500;}
#blog-list .postdate{font-size:14px;color:#667085;}
#blog-list .link a{color:#EB1C24;font-size:18px;}
#blog-list .postlistingwrap h2{margin:0;}
div#categories button.active,div#categories button:hover{background:#f2ae38;color:#fff;border-color:#f2ae38;}
</style>`;
      html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${css}\n</head>`) : css + html;
    }
  }

  // Single posts: related-posts ECS "Load More" relies on WP admin-ajax — remove it.
  // Keep the already-rendered related cards; do not wire law/blog load-more scripts here.
  if (isPostSlug(slug)) {
    html = html.replace(
      /<nav\b[^>]*\becs-load-more-button\b[^>]*>[\s\S]*?<\/nav>/gi,
      '',
    );
  }

  // /law/ Load More → Astro load-more API (ECS admin-ajax is not available).
  if (slug === 'law' && !html.includes('cfs-law-load-more.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cfs-law-load-more.js" defer></script>\n</body>',
    );
  }

  html = sanitizeMirrorHtml(html);

  // Drop Elementor’s “hide bg until lazy” rule for already-prepared mirrors.
  html = html.replace(
    /\.e-con\.e-parent:nth-of-type\(n\+4\):not\(\.e-lazyloaded\):not\(\.e-no-lazyload\)\s*,\s*\.e-con\.e-parent:nth-of-type\(n\+4\):not\(\.e-lazyloaded\):not\(\.e-no-lazyload\)\s*\*\s*\{\s*background-image:\s*none\s*!important;\s*\}/gi,
    '',
  );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
