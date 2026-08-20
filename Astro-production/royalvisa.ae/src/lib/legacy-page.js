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

  html = sanitizeMirrorHtml(applyMirrorHygiene(inferMissingImgAlts(html, slug)));
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
