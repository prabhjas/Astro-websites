/**
 * Shared Elementor chrome fragments for The UAE Gate.
 * Header/footer are theme-builder divs (data-elementor-type), not <header>/<footer> tags.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const HEADER_PATH = join(ROOT, 'src/legacy/chrome/header.html');
const HEADER_CSS_PATH = join(ROOT, 'src/legacy/chrome/header.css');
const FOOTER_PATH = join(ROOT, 'src/legacy/chrome/footer.html');

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

export function clearSharedChromeCache() {
  cachedHeader = null;
  cachedFooter = null;
  cachedHeaderCss = null;
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

  // The UAE Gate uses <header>/<footer>; Evolution used <div>. Find nearest open tag.
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

  // The UAE Gate uses Astra theme chrome (#masthead / #colophon), not Elementor
  // Theme Builder regions. Each cleaned page already includes its own header/
  // footer — only swap when an Elementor header region exists AND we have a
  // shared fragment on disk.
  const hasElementorHeader = /data-elementor-type="header"/i.test(html);
  const hasSharedHeader = existsSync(HEADER_PATH);

  let out = ensureHeaderCss(stripMenuDummyHashHrefs(html));

  if (hasElementorHeader && hasSharedHeader) {
    const headerHtml = markCurrentMenuItem(getSharedHeaderHtml(), slug);
    out = replaceThemeBuilderRegion(out, 'data-elementor-type="header"', headerHtml);
  } else if (hasElementorHeader && !hasSharedHeader) {
    console.warn(`[shared-chrome] Elementor header present but ${HEADER_PATH} missing — leaving page chrome`);
  }

  // Only inject shared footer when the page has none (broken export).
  if (!/data-elementor-type="footer"/i.test(out) && !/id="colophon"/i.test(out) && existsSync(FOOTER_PATH)) {
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
