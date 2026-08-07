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

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.evolutionmiddleast.com')
  .trim()
  .replace(/\/$/, '');

/** Resolve migrated relative SEO URLs to the canonical production origin. */
function absolutizeSeoUrls(html) {
  const absolute = (value) => {
    try {
      return new URL(value, `${SITE_ORIGIN}/`).href;
    } catch {
      return value;
    }
  };

  return html
    .replace(/(<link\s+rel="canonical"\s+href=")([^"]+)("[^>]*>)/i, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    )
    .replace(/(<meta\s+property="og:url"\s+content=")([^"]+)("[^>]*>)/i, (_, before, value, after) =>
      `${before}${absolute(value)}${after}`,
    );
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
  const html = absolutizeSeoUrls(injectRuntimeGtmLoader(applySharedChrome(raw, slug)));

  html = sanitizeMirrorHtml(html);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
