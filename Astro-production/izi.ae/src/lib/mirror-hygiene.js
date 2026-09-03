/**
 * Runtime hygiene for IZI legacy mirrors (SEO / audit fixes).
 */

/** @param {string} html */
export function promoteLazyImages(html) {
  return html
    .replace(/<img\b([^>]*)\sdata-lazy-src=(['"])([^'"]+)\2([^>]*)>/gi, (_m, pre, q, src, post) => {
      let next = `${pre} src=${q}${src}${q} ${post}`
        .replace(/\sdata-lazy-src=(['"]).*?\1/gi, '')
        .replace(/\sdata-lazy-srcset=(['"]).*?\1/gi, '')
        .replace(/\sdata-lazy-sizes=(['"]).*?\1/gi, '')
        .replace(/\bskip-lazy\b/g, '')
        .replace(/\ssrc=(['"])\s*\1/gi, '');
      if (!/\ssrc\s*=/.test(next)) next = `${pre} src=${q}${src}${q} ${post}`;
      return `<img ${next.trim()} />`;
    })
    .replace(/<img\b([^>]*)\sdata-src=(['"])([^'"]+)\2([^>]*)>/gi, (_m, pre, q, src, post) => {
      const next = `${pre} src=${q}${src}${q} ${post}`.replace(/\sdata-src=(['"]).*?\1/gi, '');
      return `<img ${next.trim()} />`;
    })
    .replace(/<div class="swiper-lazy-preloader"><\/div>/gi, '');
}

/** @param {string} html */
export function normalizeLegacyDocumentUrls(html) {
  let out = html
    .replace(/https:\/\/(?:www\.)?izi\.ae\//g, '/')
    .replace(/http:\/\/(?:www\.)?izi\.ae\//g, '/')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/');

  out = promoteLazyImages(out);

  if (!/elementor-icons\.min\.css/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css" />\n</head>',
    );
  }

  out = out.replace(
    /\/wp-content\/cache\/min\/\d+\/wp-content\/plugins\/elementor\/assets\/lib\/(font-awesome|eicons)\//gi,
    '/wp-content/plugins/elementor/assets/lib/$1/',
  );

  out = out.replace(
    /\/wp-content\/plugins\/elementor\/assets\/lib\/css\/elementor-icons\.min\.css/gi,
    '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
  );

  const iconCss = [
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/regular.min.css',
  ];
  for (const href of iconCss) {
    if (!out.includes(href)) {
      out = out.replace(/<\/head>/i, `<link rel="stylesheet" href="${href}" />\n</head>`);
    }
  }

  out = out.replace(
    /<link([^>]*)\sdata-rocket-async="style"([^>]*)\sas="style"([^>]*)>/g,
    (_match, pre, mid, post) => {
      const attrs = (pre + ' ' + mid + ' ' + post)
        .replace(/\s*data-rocket-async="style"/g, '')
        .replace(/\s*as="style"/g, '')
        .replace(/\s*onload="[^"]*"/g, '')
        .replace(/\s*onerror="[^"]*"/g, '')
        .replace(/\brel=['"]preload['"]/g, 'rel="stylesheet"');
      return `<link${attrs}>`;
    },
  );

  out = out.replace(
    /<script[^>]*>\s*\(?\(\)\s*=>\s*\{class RocketLazyLoadScripts[\s\S]*?RocketLazyLoadScripts\.run\(\)\s*\}\s*\)?\(\)\s*;?\s*<\/script>/i,
    '',
  );

  out = out
    .replace(/<script\b([^>]*)\btype=["']rocketlazyloadscript["']([^>]*)>/gi, (_m, pre, post) => {
      const attrs = (pre + post)
        .replace(/\sdata-rocket-src=["']([^"']*)["']/gi, ' src="$1"')
        .replace(/\sdata-rocket-defer\b/gi, ' defer');
      return `<script${attrs}>`;
    })
    .replace(/\sdata-rocket-type=["']([^"']*)["']/gi, ' type="$1"');

  return out;
}

/** @param {string} html */
export function applyMirrorHygiene(html) {
  let out = html;
  out = out.replace(/\s*\bskip-lazy\b/g, '');
  out = out.replace(/<meta\s+name=["']generator["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']https:\/\/api\.w\.org\/["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']EditURI["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']wlwmanifest["'][^>]*>/gi, '');
  out = out.replace(/<link\s+rel=["']shortlink["'][^>]*>/gi, '');

  // Only add loading="lazy" on real <img> elements — not <img> strings inside <script>.
  const chunks = out.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi);
  let imgIndex = 0;
  out = chunks
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk;
      return chunk.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
        imgIndex += 1;
        if (/loading\s*=/.test(attrs)) return full;
        if (/fetchpriority\s*=\s*["']high["']/i.test(attrs)) return full;
        if (imgIndex <= 2) return full;
        return `<img${attrs} loading="lazy">`;
      });
    })
    .join('');

  return out;
}

/** @param {string} html @param {string} [slug] */
export function inferMissingImgAlts(html, slug = '') {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogAltMatch = html.match(/property=["']og:image:alt["']\s+content=["']([^"']+)["']/i);
  const fallback =
    ogAltMatch?.[1] ||
    titleMatch?.[1]?.replace(/\s*[|\-–—].*$/, '').trim() ||
    slug.replace(/[/\\-]/g, ' ').trim() ||
    'IZI Rent a Car';

  return html.replace(/<img\b([^>]*)\salt=(["'])\2([^>]*)>/gi, (full, before, q, after) => {
    const srcMatch = full.match(/\ssrc=(["'])([^"']+)\1/i);
    const src = srcMatch?.[2] || '';
    let alt = fallback;
    if (/logo|favicon|izi/i.test(src)) alt = 'IZI Rent a Car';
    if (/whatsapp/i.test(src)) alt = 'WhatsApp';
    if (/avatar|author|gravatar/i.test(src)) alt = 'Author photo';
    const makeMatch = src.match(/\/([A-Za-z]+)-logo/i);
    if (makeMatch) alt = makeMatch[1];
    return `<img${before} alt=${q}${alt}${q}${after}>`;
  });
}

/** @param {string} html @param {string} slug */
export function ensureCarDetailH1(html, slug) {
  if (!slug.startsWith('car/')) return html;
  if (/<h1\b/i.test(html)) return html;

  let out = html.replace(
    /(<div class="ct1-flex">\s*)<h2(\b[^>]*)>([\s\S]*?)<\/h2>/i,
    '$1<h1$2 class="astro-car-title">$3</h1>',
  );

  if (!out.includes('data-izi-car-h1-css')) {
    const css = `<style data-izi-car-h1-css="1">.content-c1 .ct1-flex h1.astro-car-title{font-size:28px;font-weight:700;line-height:1.2;margin:0 0 12px;color:#1a1a1a;}</style>`;
    out = out.replace(/<\/head>/i, `${css}\n</head>`);
  }

  return out;
}

/** @param {string} html @param {string} slug */
export function ensureReviewFormH1(html, slug) {
  if (slug !== 'review-form') return html;
  if (/<h1\b/i.test(html)) return html;

  const h1 =
    '<h1 class="elementor-heading-title elementor-size-default astro-page-title">Car Rental Review</h1>';
  return html.replace(
    /(<div class="elementor-widget-container">\s*)<h2 class="elementor-heading-title elementor-size-default">Fill the following Information<\/h2>/i,
    `$1${h1}\n\t\t\t\t\t<h2 class="elementor-heading-title elementor-size-default">Fill the following Information</h2>`,
  );
}

/** @param {string} html @param {string} slug */
export function ensureSinglePrimaryH1(html, slug) {
  if (
    slug === 'blog' ||
    slug.startsWith('blog/') ||
    slug.startsWith('car/') ||
    slug === 'review-form'
  ) {
    return html;
  }

  let count = 0;
  return html.replace(/<h1(\b[^>]*)>([\s\S]*?)<\/h1>/gi, (full, attrs, inner) => {
    count += 1;
    if (count === 1) return full;
    return `<h2${attrs}>${inner}</h2>`;
  });
}

/** Blog index — one page H1, card titles as H2. */
export function fixBlogArchiveHeadings(html) {
  let out = html.replace(
    /<h1(\b(?![^>]*astro-archive-heading)[^>]*class="[^"]*elementor-heading-title[^"]*"[^>]*)>([\s\S]*?)<\/h1>/gi,
    '<h2$1>$2</h2>',
  );

  if (!/<h1\b[^>]*astro-archive-heading/i.test(out)) {
    out = out.replace(
      /(<div class="ecs-posts\b)/i,
      '<h1 class="astro-archive-heading elementor-heading-title elementor-size-default">Informative Blogs from IZI Rent a Car</h1>\n\t\t\t\t\t$1',
    );
  }

  return out;
}

/** @param {string} html */
export function stripSeoEmptyHashLinks(html) {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs) => {
    if (/skip-link|screen-reader-text/.test(attrs)) return tag;
    if (!/\bhref\s*=\s*(["'])(?:#|\1)\1/.test(attrs)) return tag;

    let next = attrs.replace(/\s*href\s*=\s*(["'])(?:#|\1)\1/, '');
    if (!/\brole\s*=/.test(next)) next += ' role="button"';
    if (!/\btabindex\s*=/.test(next)) next += ' tabindex="0"';
    next = next.replace(/\s*\belementor-item-anchor\b/g, '');
    return '<a' + next + '>';
  });
}

/** @param {string} html @param {string} slug */
export function applyLegacyMirrorHygiene(html, slug) {
  let out = normalizeLegacyDocumentUrls(html);
  out = applyMirrorHygiene(out);
  out = inferMissingImgAlts(out, slug);
  out = ensureCarDetailH1(out, slug);
  out = ensureReviewFormH1(out, slug);
  out = ensureSinglePrimaryH1(out, slug);
  out = stripSeoEmptyHashLinks(out);
  return out;
}
