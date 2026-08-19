/**
 * Runtime + prepare-time hygiene for Royal Visa legacy mirrors.
 */

/** @param {string} html */
export function applyMirrorHygiene(html) {
  let out = html;

  // WP lazy-load plugin marker
  out = out.replace(/\s*\bskip-lazy\b/g, '');

  // Duplicate text logo beside image logo (Astra site-title)
  out = out.replace(/<div class="ast-site-title-wrap">[\s\S]*?<\/div>\s*/gi, '');

  // Visible WP footprint in <head>
  out = out.replace(/<meta\s+name=["']generator["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']https:\/\/api\.w\.org\/["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']EditURI["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']wlwmanifest["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']shortlink["'][^>]*>/gi, '');

  // Duplicate Rank Math og:image fallback (logo) — keep featured image tags only
  out = out.replace(
    /<meta\s+property=["']og:image["']\s+content=["'][^"']*Logo-Royal-Visa[^"']*["'][^>]*>\s*/gi,
    '',
  );
  out = out.replace(
    /<meta\s+property=["']og:image:secure_url["']\s+content=["'][^"']*Logo-Royal-Visa[^"']*["'][^>]*>\s*/gi,
    '',
  );

  // Broken author archive links in related-post widgets (no author slug)
  out = out.replace(/href=["']\/author\/["']/gi, 'href="/author/"');
  out = out.replace(
    /<a([^>]*)\shref=["']\/author\/["']([^>]*)>[\s\S]*?<\/a>/gi,
    (match) => {
      if (/elementor-author-box__name|author-box/.test(match)) return match.replace(/href=["']\/author\/["']/i, 'href="/author/"');
      return match;
    },
  );

  // Lazy-load below-the-fold images (keep hero/logo eager)
  let imgIndex = 0;
  out = out.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    imgIndex += 1;
    if (/loading\s*=/.test(attrs)) return full;
    if (/fetchpriority\s*=\s*["']high["']/i.test(attrs)) return full;
    if (imgIndex <= 2) return full;
    return `<img${attrs} loading="lazy">`;
  });

  if (!out.includes('data-rv-cookie-consent')) {
    out = out.replace(
      /<\/body>/i,
      '<script src="/js/cookie-consent.js" defer data-rv-cookie-consent="1"></script>\n</body>',
    );
  }

  return out;
}

/** @param {string} html @param {string} [slug] */
export function inferMissingImgAlts(html, slug = '') {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogAltMatch = html.match(/property=["']og:image:alt["']\s+content=["']([^"']+)["']/i);
  const fallback = ogAltMatch?.[1] || titleMatch?.[1]?.replace(/\s*[|\-–—].*$/, '').trim() || slug.replace(/-/g, ' ');

  return html.replace(/<img\b([^>]*)\salt=(["'])\2([^>]*)>/gi, (full, before, q, after) => {
    const srcMatch = full.match(/\ssrc=(["'])([^"']+)\1/i);
    const src = srcMatch?.[2] || '';
    let alt = fallback;
    if (/logo|favicon|icon/i.test(src)) alt = 'Royal Visa';
    if (/avatar|author|gravatar/i.test(src)) alt = 'Author photo';
    return `<img${before} alt=${q}${alt}${q}${after}>`;
  });
}
