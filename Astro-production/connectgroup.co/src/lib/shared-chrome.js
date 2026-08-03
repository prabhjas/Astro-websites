/**
 * Shared Elementor chrome fragments.
 * Header: live IberiaEOR template 27130 (+ CSS) — matches connectgroup.co marketing chrome.
 * Footer: template 28308 / #pix-page-footer.
 * Used by serveLegacyPage injection and Header/Footer.astro.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const HEADER_PATH = join(ROOT, 'src/legacy/chrome/header.html');
const HEADER_CSS_PATH = join(ROOT, 'src/legacy/chrome/header.css');
const FOOTER_PATH = join(ROOT, 'src/legacy/chrome/footer.html');

/** Home keeps its own chrome; blog/archives never call serveLegacyPage. */
export const SHARED_CHROME_EXCLUDED_SLUGS = new Set(['homepage']);

const HEADER_CSS_HREF = '/chrome/header.css';
const HEADER_CSS_MARK = 'data-cg-shared-header-css';
const MOBILE_NAV_CSS_HREF = '/chrome/mobile-nav.css';
const MOBILE_NAV_CSS_MARK = 'data-cg-mobile-nav-css';
const MOBILE_NAV_JS_HREF = '/js/cg-mobile-nav.js';

/** Stylesheets required by Services / Our Brands mega menus (Elementor nested tabs). */
const MEGA_MENU_CSS_DEPS = [
  {
    mark: 'data-cg-nested-tabs-css',
    id: 'widget-nested-tabs-css',
    href: '/wp-content/plugins/elementor/assets/css/widget-nested-tabs.min.css?ver=4.1.5',
    detect: 'widget-nested-tabs.min.css',
  },
  {
    mark: 'data-cg-image-box-css',
    id: 'widget-image-box-css',
    href: '/wp-content/plugins/elementor/assets/css/widget-image-box.min.css?ver=4.1.5',
    detect: 'widget-image-box.min.css',
  },
];

/** @type {{ mtimeMs: number, html: string } | null} */
let cachedHeader = null;
/** @type {{ mtimeMs: number, html: string } | null} */
let cachedFooter = null;
/** @type {{ mtimeMs: number, css: string } | null} */
let cachedHeaderCss = null;

function fileMtimeMs(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return -1;
  }
}

/** Clear in-memory chrome cache (use after editing header/footer files). */
export function clearSharedChromeCache() {
  cachedHeader = null;
  cachedFooter = null;
  cachedHeaderCss = null;
}

/**
 * Normalize chrome fragment: strip accidental <html>/<body> wrappers from cheerio.
 * @param {string} html
 */
function normalizeHeaderFragment(html) {
  let out = html.trim();
  const start = out.search(/<header\b[^>]*\belementor-location-header\b[^>]*>/i);
  const end = out.toLowerCase().lastIndexOf('</header>');
  if (start >= 0 && end > start) {
    out = out.slice(start, end + '</header>'.length).trim();
  }
  return out;
}

export function getSharedHeaderHtml() {
  const mtimeMs = fileMtimeMs(HEADER_PATH);
  if (cachedHeader == null || cachedHeader.mtimeMs !== mtimeMs) {
    if (!existsSync(HEADER_PATH)) {
      throw new Error(`Shared header missing: ${HEADER_PATH}`);
    }
    cachedHeader = {
      mtimeMs,
      html: normalizeHeaderFragment(readFileSync(HEADER_PATH, 'utf8')),
    };
  }
  return cachedHeader.html;
}

export function getSharedFooterHtml() {
  const mtimeMs = fileMtimeMs(FOOTER_PATH);
  if (cachedFooter == null || cachedFooter.mtimeMs !== mtimeMs) {
    if (!existsSync(FOOTER_PATH)) {
      throw new Error(`Shared footer missing: ${FOOTER_PATH}`);
    }
    cachedFooter = { mtimeMs, html: readFileSync(FOOTER_PATH, 'utf8').trim() };
  }
  return cachedFooter.html;
}

/**
 * Remove the footer CTA / Contact Form 7 block (inner section d5fdd9c).
 * Used on Contact Us so the page form is not duplicated in the footer.
 * @param {string} footerHtml
 */
