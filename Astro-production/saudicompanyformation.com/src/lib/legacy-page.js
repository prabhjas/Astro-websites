/**
 * Serve a Phase 1 cleaned WordPress HTML mirror from src/legacy/<slug>.cleaned.html
 * Applies shared Header/Footer chrome for all slugs except homepage.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeMirrorHtml, absolutizeMirrorSeoHtml } from '@connect/site-cms';
import { injectRuntimeGtmLoader } from './gtm/inject.ts';
import { notFoundResponse } from './not-found.js';
import { applySharedChrome } from './shared-chrome.js';

const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://saudicompanyformation.com')
  .trim()
  .replace(/\/$/, '');
const LEGACY_DIR = join(process.cwd(), 'src/legacy');

export function normalizeLegacyDocumentUrls(html) {
  return html
    // Live footer logo still points at the old staging host — rewrite to local assets.
    .replace(/https?:\/\/dev\.saudicompanyformation\.com\//gi, '/')
    .replace(/https:\/\/saudicompanyformation\.com\//g, '/')
    .replace(/http:\/\/saudicompanyformation\.com\//g, '/')
    .replace(/https:\/\/www\.saudicompanyformation\.com\//g, '/')
    // Host WhatsApp FAB locally (was hotlinked from redo.ae).
    .replace(/https?:\/\/redo\.ae\/wp-content\/uploads\/2024\/03\/whatsapp-button\.png/gi, '/images/whatsapp-button.png')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/');
}

/**
 * Resolve cleaned HTML on disk. Arabic WP exports were saved with
 * percent-encoded filenames while Astro receives decoded UTF-8 slugs.
 * @param {string} slug
 * @returns {string | null}
 */
export function resolveLegacyCleanedPath(slug) {
  const normalised = String(slug || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
  if (!normalised) {
    const home = join(LEGACY_DIR, 'homepage.cleaned.html');
    return existsSync(home) ? home : null;
  }

  /** @type {Set<string>} */
  const candidates = new Set([normalised]);
  try {
    candidates.add(decodeURIComponent(normalised));
  } catch {
    /* ignore */
  }
  try {
    candidates.add(
      normalised
        .split('/')
        .map((seg) => {
          try {
            return encodeURIComponent(decodeURIComponent(seg));
          } catch {
            return encodeURIComponent(seg);
          }
        })
        .join('/'),
    );
  } catch {
    /* ignore */
  }
  try {
    candidates.add(normalised.split('/').map((seg) => encodeURIComponent(seg)).join('/'));
  } catch {
    /* ignore */
  }

  for (const candidate of candidates) {
    const path = join(LEGACY_DIR, `${candidate}.cleaned.html`);
    if (existsSync(path)) return path;
  }
  return null;
}

/** @param {string} slug */
export function serveLegacyPage(slug) {
  const cleanedPath = resolveLegacyCleanedPath(slug);

  if (!cleanedPath) {
    // Public visitors must get a real 404 — never 503 or internal prepare:page hints.
    console.warn(`[legacy-page] Missing prepared HTML for "${slug}" → 404`);
    return notFoundResponse();
  }

  const raw = normalizeLegacyDocumentUrls(readFileSync(cleanedPath, 'utf-8'));
  const path = !slug || slug === 'homepage' ? '/' : `/${String(slug).replace(/^\/|\/$/g, '')}/`;
  let html = absolutizeMirrorSeoHtml(
    sanitizeMirrorHtml(injectRuntimeGtmLoader(applySharedChrome(raw, slug))),
    {
      siteOrigin: SITE_ORIGIN,
      path,
      defaultOgImage: '/wp-content/uploads/2023/01/new-loco-saudi@4x.png',
    },
  );

  // Cloudflare email protection is not available locally — decode obfuscated addresses.
  if (!html.includes('cf-email-decode.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/cf-email-decode.js" defer></script>\n</body>',
    );
  }

  // CF7 → /api/contact + Ads/UTM capture (also injected at prepare time; keep as runtime safety).
  // Keep a versioned URL so FAQ toggle + chrome fixes ship after cache.
  if (!html.includes('astro-mirror-fixes.js')) {
    html = html.replace(
      /<\/body>/i,
      '<script src="/js/astro-mirror-fixes.js?v=20260810-contact-slash" defer></script>\n</body>',
    );
  } else if (!html.includes('astro-mirror-fixes.js?v=20260810-contact-slash')) {
    html = html.replace(
      /\/js\/astro-mirror-fixes\.js(?:\?[^"']*)?/g,
      '/js/astro-mirror-fixes.js?v=20260810-contact-slash',
    );
  }

  if (!html.includes('data-scf-chrome-fixes') && !html.includes('/css/scf-chrome-fixes.css')) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/css/scf-chrome-fixes.css?v=20260810" data-scf-chrome-fixes="1" />\n</head>',
    );
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0',
    },
  });
}
