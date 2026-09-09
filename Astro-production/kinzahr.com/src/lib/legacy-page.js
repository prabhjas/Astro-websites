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
import { getBlogPost, injectPopularArticlesHtml } from './blog.ts';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://kinzahr.com')
  .trim()
  .replace(/\/$/, '');

/** Paid LPs — always emit noindex,nofollow (HTML meta + X-Robots-Tag). */
const NOINDEX_NOFOLLOW_SLUGS = new Set([
  'best-recruitment-lp',
  'headhunter-lp',
  'recruitment-agency-lp',
]);

/** Force robots meta for selected slugs; returns html + optional response headers. */
function applyNoIndexNoFollow(html, slug) {
  if (!NOINDEX_NOFOLLOW_SLUGS.has(slug)) {
    return { html, headers: {} };
  }
  const robots = 'noindex, nofollow';
  let out = html;
  if (/name=["']robots["']/i.test(out)) {
    out = out.replace(
      /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="robots" content="${robots}" />`,
    );
  } else {
    out = out.replace(/<\/head>/i, `<meta name="robots" content="${robots}" />\n</head>`);
  }
  return { html: out, headers: { 'X-Robots-Tag': robots } };
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
  const noIndex = applyNoIndexNoFollow(html, slug);
  html = noIndex.html;

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  html = sanitizeMirrorHtml(html);

  // Dynamic Popular Articles for blog posts that still use a legacy HTML mirror.
  const post = getBlogPost(slug);
  if (post) {
    html = injectPopularArticlesHtml(html, post);
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
      ...noIndex.headers,
    },
  });
}
