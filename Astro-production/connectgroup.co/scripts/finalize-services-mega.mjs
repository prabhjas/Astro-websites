/**
 * Finalize Services mega-menu in dynamic header chrome:
 * - fix placeholder links to local pages
 * - ensure CSS overrides are present
 * - sync public + dist chrome
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const HEADER = join(ROOT, 'src/legacy/chrome/header.html');
const HEADER_CSS = join(ROOT, 'src/legacy/chrome/header.css');

const LINK_BY_LABEL = {
  'UAE Free Zone': '/dubai-free-zone/',
  'UAE Mainland': '/dubai-mainland/',
  'UAE Offshore': '/dubai-offshore/',
  'PRO Services': '/pro-services/',
  'EOR (Employer of Record)': '/employer-of-record/',
  'PEO (Professional Employer Organization)': '/professional-employer-organization-uae/',
  'Contractor Hire': '/contractor-hire/',
  'Remote Workers': '/remote-workers-hire/',
  'Hire Staff Outsourcing': '/staff-outsourcing/',
  'Immigration Service': '/immigration-services-in-uae/',
  'Freelance Visa': '/freelance-visa/',
  'HR Services': '/hr-services/',
  'HR Software': '/hr-payroll-software-uae/',
  'HR Outsourcing': '/hr-outsourcing/',
  'Payroll Outsourcing in Dubai': '/payroll-outsourcing/',
  'GLOBAL WORKFORCE SOLUTIONS': '/global-workforce-solutions/',
  'VISA SERVICES': '/visa-services/',
  'HR SERVICES': '/hr-services/',
  'BUSINESS SETUP': '/business-formation-uae/',
};

const html = readFileSync(HEADER, 'utf8');
const $ = cheerio.load(html, { decodeEntities: false }, false);

// Work on header fragment only
const $header = $('header').length ? $('header') : $.root();

$header.find('#mega-menu-item-35463 a').each((_, el) => {
  const $a = $(el);
  let href = ($a.attr('href') || '').replace(/^https:\/\/connectgroup\.co/, '') || '/';
  const text = $a.text().replace(/\s+/g, ' ').trim();

  if (LINK_BY_LABEL[text]) {
    href = LINK_BY_LABEL[text];
  } else if (text === 'Explore Overview') {
    const panel = $a.closest('[role="tabpanel"]');
    const heading = panel.find('.elementor-heading-title').first().text().replace(/\s+/g, ' ').trim().toUpperCase();
    if (heading.includes('BUSINESS SETUP')) href = '/business-formation-uae/';
    else if (heading.includes('GLOBAL WORKFORCE')) href = '/global-workforce-solutions/';
    else if (heading.includes('VISA')) href = '/visa-services/';
    else if (heading.includes('HR')) href = '/hr-services/';
  }

  if (href.startsWith('/') && !href.endsWith('/') && !href.includes('?') && !href.includes('#')) {
    href += '/';
  }
  $a.attr('href', href);
});

// Serialize header only
let out = $.html('header');
if (!out || !out.includes('elementor-location-header')) {
  const serialized = $.root().html() || $.html();
  const start = serialized.search(/<header\b[^>]*\belementor-location-header\b[^>]*>/i);
  const end = serialized.toLowerCase().lastIndexOf('</header>');
  out = serialized.slice(start, end + '</header>'.length);
}
writeFileSync(HEADER, out.trim() + '\n');

copyFileSync(HEADER, join(ROOT, 'public/chrome/header.html'));
copyFileSync(HEADER, join(ROOT, 'dist/client/chrome/header.html'));
copyFileSync(HEADER_CSS, join(ROOT, 'public/chrome/header.css'));
copyFileSync(HEADER_CSS, join(ROOT, 'dist/client/chrome/header.css'));

// Also patch homepage cleaned HTML if present (homepage excludes shared chrome)
const homeCandidates = [
  join(ROOT, 'dist/client/index.html'),
  join(ROOT, 'source/wordpress-exports/homepage/index-https.cleaned.html'),
  join(ROOT, 'source/wordpress-exports/homepage/index-https.html'),
];

for (const homePath of homeCandidates) {
  if (!existsSync(homePath)) continue;
  let home = readFileSync(homePath, 'utf8');
  if (!home.includes('mega-menu-item-31469') || home.includes('mega-menu-item-35463')) {
    console.log('skip home', homePath);
    continue;
  }
  // Hide old services on homepage via injected style if we can't replace easily
  if (!home.includes('li#mega-menu-item-31469')) {
    home = home.replace(
      '</head>',
      `<style id="astro-hide-old-services">li#mega-menu-item-31469{display:none!important}</style>\n</head>`,
    );
  }
  // Insert new services mega after Home item if possible
  const mega = readFileSync(HEADER, 'utf8');
  const m = mega.match(/<li class="mega-menu-item[^"]*mega-menu-item-35463[\s\S]*?<\/li>(?=<li class="mega-menu-item)/);
  // Too fragile for nested li — use cheerio on home
  const $h = cheerio.load(home, { decodeEntities: false });
  if ($h('#mega-menu-item-35463').length) {
    console.log('home already has 35463', homePath);
    continue;
  }
  const old = $h('#mega-menu-item-31469');
  if (!old.length) {
    console.log('no old services in', homePath);
    continue;
  }
  const $mega = cheerio.load(out, { decodeEntities: false });
  const servicesLi = $mega('#mega-menu-item-35463');
  old.replaceWith($mega.html(servicesLi));
  // Hide duplicate Brands flyout stays; write without html wrapper corruption for full docs
  writeFileSync(homePath, $h.html());
  console.log('updated home', homePath);
}

console.log('done');
console.log('services links sample:');
const $v = cheerio.load(readFileSync(HEADER, 'utf8'), { decodeEntities: false });
$v('#mega-menu-item-35463 a').each((i, el) => {
  const t = $v(el).text().replace(/\s+/g, ' ').trim();
  if (t && i < 20) console.log(t.padEnd(40), '=>', $v(el).attr('href'));
});
