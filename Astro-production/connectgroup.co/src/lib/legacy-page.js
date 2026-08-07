import { sanitizeMirrorHtml } from '@connect/site-cms';
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

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://connectgroup.co')
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
