// Post-release Cloudflare cache: rely on astro-cloudflare-purge after publish (Aaron auto purge).
import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';
/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';
import { applyMirrorHygiene, inferMissingImgAlts } from './mirror-hygiene.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://royalvisa.ae')
  .trim()
  .replace(/\/$/, '');

/**
 * Live posts prefer Elementor mirrors (`src/legacy/*.cleaned.html`), not blog.ts.
 * Many mirrors ship without og:image — inject committed branded cards when the
 * slug has a JSON blog post (same set as public/og/blog/*.png). Do not
 * existsSync(public/) at runtime — production cwd has no public tree.
 * @param {string} html
 * @param {string} slug
 */
function preferBrandedBlogOg(html, slug) {
  if (!slug || slug === 'homepage' || slug === 'blog') return html;
  const blogJson = join(process.cwd(), 'src/content/blog', `${slug}.json`);
  if (!existsSync(blogJson)) return html;

  const ogImage = `${SITE_ORIGIN}/og/blog/${slug}.png`;
  let out = html;

  const upsert = (pattern, tag) => {
    if (pattern.test(out)) {
      out = out.replace(pattern, tag);
    } else {
      out = out.replace(/<\/head>/i, `${tag}\n</head>`);
    }
  };

  upsert(
    /<meta\s+property=["']og:image["']\s+content=["'][^"']*["'][^>]*>/i,
    `<meta property="og:image" content="${ogImage}" />`,
  );
  upsert(
    /<meta\s+property=["']og:image:secure_url["']\s+content=["'][^"']*["'][^>]*>/i,
    `<meta property="og:image:secure_url" content="${ogImage}" />`,
  );
  upsert(
    /<meta\s+property=["']og:image:width["']\s+content=["'][^"']*["'][^>]*>/i,
    `<meta property="og:image:width" content="1200" />`,
  );
  upsert(
    /<meta\s+property=["']og:image:height["']\s+content=["'][^"']*["'][^>]*>/i,
    `<meta property="og:image:height" content="630" />`,
  );
  upsert(
    /<meta\s+property=["']og:image:type["']\s+content=["'][^"']*["'][^>]*>/i,
    `<meta property="og:image:type" content="image/png" />`,
  );
  upsert(
    /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["'][^>]*>/i,
    `<meta name="twitter:image" content="${ogImage}" />`,
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
  if (!html.includes('astro-mirror-fixes')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/astro-mirror-fixes-v2.js" defer></script>\n</body>',
    );
  }

  html = preferBrandedBlogOg(
    sanitizeMirrorHtml(applyMirrorHygiene(inferMissingImgAlts(html, slug))),
    slug,
  );
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
