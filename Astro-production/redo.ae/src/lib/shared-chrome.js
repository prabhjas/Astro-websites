/**
 * Shared Elementor chrome fragments for Redo.
 * Header/footer are theme-builder divs (data-elementor-type), not <header>/<footer> tags.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const HEADER_PATH = join(ROOT, 'src/legacy/chrome/header.html');
const HEADER_CSS_PATH = join(ROOT, 'src/legacy/chrome/header.css');
const FOOTER_PATH = join(ROOT, 'src/legacy/chrome/footer.html');
const LICENCE_PATH = join(ROOT, 'src/legacy/chrome/licence-section.html');
const LICENCE_CSS_HREF = '/css/redo-licence.css';
const LICENCE_CSS_MARK = 'data-redo-licence-css';

/** Home keeps its own chrome; blog/archives never call serveLegacyPage for shells. */
export const SHARED_CHROME_EXCLUDED_SLUGS = new Set(['homepage']);

const HEADER_CSS_HREF = '/chrome/header.css';
const HEADER_CSS_MARK = 'data-eme-shared-header-css';
const FORM_CSS_HREF = '/css/kinza-form-fix.css';
const FORM_CSS_MARK = 'data-kinza-form-fix';

/** @type {string | null} */
let cachedHeader = null;
/** @type {string | null} */
let cachedFooter = null;
/** @type {string | null} */
let cachedHeaderCss = null;
/** @type {string | null} */
let cachedLicence = null;

export function clearSharedChromeCache() {
  cachedHeader = null;
  cachedFooter = null;
  cachedHeaderCss = null;
  cachedLicence = null;
}

/**
 * @param {string} html
 * @param {string} attrSnippet
 */
function extractBalancedElement(html, attrSnippet) {
  const idx = html.indexOf(attrSnippet);
  if (idx < 0) return null;

  const headerStart = html.lastIndexOf('<header', idx);
  const footerStart = html.lastIndexOf('<footer', idx);
  const divStart = html.lastIndexOf('<div', idx);
  /** @type {{ start: number, tag: string }[]} */
  const candidates = [];
  if (headerStart >= 0 && headerStart < idx) candidates.push({ start: headerStart, tag: 'header' });
  if (footerStart >= 0 && footerStart < idx) candidates.push({ start: footerStart, tag: 'footer' });
  if (divStart >= 0 && divStart < idx) candidates.push({ start: divStart, tag: 'div' });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.start - a.start);
  const { start, tag } = candidates[0];

  const openRe = new RegExp(`<${tag}\\b`, 'i');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
  const fromOpen = html.slice(start);
  const firstTagEnd = fromOpen.indexOf('>');
  if (firstTagEnd < 0) return null;
  let depth = 1;
  let i = firstTagEnd + 1;
  while (i < fromOpen.length && depth > 0) {
    const nextOpen = fromOpen.slice(i).search(openRe);
    const nextClose = fromOpen.slice(i).search(closeRe);
    if (nextClose < 0) return null;
    const openAt = nextOpen < 0 ? Infinity : i + nextOpen;
    const closeAt = i + nextClose;
    if (openAt < closeAt) {
      depth += 1;
      const gt = fromOpen.indexOf('>', openAt);
      i = gt < 0 ? fromOpen.length : gt + 1;
    } else {
      depth -= 1;
      const closeMatch = fromOpen.slice(closeAt).match(closeRe);
      const closeLen = closeMatch ? closeMatch[0].length : `</${tag}>`.length;
      i = closeAt + closeLen;
      if (depth === 0) return fromOpen.slice(0, i);
    }
  }
  return null;
}

function normalizeChromeFragment(html, attrSnippet) {
  let out = html.trim();
  const extracted = extractBalancedElement(out, attrSnippet);
  if (extracted) return extracted.trim();
  return out;
}

export function getSharedHeaderHtml() {
  if (cachedHeader == null) {
    if (!existsSync(HEADER_PATH)) {
      throw new Error(`Shared header missing: ${HEADER_PATH}`);
    }
    cachedHeader = normalizeChromeFragment(
      readFileSync(HEADER_PATH, 'utf8'),
      'data-elementor-type="header"',
    );
  }
  return cachedHeader;
}