export function stripFooterContactForm(footerHtml) {
  const marker = 'elementor-element-d5fdd9c';
  const markerAt = footerHtml.indexOf(marker);
  if (markerAt < 0) {
    // Fallback: drop the CF7 shortcode widget only
    const formAt = footerHtml.indexOf('wpcf7-f27092');
    if (formAt < 0) return footerHtml;
    const widgetAt = footerHtml.lastIndexOf('elementor-element-8cde095', formAt);
    if (widgetAt < 0) return footerHtml;
    const divStart = footerHtml.lastIndexOf('<div', widgetAt);
    return replaceBalancedTag(footerHtml, divStart, 'div', '');
  }
  const sectionStart = footerHtml.lastIndexOf('<section', markerAt);
  if (sectionStart < 0) return footerHtml;
  return replaceBalancedTag(footerHtml, sectionStart, 'section', '');
}

export function getSharedHeaderCss() {
  const mtimeMs = fileMtimeMs(HEADER_CSS_PATH);
  if (cachedHeaderCss == null || cachedHeaderCss.mtimeMs !== mtimeMs) {
    if (!existsSync(HEADER_CSS_PATH)) {
      cachedHeaderCss = { mtimeMs, css: '' };
    } else {
      cachedHeaderCss = { mtimeMs, css: readFileSync(HEADER_CSS_PATH, 'utf8') };
    }
  }
  return cachedHeaderCss.css;
}

/**
 * Replace the first balanced HTML element that starts at `openStart`.
 * Handles nested tags with the same name (e.g. footer inside footer).
 * @param {string} html
 * @param {number} openStart index of '<'
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
      const closeLen = closeMatch ? closeMatch[0].length : closeTagLen(tagName);
      i = closeAt + closeLen;
      if (depth === 0) {
        const end = openStart + i;
        return html.slice(0, openStart) + replacement + html.slice(end);
      }
    }
  }
  return html;
}

function closeTagLen(tagName) {
  return `</${tagName}>`.length;
}

/**
 * Ensure shared header CSS, mega-menu Elementor deps, and mobile nav assets are in the document.
 * Insights/archive pages often omit widget-nested-tabs.css (homepage has it),
 * which collapses Services into horizontal unreadable tabs.
 * @param {string} html
 */
