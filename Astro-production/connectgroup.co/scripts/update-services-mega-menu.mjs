/**
 * Replace old Services flyout in dynamic header with live mega-menu (Elementor 35149).
 * Updates src/legacy/chrome + public/chrome only.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const HEADER_HTML = join(ROOT, 'src/legacy/chrome/header.html');
const HEADER_CSS = join(ROOT, 'src/legacy/chrome/header.css');
const MEGA_SRC = join(ROOT, 'source/wordpress-exports/services-mega-live.html');
const CSS_SRC = join(ROOT, 'source/wordpress-exports/services-mega-35149.css');

const LINK_FIXES = {
  '#|Explore Overview|BUSINESS SETUP': '/business-formation-uae/',
  '#|Explore Overview|GLOBAL WORKFORCE': '/global-workforce-solutions/',
  '#|Explore Overview|VISA SERVICES': '/visa-services/',
  '#|Explore Overview|HR SERVICES': '/hr-services/',
  '#|UAE Offshore': '/dubai-offshore/',
  '/uae-freezone-company-setup/': '/dubai-free-zone/',
  '/uae-mainland-company-setup/': '/dubai-mainland/',
  '/professional-employer-organization-uae': '/professional-employer-organization-uae/',
  '/contractor-hire': '/contractor-hire/',
  '/staff-outsourcing': '/staff-outsourcing/',
  '/freelance-visa': '/freelance-visa/',
};

function normalizeHref(href) {
  if (!href) return href;
  return href.replace(/^https:\/\/connectgroup\.co/, '') || '/';
}

function fixMegaLinks($) {
  $('a[href]').each((_, el) => {
    const $a = $(el);
    let href = normalizeHref($a.attr('href') || '');
    const text = $a.text().replace(/\s+/g, ' ').trim();

    if (href === '#' && text === 'Explore Overview') {
      const panel = $a.closest('[role="tabpanel"]');
      const heading = panel.find('.elementor-heading-title').first().text().replace(/\s+/g, ' ').trim().toUpperCase();
      if (heading.includes('BUSINESS SETUP')) href = '/business-formation-uae/';
      else if (heading.includes('GLOBAL WORKFORCE')) href = '/global-workforce-solutions/';
      else if (heading.includes('VISA')) href = '/visa-services/';
      else if (heading.includes('HR')) href = '/hr-services/';
    }

    if (href === '#' && text === 'UAE Offshore') href = '/dubai-offshore/';

    if (LINK_FIXES[href]) href = LINK_FIXES[href];

    // ensure trailing slash for local paths
    if (href.startsWith('/') && !href.startsWith('//') && !href.includes('?') && !href.includes('#') && !href.endsWith('/')) {
      href = `${href}/`;
    }

    $a.attr('href', href);
  });
}

const megaRaw = readFileSync(MEGA_SRC, 'utf8');
const $mega = cheerio.load(megaRaw, { decodeEntities: false }, false);
// If loaded as fragment, cheerio may wrap — get the li
let megaLi = $mega('li#mega-menu-item-35463');
if (!megaLi.length) megaLi = $mega('li').first();
fixMegaLinks($mega);
const megaHtml = $mega.html(megaLi);

const headerHtml = readFileSync(HEADER_HTML, 'utf8');
const $ = cheerio.load(headerHtml, { decodeEntities: false });

const oldServices = $('#mega-menu-item-31469');
if (!oldServices.length) {
  throw new Error('Old Services menu item #mega-menu-item-31469 not found');
}

if ($('#mega-menu-item-35463').length) {
  $('#mega-menu-item-35463').remove();
}

oldServices.replaceWith(megaHtml);

// Hide legacy Brands flyout duplicate label if present? leave as-is.
// Ensure Brands (31540) stays; Our Brands megamenu stays.

// Cheerio may wrap fragments in <html><body> — keep only the header element.
let outHtml = $.html('header');
if (!outHtml || !outHtml.includes('elementor-location-header')) {
  const serialized = $.root().html() || $.html();
  const start = serialized.search(/<header\b[^>]*\belementor-location-header\b[^>]*>/i);
  const end = serialized.toLowerCase().lastIndexOf('</header>');
  if (start < 0 || end < 0) throw new Error('Failed to serialize header fragment');
  outHtml = serialized.slice(start, end + '</header>'.length);
}
writeFileSync(HEADER_HTML, outHtml.trim() + '\n');

// CSS: append services mega styles if missing
let css = readFileSync(HEADER_CSS, 'utf8');
const marker = '/* === Services mega-menu (Elementor 35149) === */';
if (!css.includes(marker) && !css.includes('.elementor-35149')) {
  const megaCss = readFileSync(CSS_SRC, 'utf8');
  const extra = `
${marker}
/* Hide any leftover old Services flyout if present */
li#mega-menu-item-31469 { display: none !important; }

/* Glass panel positioning for Services mega (from live custom CSS) */
#mega-menu-item-35463 > ul.mega-sub-menu {
  background: transparent !important;
  box-shadow: none !important;
  border: 0 !important;
  padding: 12px 0 0 !important;
}
.service-menu .e-n-tabs-heading {
  padding: 30px 20px !important;
  background: #060d1d99 !important;
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
}
.service-menu .e-n-tab-title[aria-selected="true"],
.service-menu .e-n-tab-title[aria-selected="false"]:hover {
  background: #29389433 !important;
}
.service-menu .e-n-tab-title {
  justify-content: space-between !important;
}
#cd, div#cd {
  background: rgba(6, 13, 29, 0.40) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
div#cd {
  position: relative;
  left: 50%;
  transform: translateX(-41%);
  top: 100%;
}
@media screen and (max-width: 767px) {
  .service-menu .e-n-tabs-heading {
    padding: 20px 10px;
    border-bottom-left-radius: 0;
    border-top-right-radius: 20px;
    margin-bottom: 0;
  }
}
@media screen and (max-width: 992px) {
  div#cd {
    position: unset;
    left: 0;
    transform: translateX(0);
    top: 100%;
  }
}

/* Force Services tab hover/active without requiring data-touch-mode */
.elementor-35149 .elementor-element.elementor-element-caf053b .e-n-tab-title[aria-selected="true"],
.elementor-35149 .elementor-element.elementor-element-caf053b .e-n-tab-title[aria-selected="false"]:hover {
  background: #29389433 !important;
  border-style: solid !important;
  border-width: 1px !important;
  border-color: #D4D7F940 !important;
}

${megaCss}
`;
  css += extra;
  writeFileSync(HEADER_CSS, css);
}

// Sync public chrome copies used by Header.astro fetch
copyFileSync(HEADER_HTML, join(ROOT, 'public/chrome/header.html'));
copyFileSync(HEADER_CSS, join(ROOT, 'public/chrome/header.css'));

console.log('Updated Services mega-menu in dynamic header chrome.');
console.log('Has 35463:', outHtml.includes('mega-menu-item-35463'));
console.log('Has old 31469:', outHtml.includes('mega-menu-item-31469'));
console.log('Has elementor-35149:', outHtml.includes('elementor-35149'));