export function getSharedFooterHtml() {
  if (cachedFooter == null) {
    if (!existsSync(FOOTER_PATH)) {
      throw new Error(`Shared footer missing: ${FOOTER_PATH}`);
    }
    cachedFooter = normalizeChromeFragment(
      readFileSync(FOOTER_PATH, 'utf8'),
      'data-elementor-type="footer"',
    );
  }
  return cachedFooter;
}

/**
 * Shared Theme Builder header with current-page menu classes for Astro pages.
 * Same HTML fragment Home/Apartment use (data-elementor-id="13").
 * @param {string} slug public path slug, e.g. "office-renovation"
 */
export function getSharedHeaderHtmlForSlug(slug) {
  return markCurrentMenuItem(stripMenuDummyHashHrefs(getSharedHeaderHtml()), slug);
}

/**
 * Stylesheets that style the shared Elementor header (13) + footer (67),
 * matching Home and Apartment Renovation chrome.
 */
export function getSharedChromeStylesheetLinksHtml() {
  const hrefs = [
    '/wp-content/themes/hello-elementor/style.css',
    '/wp-content/cache/min/1/wp-content/themes/hello-elementor/assets/css/theme.css',
    '/wp-content/cache/min/1/wp-content/themes/hello-elementor/assets/css/header-footer.css',
    '/wp-content/cache/min/1/wp-content/themes/hello-elementor-child-theme/style.css',
    '/wp-content/plugins/elementor/assets/css/frontend.min.css',
    '/wp-content/plugins/elementor/assets/css/widget-heading.min.css',
    '/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css',
    '/wp-content/plugins/elementor/assets/css/widget-icon-box.min.css',
    '/wp-content/plugins/elementor/assets/css/widget-image.min.css',
    '/wp-content/plugins/elementor-pro/assets/css/widget-nav-menu.min.css',
    '/wp-content/plugins/elementor-pro/assets/css/widget-mega-menu.min.css',
    '/wp-content/cache/min/1/wp-content/plugins/ele-custom-skin/modules/mobile-menu/assets/css/ecs-mobile-menu.css',
    '/wp-content/cache/min/1/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css',
    '/wp-content/cache/min/1/wp-content/plugins/happy-elementor-addons/assets/fonts/style.min.css',
    '/wp-content/cache/min/1/wp-content/plugins/elementor/assets/lib/font-awesome/css/font-awesome.min.css',
    '/wp-content/uploads/elementor/css/post-6.css',
    '/wp-content/uploads/elementor/css/post-13.css',
    '/wp-content/uploads/elementor/css/post-67.css',
    '/wp-content/cache/min/1/wp-content/uploads/elementor/google-fonts/css/syncopate.css',
    FORM_CSS_HREF,
    HEADER_CSS_HREF,
  ];
  return hrefs
    .map((href) => {
      const marks = [`data-redo-shared-chrome="1"`];
      if (href === FORM_CSS_HREF) marks.push(`${FORM_CSS_MARK}="1"`);
      if (href === HEADER_CSS_HREF) marks.push(`${HEADER_CSS_MARK}="1"`);
      return `<link rel="stylesheet" href="${href}" ${marks.join(' ')} />`;
    })
    .join('\n');
}

/**
 * Elementor + Hello scripts required for shared header mega-menu (e-n-menu)
 * and footer behaviour — same stack Home/Apartment load.
 * @param {{ postId?: number, title?: string }} [opts]
 */
