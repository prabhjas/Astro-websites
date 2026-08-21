/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome, injectLicenceSection } from './shared-chrome.js';
import { resolveSiteOrigin } from './seo/site-url.ts';
import { hydrateReviewFormFromQuery } from './review-form-hydrate.js';
import { applyLegacyMirrorHygiene } from './mirror-hygiene.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://izi.ae')
  .trim()
  .replace(/\/$/, '');

/**
 * Remove select2 chrome baked into WP Rocket / live HTML dumps so jQuery select2
 * can initialize once without double containers.
 * @param {string} html
 */
function scrubBakedSelect2(html) {
  let out = html;
  // Outer select2 wrapper ends with: <span class="dropdown-wrapper" ...></span></span>
  out = out.replace(
    /<\/select>\s*<span class="select2 select2-container[\s\S]*?<span class="dropdown-wrapper"[^>]*><\/span><\/span>/gi,
    '</select>',
  );
  out = out.replace(/\sselect2-hidden-accessible/gi, '');
  out = out.replace(/\sdata-select2-id="[^"]*"/gi, '');
  // Restore selects Select2 had hidden (tabindex/aria) so a fresh init can manage them.
  out = out.replace(
    /(<select\b[^>]*\bclass="[^"]*\bselect2\b[^"]*"[^>]*)\stabindex="-1"/gi,
    '$1',
  );
  out = out.replace(
    /(<select\b[^>]*\bclass="[^"]*\bselect2\b[^"]*"[^>]*)\saria-hidden="true"/gi,
    '$1',
  );
  return out;
}

/**
 * Car gallery dumps bake width="1200" height="670" on slick slides. Combined with
 * CSS height:100% inside a 350px box, browsers stretch the image. Live serves
 * these <img> without width/height attrs.
 * @param {string} html
 */
function scrubCarSliderImgAttrs(html) {
  if (!/class="[^"]*\bslider-for\b/i.test(html) && !/class="big-image"/i.test(html)) {
    return html;
  }
  return html
    .replace(
      /(<div class="(?:big-image|thumb-image)(?:-\d)?"[^>]*>\s*<img)\s+width="\d+"\s+height="\d+"/gi,
      '$1',
    )
    .replace(
      /(<div class="(?:big-image|thumb-image)(?:-\d)?"[^>]*>\s*<img)\s+height="\d+"\s+width="\d+"/gi,
      '$1',
    );
}

/**
 * WP dumps sometimes bake jQuery UI's `hasDatepicker` class / empty popup shell.
 * That makes datepicker() skip attachment → calendar never opens.
 * @param {string} html
 */
function scrubBakedDatepicker(html) {
  let out = html;
  out = out.replace(/\s\bhasDatepicker\b/g, '');
  // Empty popup shell left after live capture — jQuery UI creates its own.
  out = out.replace(
    /<div id="ui-datepicker-div"[^>]*>\s*<\/div>\s*/gi,
    '',
  );
  // Prefer local mirrored assets over code.jquery.com CDN.
  out = out.replace(
    /https?:\/\/code\.jquery\.com\/ui\/1\.12\.1\/themes\/base\/jquery-ui\.css/gi,
    '/wp-content/cache/min/1/ui/1.12.1/themes/base/jquery-ui.css',
  );
  out = out.replace(
    /https?:\/\/code\.jquery\.com\/ui\/1\.12\.1\/jquery-ui\.min\.js/gi,
    '/wp-content/cache/min/1/ui/1.12.1/jquery-ui.min.js',
  );
  return out;
}

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
    origin = 'https://izi.ae';
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
 * @param {string} slug
 * @param {{ requestUrl?: string | URL }} [options]
 */
