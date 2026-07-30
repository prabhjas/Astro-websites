/**
 * Shared Elementor chrome fragments for Evolution Middle East.
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
function extractBalancedDiv(html, attrSnippet) {
  const idx = html.indexOf(attrSnippet);
  if (idx < 0) return null;
  const start = html.lastIndexOf('<div', idx);
  if (start < 0) return null;
  return replaceBalancedTag(html, start, 'div', '\0') === html
    ? null
    : (() => {
        // Use replaceBalancedTag logic via a capture helper
        const openRe = /<div\b/i;
        const closeRe = /<\/div\s*>/i;
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
            const closeLen = closeMatch ? closeMatch[0].length : 6;
            i = closeAt + closeLen;
            if (depth === 0) return fromOpen.slice(0, i);
          }
        }
        return null;
      })();
}

function normalizeChromeFragment(html, attrSnippet) {
  let out = html.trim();
  const extracted = extractBalancedDiv(out, attrSnippet);
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
  if (html.includes(HEADER_CSS_MARK) || html.includes(HEADER_CSS_HREF)) return html;
  const link = `<link rel="stylesheet" href="${HEADER_CSS_HREF}" ${HEADER_CSS_MARK}="1" />`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${link}\n</head>`);
  }
  return link + html;
}

/**
 * @param {string} html
 * @param {string} attrSnippet e.g. data-elementor-type="header"
 * @param {string} replacement
 */
function replaceThemeBuilderRegion(html, attrSnippet, replacement) {
  const idx = html.indexOf(attrSnippet);
  if (idx < 0) return html;
  const start = html.lastIndexOf('<div', idx);
  if (start < 0) return html;
  return replaceBalancedTag(html, start, 'div', replacement);
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
 * Inject shared header/footer into a cleaned legacy HTML document.
 * No-op for excluded slugs (homepage).
 * @param {string} html
 * @param {string} slug
 */
export function applySharedChrome(html, slug) {
  if (SHARED_CHROME_EXCLUDED_SLUGS.has(slug)) return html;

  const headerHtml = markCurrentMenuItem(getSharedHeaderHtml(), slug);
  let footerHtml = getSharedFooterHtml();
  // Contact page already has its own form — strip footer CF7 if present later.
  if (slug === 'contact') {
    footerHtml = stripFooterContactForm(footerHtml);
  }

  let out = ensureHeaderCss(html);
  out = replaceThemeBuilderRegion(out, 'data-elementor-type="header"', headerHtml);
  out = replaceThemeBuilderRegion(out, 'data-elementor-type="footer"', footerHtml);
  return out;
}