export function getSharedChromeScriptsHtml(opts = {}) {
  const postId = opts.postId ?? 0;
  const title = encodeURIComponent(opts.title ?? 'REDO');
  const config = {
    environmentMode: { edit: false, wpPreview: false, isScriptDebug: false },
    i18n: {},
    is_rtl: false,
    breakpoints: { xs: 0, sm: 480, md: 768, lg: 1025, xl: 1440, xxl: 1600 },
    responsive: {
      breakpoints: {
        mobile: { label: 'Mobile Portrait', value: 767, default_value: 767, direction: 'max', is_enabled: true },
        tablet: { label: 'Tablet Portrait', value: 1024, default_value: 1024, direction: 'max', is_enabled: true },
      },
      hasCustomBreakpoints: false,
    },
    version: '4.1.4',
    is_static: false,
    experimentalFeatures: { 'nested-elements': true, 'mega-menu': true, container: true },
    urls: {
      assets: '/wp-content/plugins/elementor/assets/',
      ajaxurl: '/wp-admin/admin-ajax.php',
      uploadUrl: '/wp-content/uploads',
    },
    nonces: {},
    swiperClass: 'swiper',
    settings: { page: [], editorPreferences: [] },
    kit: {
      active_breakpoints: ['viewport_mobile', 'viewport_tablet'],
      hello_header_logo_type: 'title',
      hello_header_menu_layout: 'horizontal',
    },
    post: { id: postId, title, excerpt: '', featuredImage: false },
  };

  const scripts = [
    '/wp-includes/js/jquery/jquery.min.js',
    '/wp-includes/js/jquery/jquery-migrate.min.js',
    '/wp-content/cache/min/1/wp-content/themes/hello-elementor/assets/js/hello-frontend.js',
    '/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
    '/wp-content/plugins/elementor/assets/js/frontend-modules.min.js',
    '/wp-includes/js/jquery/ui/core.min.js',
    '/wp-content/plugins/elementor/assets/js/frontend.min.js',
    '/wp-content/plugins/elementor-pro/assets/lib/smartmenus/jquery.smartmenus.min.js',
    '/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js',
    '/wp-content/plugins/elementor-pro/assets/js/frontend.min.js',
    '/wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js',
  ];

  const configTag = `<script data-redo-shared-chrome="1">var elementorFrontendConfig = ${JSON.stringify(config)};</script>`;
  const scriptTags = scripts
    .map((src) => `<script src="${src}" data-redo-shared-chrome="1"></script>`)
    .join('\n');
  return `${configTag}\n${scriptTags}`;
}

function getLicenceSectionHtml() {
  if (cachedLicence == null) {
    if (!existsSync(LICENCE_PATH)) return '';
    cachedLicence = readFileSync(LICENCE_PATH, 'utf8').trim();
  }
  return cachedLicence;
}