function ensureHeaderCss(html) {
  let out = html;
  const links = [];

  if (!out.includes(HEADER_CSS_MARK) && !out.includes(HEADER_CSS_HREF)) {
    links.push(`<link rel="stylesheet" href="${HEADER_CSS_HREF}" ${HEADER_CSS_MARK}="1" />`);
  }
  for (const dep of MEGA_MENU_CSS_DEPS) {
    if (out.includes(dep.mark) || out.includes(dep.detect) || out.includes(`id="${dep.id}"`)) {
      continue;
    }
    links.push(
      `<link rel="stylesheet" id="${dep.id}" href="${dep.href}" media="all" ${dep.mark}="1" />`,
    );
  }
  if (!out.includes(MOBILE_NAV_CSS_MARK) && !out.includes(MOBILE_NAV_CSS_HREF)) {
    links.push(`<link rel="stylesheet" href="${MOBILE_NAV_CSS_HREF}" ${MOBILE_NAV_CSS_MARK}="1" />`);
  }

  if (links.length) {
    const block = links.join('\n');
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${block}\n</head>`);
    } else {
      out = block + out;
    }
  }

  if (!out.includes(MOBILE_NAV_JS_HREF)) {
    const script = `<script src="${MOBILE_NAV_JS_HREF}" defer></script>`;
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `${script}\n</body>`);
    } else {
      out += script;
    }
  }

  return out;
}

/**
 * Extract the Services mega-menu <li> (#mega-menu-item-35463) from shared header HTML.
 * @param {string} headerHtml
 * @returns {string}
 */
export function getSharedServicesMegaLi(headerHtml = getSharedHeaderHtml()) {
  const marker = 'mega-menu-item-35463';
  const markerAt = headerHtml.indexOf(marker);
  if (markerAt < 0) return '';
  const liStart = headerHtml.lastIndexOf('<li', markerAt);
  if (liStart < 0) return '';
  return extractBalancedTag(headerHtml, liStart, 'li');
}

/**
 * Return the outer HTML of the balanced tag starting at openStart, or ''.
 * @param {string} html
 * @param {number} openStart
 * @param {string} tagName
 */
function extractBalancedTag(html, openStart, tagName) {
  const openRe = new RegExp(`<${tagName}\\b`, 'i');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'i');
  const fromOpen = html.slice(openStart);
  if (!openRe.test(fromOpen.slice(0, tagName.length + 2)) && fromOpen.search(openRe) !== 0) {
    return '';
  }
  const firstTagEnd = fromOpen.indexOf('>');
  if (firstTagEnd < 0) return '';

  let depth = 1;
  let i = firstTagEnd + 1;
  while (i < fromOpen.length && depth > 0) {
    const nextOpen = fromOpen.slice(i).search(openRe);
    const nextClose = fromOpen.slice(i).search(closeRe);
    if (nextClose < 0) return '';

    const openAt = nextOpen < 0 ? Infinity : i + nextOpen;
    const closeAt = i + nextClose;

    if (openAt < closeAt) {
      depth += 1;
      const gt = fromOpen.indexOf('>', openAt);
      i = gt < 0 ? fromOpen.length : gt + 1;
    } else {
      depth -= 1;
      const closeMatch = fromOpen.slice(closeAt).match(closeRe);
      const closeLen = closeMatch ? closeMatch[0].length : closeTagLen(tagName);
      i = closeAt + closeLen;
      if (depth === 0) {
        return fromOpen.slice(0, i);
      }
    }
  }
  return '';
}

/**
 * Homepage keeps its own header shell, but Services must match About Us
 * (Elementor 35149 mega #mega-menu-item-35463 instead of old flyout #31469).
 * @param {string} html
 */
export function applyHomepageServicesMega(html) {
  if (html.includes('mega-menu-item-35463') && !html.includes('mega-menu-item-31469')) {
    return ensureHeaderCss(html);
  }

  const servicesLi = getSharedServicesMegaLi();
  if (!servicesLi) return ensureHeaderCss(html);

  let out = html;
  const idPatterns = ['id="mega-menu-item-31469"', "id='mega-menu-item-31469'"];
  let oldAt = -1;
  for (const pat of idPatterns) {
    oldAt = out.indexOf(pat);
    if (oldAt >= 0) break;
  }
  // Fallback: class token on the actual menu item (avoid CSS selectors like #mega-menu-item-31469)
  if (oldAt < 0) {
    const classAt = out.search(/class="[^"]*mega-menu-item-31469[^"]*"/i);
    oldAt = classAt >= 0 ? classAt : -1;
  }
  if (oldAt >= 0) {
    const liStart = out.lastIndexOf('<li', oldAt);
    if (liStart >= 0) {
      out = replaceBalancedTag(out, liStart, 'li', servicesLi);
    }
  }

  // Homepage inline scripts still target the old Services id — retarget them.
  // Only rewrite remaining 31469 references (CSS/JS); the injected mega already uses 35463.
  if (out.includes('mega-menu-item-31469') || out.includes('menu-item-31469')) {
    out = out
      .replaceAll('mega-menu-item-31469', 'mega-menu-item-35463')
      .replaceAll('menu-item-31469', 'menu-item-35463');
  }

  return ensureHeaderCss(out);
}

/**
 * Inject shared header/footer into a cleaned legacy HTML document.
 * Homepage keeps its own chrome but gets the About Us Services mega-menu.
 * @param {string} html
 * @param {string} slug
 */
export function applySharedChrome(html, slug) {
  if (SHARED_CHROME_EXCLUDED_SLUGS.has(slug)) {
    if (slug === 'homepage') return applyHomepageServicesMega(html);
    return html;
  }

  const headerHtml = getSharedHeaderHtml();
  let footerHtml;
  // Contact Us already has its own form — hide the shared footer CF7 block.
  if (slug === 'contact-us') {
    footerHtml = stripFooterContactForm(getSharedFooterHtml());
  } else {
    footerHtml = getSharedFooterHtml();
  }
  let out = ensureHeaderCss(html);

  const headerOpen = out.search(/<header\b[^>]*\belementor-location-header\b[^>]*>/i);
  if (headerOpen >= 0) {
    out = replaceBalancedTag(out, headerOpen, 'header', headerHtml);
  }

  const footerId = out.search(/<footer\b[^>]*\bid=["']pix-page-footer["'][^>]*>/i);
  const footerClass = footerId >= 0 ? footerId : out.search(/<footer\b[^>]*\bpix-page-footer\b[^>]*>/i);
  if (footerClass >= 0) {
    out = replaceBalancedTag(out, footerClass, 'footer', footerHtml);
  }

  return out;
}
