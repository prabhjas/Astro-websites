/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

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

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