function ensureLicenceCss(html) {
  if (html.includes(LICENCE_CSS_MARK) || html.includes(LICENCE_CSS_HREF)) return html;
  const link = `<link rel="stylesheet" href="${LICENCE_CSS_HREF}" ${LICENCE_CSS_MARK}="1" />`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${link}\n</head>`) : link + html;
}

/**
 * Insert the Figma LICENSE DETAILS strip above the footer copyright bar.
 * @param {string} html
 */
export function injectLicenceSection(html) {
  const fragment = getLicenceSectionHtml();
  if (!fragment) return html;
  let out = ensureLicenceCss(html);
  // Do not match data-redo-licence-css — that is only the stylesheet tag.
  if (out.includes('class="redo-licence"')) return out;

  const marker = 'elementor-element-6132ce2';
  const markerAt = out.indexOf(marker);
  if (markerAt >= 0) {
    const sectionStart = out.lastIndexOf('<section', markerAt);
    if (sectionStart >= 0) {
      return out.slice(0, sectionStart) + fragment + '\n' + out.slice(sectionStart);
    }
  }

  const footerClose = out.toLowerCase().lastIndexOf('</footer>');
  if (footerClose >= 0) {
    return out.slice(0, footerClose) + fragment + '\n' + out.slice(footerClose);
  }
  return out;
}

/**
 * Evolution footer template has no CF7 block today; keep helper for future parity.
 * @param {string} footerHtml
 */
export function stripFooterContactForm(footerHtml) {
  if (!/wpcf7-form/i.test(footerHtml)) return footerHtml;
  const formAt = footerHtml.search(/wpcf7-form/i);
  if (formAt < 0) return footerHtml;
  // Drop nearest enclosing elementor shortcode widget
  const widgetAt = footerHtml.lastIndexOf('elementor-widget-shortcode', formAt);
  const divStart = footerHtml.lastIndexOf('<div', widgetAt >= 0 ? widgetAt : formAt);
  if (divStart < 0) return footerHtml;
  return replaceBalancedTag(footerHtml, divStart, 'div', '');
}

export function getSharedHeaderCss() {
  if (cachedHeaderCss == null) {
    if (!existsSync(HEADER_CSS_PATH)) {
      cachedHeaderCss = '';
    } else {
      cachedHeaderCss = readFileSync(HEADER_CSS_PATH, 'utf8');
    }
  }
  return cachedHeaderCss;
}

/**
 * @param {string} html
 * @param {number} openStart
 * @param {string} tagName
 * @param {string} replacement
 */
function replaceBalancedTag(html, openStart, tagName, replacement) {
  const openRe = new RegExp(`<${tagName}\\b`, 'i');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'i');
  const selfRe = new RegExp(`^<${tagName}\\b[^>]*/>`, 'i');

  const fromOpen = html.slice(openStart);
  const openMatch = fromOpen.match(openRe);
  if (!openMatch || openMatch.index !== 0) return html;

  const firstTagEnd = fromOpen.indexOf('>');
  if (firstTagEnd < 0) return html;
  const firstTag = fromOpen.slice(0, firstTagEnd + 1);
  if (selfRe.test(firstTag) || /\/>\s*$/.test(firstTag)) {
    return html.slice(0, openStart) + replacement + html.slice(openStart + firstTagEnd + 1);
  }

  let depth = 1;
  let i = firstTagEnd + 1;
  while (i < fromOpen.length && depth > 0) {
    const nextOpen = fromOpen.slice(i).search(openRe);
    const nextClose = fromOpen.slice(i).search(closeRe);
    if (nextClose < 0) return html;

    const openAt = nextOpen < 0 ? Infinity : i + nextOpen;
    const closeAt = i + nextClose;

    if (openAt < closeAt) {
      depth += 1;
      const gt = fromOpen.indexOf('>', openAt);
      i = gt < 0 ? fromOpen.length : gt + 1;
    } else {
      depth -= 1;
      const closeMatch = fromOpen.slice(closeAt).match(closeRe);
      const closeLen = closeMatch ? closeMatch[0].length : `</${tagName}>`.length;
      i = closeAt + closeLen;
      if (depth === 0) {
        const end = openStart + i;
        return html.slice(0, openStart) + replacement + html.slice(end);
      }
    }
  }
  return html;
}

/**
 * @param {string} html
 */
function ensureHeaderCss(html) {
  let out = stripMenuDummyHashHrefs(html);
  if (!out.includes(HEADER_CSS_MARK) && !out.includes(HEADER_CSS_HREF)) {
    const link = `<link rel="stylesheet" href="${HEADER_CSS_HREF}" ${HEADER_CSS_MARK}="1" />`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${link}\n</head>`) : link + out;
  }
  if (!out.includes(FORM_CSS_MARK) && !out.includes(FORM_CSS_HREF)) {
    const link = `<link rel="stylesheet" href="${FORM_CSS_HREF}" ${FORM_CSS_MARK}="1" />`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${link}\n</head>`) : link + out;
  }
  return out;
}

/**
 * @param {string} html
 * @param {string} attrSnippet e.g. data-elementor-type="header"
 * @param {string} replacement
 */
function replaceThemeBuilderRegion(html, attrSnippet, replacement) {
  const idx = html.indexOf(attrSnippet);
  if (idx < 0) return html;

  // Redo uses <header>/<footer>; Evolution used <div>. Find nearest open tag.
  const headerStart = html.lastIndexOf('<header', idx);
  const footerStart = html.lastIndexOf('<footer', idx);
  const divStart = html.lastIndexOf('<div', idx);

  /** @type {{ start: number, tag: string }[]} */
  const candidates = [];
  if (headerStart >= 0 && headerStart < idx) candidates.push({ start: headerStart, tag: 'header' });
  if (footerStart >= 0 && footerStart < idx) candidates.push({ start: footerStart, tag: 'footer' });
  if (divStart >= 0 && divStart < idx) candidates.push({ start: divStart, tag: 'div' });
  if (!candidates.length) return html;

  candidates.sort((a, b) => b.start - a.start);
  const { start, tag } = candidates[0];
  return replaceBalancedTag(html, start, tag, replacement);
}

/**
 * Mark the active menu item for the current page slug (shared header always
 * ships with Home as current from the WP export).
 * @param {string} headerHtml
 * @param {string} slug
 */
function markCurrentMenuItem(headerHtml, slug) {
  const path = slug === 'homepage' ? '/' : `/${slug}/`;
  let out = headerHtml
    .replace(/\s*current-menu-item/g, '')
    .replace(/\s*current_page_item/g, '')
    .replace(/\s*current-menu-ancestor/g, '')
    .replace(/\s*current-menu-parent/g, '')
    .replace(/\s*elementor-item-active/g, '')
    .replace(/\s*aria-current="page"/g, '');

  // Activate any link whose href matches this page (parents + children).
  const hrefRe = new RegExp(
    `(<li\\b[^>]*class=")([^"]*)("[^>]*>\\s*<a\\b[^>]*href="${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*class=")([^"]*)(")`,
    'gi',
  );
  out = out.replace(hrefRe, (_, liOpen, liClass, mid, aClass, aClose) => {
    const nextLi = `${liClass} current-menu-item current_page_item`.replace(/\s+/g, ' ').trim();
    const nextA = `${aClass} elementor-item-active`.replace(/\s+/g, ' ').trim();
    return `${liOpen}${nextLi}${mid}${nextA}${aClose} aria-current="page"`;
  });

  // Also mark parent items that contain the current page as ancestors.
  if (path !== '/') {
    out = out.replace(
      /(<li\b[^>]*class=")([^"]*menu-item-has-children[^"]*)("[^>]*>[\s\S]*?href="[^"]*"[^>]*>[\s\S]*?<\/ul>\s*<\/li>)/gi,
      (block, liOpen, liClass, rest) => {
        if (!rest.includes(`href="${path}"`)) return block;
        if (/\bcurrent-menu-item\b/.test(liClass)) return block;
        const nextLi = `${liClass} current-menu-ancestor current-menu-parent`
          .replace(/\s+/g, ' ')
          .trim();
        return `${liOpen}${nextLi}${rest}`;
      },
    );
  }

  return out;
}

