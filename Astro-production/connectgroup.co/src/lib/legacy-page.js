import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';
/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage (Home).
 * Homepage keeps its own chrome shell but receives the shared Services mega-menu.
 * Blog/archives never call this helper, so they keep their own shells.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { applySharedChrome } from './shared-chrome.js';
import { cwvOptimize } from './cwv-optimize.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://connectgroup.co')
  .trim()
  .replace(/\/$/, '');

/** Rank Math ImageObject used on homepage — audit gap: missing og:image meta. */
const DEFAULT_OG_IMAGE = '/wp-content/uploads/2025/09/Frame.png';

/** @param {string} slug */
export function serveLegacyPage(slug) {
  const cleanedPath = join(process.cwd(), 'src/legacy', `${slug}.cleaned.html`);

  if (!existsSync(cleanedPath)) {
    return new Response(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${slug} not prepared</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Page “${slug}” HTML not prepared yet</h1>
  <p>Run this from the project root, then refresh:</p>
  <pre><code>npm run prepare:page -- ${slug} --download</code></pre>
</body>
</html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  const path = !slug || slug === 'homepage' || slug === 'Home' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  const raw = readFileSync(cleanedPath, 'utf-8');
  let html = sanitizeMirrorHtml(
    absolutizeMirrorSeoHtml(injectRuntimeGtmLoader(applySharedChrome(raw, slug)), {
      siteOrigin: SITE_ORIGIN,
      path,
      defaultOgImage: slug === 'homepage' || slug === 'Home' ? DEFAULT_OG_IMAGE : undefined,
    }),
  );
  if (html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?:\?[^"'\s>]*)?/g,
      '/js/astro-mirror-fixes.js?v=20260908sticky1',
    );
  } else {
    html = html.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260908sticky1" defer></script>\n</body>');
  }
  html = cwvOptimize(html, path);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