export function serveLegacyPage(slug, options = {}) {
  const cleanedPath = join(process.cwd(), 'src/legacy', `${slug}.cleaned.html`);

  if (!existsSync(cleanedPath)) {
    // Public visitors must get a real 404 — never 503 or internal prepare:page hints.
    console.warn(`[legacy-page] Missing prepared HTML for "${slug}" → 404`);
    return notFoundResponse();
  }

  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = applyLegacyMirrorHygiene(
    injectRuntimeGtmLoader(injectLicenceSection(applySharedChrome(raw, slug))),
    slug,
  );

  // Live WP fills review-form from ?Model=&post-id=&… query (CF7 default:get + car shortcode).
  if (slug === 'review-form' && options.requestUrl) {
    try {
      const reqUrl = new URL(String(options.requestUrl), SITE_ORIGIN || 'http://127.0.0.1');
      html = hydrateReviewFormFromQuery(html, reqUrl.searchParams);
    } catch (err) {
      console.warn('[legacy-page] review-form hydrate failed', err);
    }
  }


  // Blog pagination polish — IZI brand blue (match live / Elementor primary accent).
  if ((slug === 'blog' || slug.startsWith('blog/')) && !html.includes('data-izi-blog-pagination-css')) {
    const css = `<style data-izi-blog-pagination-css="1">
.nav-links.custom.us-nav-style_6,.elementor-pagination{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin:2rem 0 1rem;}
.nav-links.custom.us-nav-style_6 .page-numbers,.elementor-pagination .page-numbers{
  display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:42px;padding:0 12px;
  border-radius:8px;font-weight:600;text-decoration:none;border:1px solid transparent;cursor:pointer;pointer-events:auto!important;z-index:2;position:relative;
}
.nav-links.custom.us-nav-style_6 a.page-numbers,.elementor-pagination a.page-numbers{background:#00ADEF;color:#fff!important;border-color:transparent;}
.nav-links.custom.us-nav-style_6 a.page-numbers:hover,.elementor-pagination a.page-numbers:hover{filter:brightness(0.95);}
.nav-links.custom.us-nav-style_6 span.page-numbers.current,.elementor-pagination span.page-numbers.current{
  background:#fff;color:#1a1a1a!important;border:1px solid #d0d5dd;cursor:default;
}
.nav-links.custom.us-nav-style_6 span.page-numbers.dots,.elementor-pagination span.page-numbers.dots{background:transparent;border:0;min-width:auto;color:#667085;}
.nav-links.custom.us-nav-style_6 a.prev.page-numbers,
.nav-links.custom.us-nav-style_6 a.next.page-numbers,
.elementor-pagination a.prev.page-numbers,
.elementor-pagination a.next.page-numbers{background:#00ADEF;color:#fff!important;}
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
      '<script src="/js/astro-mirror-fixes.js?v=20260810-parity13" defer></script>\n</body>',
    );
  } else {
    // Bust stale broken builds that browsers may have cached.
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?/g,
      '/js/astro-mirror-fixes.js?v=20260810-parity13',
    );
  }

  
  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  html = absolutizeMirrorSeoHtml(html, { siteOrigin: SITE_ORIGIN, path });
  html = sanitizeMirrorHtml(html);

  // WP export sometimes drops type on Speculation Rules JSON → browser executes it as JS
  // ("Unexpected identifier 'Rent'" when brand text appears near broken JSON parses).
  html = html.replace(
    /<script(\s[^>]*)?>\s*(\{\s*"prefetch"[\s\S]*?\})\s*<\/script>/gi,
    '<script type="speculationrules"$1>$2</script>',
  );
  // Never ship peer form CSS into IZI mirrors.
  html = html.replace(/<link[^>]+kinza-form-fix\.css[^>]*>\s*/gi, '');
  // Cloudflare email-decode is edge-only; we ship /js/cf-email-decode.js instead.
  html = html.replace(
    /<script[^>]+\/cdn-cgi\/scripts\/[^"']*email-decode[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    '',
  );
  // Dual-loaded deferred jQuery / plugins race inline `jQuery(document).ready(...)`.
  // Keep jQuery + booking carousel/select plugins synchronous so DOMContentLoaded inits work.
  html = html.replace(
    /<script([^>]*\b(?:jquery|owl\.carousel|owl-carousel|slick\.min|slick-carousel|select2)[^>]*)>/gi,
    (full, attrs) => {
      if (!/\bsrc\s*=/i.test(attrs)) return full;
      const cleaned = attrs.replace(/\sdefer\b/gi, '').replace(/\sasync\b/gi, '');
      return `<script${cleaned}>`;
    },
  );

  // Live WP Rocket snapshots bake Select2 chrome next to <select>. Runtime Select2 then
  // double-inits (broken "Where" / overlapping "Lo" UI). Strip baked chrome once.
  html = scrubBakedSelect2(html);
  // Baked hasDatepicker / empty #ui-datepicker-div blocks calendar attachment.
  html = scrubBakedDatepicker(html);
  // Car hero slider width/height attrs cause stretched gallery images.
  html = scrubCarSliderImgAttrs(html);

  // Peer-site chrome assets hotlinked in WP exports → local public copies.
  html = html
    .replaceAll(
      'https://redo.ae/wp-content/uploads/2024/03/whatsapp-button.png',
      '/wp-content/uploads/izi-local/whatsapp-button.png',
    )
    .replaceAll(
      'https://car.bloggerplex.top/wp-content/uploads/2024/04/car-blur.png',
      '/wp-content/uploads/izi-local/car-blur.png',
    );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