/**
 * Inject shared header into a cleaned legacy HTML document.
 * Footer is left as exported per page — live uses footer 1054 on most
 * templates and 18333 on contact; swapping breaks CSS (post-XXXX.css).
 * No-op for excluded slugs (homepage).
 * @param {string} html
 * @param {string} slug
 */

function stripMenuDummyHashHrefs(html) {
  return html.replace(/<a\b([^>]*)>/gi, (full, attrs) => {
    if (!/\bhref="#"/i.test(attrs)) return full;
    if (/\b(w-nav-control|elementor-button|elementor-icon|mean-expand|w-toplink|modeltheme-trigger|lwptoc_toggle_label)\b/.test(attrs)) {
      return full;
    }
    if (!/\b(elementor-item|elementor-sub-item|elementor-item-anchor|menu-link|w-nav-anchor|mega-menu-link)\b/.test(attrs)) {
      return full;
    }
    const next = attrs.replace(/\s*href="#"/i, '').replace(/\s*\belementor-item-anchor\b/g, '');
    return `<a${next}>`;
  });
}

export function applySharedChrome(html, slug) {
  html = stripMenuDummyHashHrefs(html);
  if (SHARED_CHROME_EXCLUDED_SLUGS.has(slug)) return ensureHeaderCss(html);

  // Prefer each page's exported Theme Builder chrome (matches live HTML).
  // Shared header/footer fragments are only a backfill for broken exports —
  // swapping a healthy header with an older shared copy diverges from live
  // (mega-menu items, CF email hashes, etc.).
  const isCanvas =
    /page-template-elementor_canvas/i.test(html) ||
    /elementor-template-canvas/i.test(html);
  const hasElementorHeader = /data-elementor-type="header"/i.test(html);
  const hasElementorFooter = /data-elementor-type="footer"/i.test(html);
  const hasColophon = /id="colophon"/i.test(html);

  let out = html;

  if (hasElementorHeader) {
    out = ensureHeaderCss(out);
    // Keep the page's own header; only normalize current-menu classes.
    out = replaceThemeBuilderRegion(
      out,
      'data-elementor-type="header"',
      markCurrentMenuItem(
        extractBalancedElement(out, 'data-elementor-type="header"') ||
          getSharedHeaderHtml(),
        slug,
      ),
    );
  }

  // Backfill footer only when header exists but footer is missing (broken export).
  // Canvas / chrome-less LP pages intentionally have neither — leave as-is.
  if (
    !isCanvas &&
    hasElementorHeader &&
    !hasElementorFooter &&
    !hasColophon &&
    existsSync(FOOTER_PATH)
  ) {
    let footerHtml = getSharedFooterHtml();
    if (slug === 'contact' || slug === 'contact-us') {
      footerHtml = stripFooterContactForm(footerHtml);
    }
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `${footerHtml}\n</body>`);
    } else {
      out += footerHtml;
    }
  }

  return out;
}
