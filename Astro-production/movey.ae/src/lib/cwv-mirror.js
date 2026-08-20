/**
 * Core Web Vitals hygiene for Phase 1 legacy HTML mirrors (movey.ae).
 * Applied at serve time in legacy-page.js — no full Elementor rebuild required.
 */

const FONT_SUBSET =
  'https://fonts.googleapis.com/css2?family=Anybody:wght@300;400;600;700;800&display=swap';

/** @type {Record<string, string>} */
const LCP_PRELOAD_BY_SLUG = {
  homepage: '/wp-content/uploads/2024/09/Truck-movey.webp',
  'house-movers-in-dubai': '/wp-content/uploads/2024/03/AdobeStock_609972065-transformed-2.png',
};

/**
 * @param {string} html
 * @param {string} slug
 */
export function applyCwvMirrorFixes(html, slug) {
  let out = String(html || '');

  // Subset Google Fonts (mirrors ship full 100–900 ranges from WP Rocket).
  out = out.replace(/https:\/\/fonts\.googleapis\.com\/css[^"'\s>]*/gi, FONT_SUBSET);

  // Drop stale / wrong LCP preloads from WP Rocket; inject the real hero per slug.
  out = out.replace(/<link\b[^>]*\bas=["']image["'][^>]*>/gi, '');
  const lcp = LCP_PRELOAD_BY_SLUG[slug];
  if (lcp) {
    out = out.replace(
      /<\/head>/i,
      `<link rel="preload" as="image" href="${lcp}" fetchpriority="high" />\n</head>`,
    );
  }

  // Header logo is above the fold — never lazy.
  out = out.replace(
    /(<img\b[^>]*src=["']\/wp-content\/uploads\/2023\/08\/Logo-color\.png["'][^>]*)\sloading=["']lazy["']/gi,
    '$1',
  );
  out = out.replace(
    /(<img\b[^>]*)\sloading=["']lazy["']([^>]*src=["']\/wp-content\/uploads\/2023\/08\/Logo-color\.png["'][^>]*>)/gi,
    '$1$2',
  );

  return out;
}
