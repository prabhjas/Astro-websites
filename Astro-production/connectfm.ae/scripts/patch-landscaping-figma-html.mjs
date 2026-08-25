/**
 * Patch landscaping page HTML for Figma redesign:
 * - hero badge markup
 * - H1 title
 * - gradient spans in Why / Why choose us headings
 * - why-banner image
 * - sync bodies.json
 */
import fs from 'node:fs';
import * as cheerio from 'cheerio';

const ROOT = process.cwd();
const pagesPath = `${ROOT}/src/data/pages.json`;
const bodiesPath = `${ROOT}/src/data/bodies.json`;

const BADGE_HTML = `<div class="cfm-hero-badge">
  <div class="cfm-hero-badge-rating">
    <img src="/wp-content/uploads/2026/08/landscaping/hero-stars.svg" alt="" width="120" height="24">
    <span>Customer Top Choice 2025</span>
  </div>
  <div class="cfm-hero-avatars">
    <img src="/wp-content/uploads/2026/08/landscaping/avatar-1.png" alt="" width="40" height="40">
    <img src="/wp-content/uploads/2026/08/landscaping/avatar-2.png" alt="" width="40" height="40">
    <img src="/wp-content/uploads/2026/08/landscaping/avatar-3.png" alt="" width="40" height="40">
    <img src="/wp-content/uploads/2026/08/landscaping/avatar-4.png" alt="" width="40" height="40">
  </div>
</div>`;

function patchHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false }, false);

  // Badge
  const $badge = $('.elementor-element-5616656');
  if ($badge.length) {
    const $wrap = $badge.find('.elementor-widget-container').first();
    if ($wrap.length) $wrap.html(BADGE_HTML);
    else $badge.html(`<div class="elementor-widget-container">${BADGE_HTML}</div>`);
  }

  // H1
  const $h1 = $('.elementor-element-d9ce90c h1').first();
  if ($h1.length) $h1.text('Landscaping Services Across the UAE');

  // Why heading with gradient on "Professional Landscaping"
  const $whyH = $('.elementor-element-5037849').first();
  if ($whyH.length) {
    const inner = $whyH.find('.elementor-widget-container').first();
    const target = inner.length ? inner : $whyH;
    // Prefer h2 if present, else replace text content structure
    const $heading = target.find('h2, h3, p').first();
    const markup =
      'Why <span>Professional Landscaping</span> matters?';
    if ($heading.length) $heading.html(markup);
    else target.html(`<h2>${markup}</h2>`);
  }

  // Why choose us gradient on "Landscaping"
  const $whyUs = $('.elementor-element-d7a9614').first();
  if ($whyUs.length) {
    const inner = $whyUs.find('.elementor-widget-container').first();
    const target = inner.length ? inner : $whyUs;
    const $heading = target.find('h2, h3, p').first();
    const markup =
      'Why choose us for <span>Landscaping</span> in the UAE?';
    if ($heading.length) $heading.html(markup);
    else target.html(`<h2>${markup}</h2>`);
  }

  // Why banner — use first image widget, hide duplicate
  const $img1 = $('.elementor-element-d887d2e img').first();
  if ($img1.length) {
    $img1.attr('src', '/wp-content/uploads/2026/08/landscaping/why-banner.jpg');
    $img1.removeAttr('srcset');
    $img1.attr('sizes', '100vw');
  }
  $('.elementor-element-402678f').attr('style', 'display:none!important');

  return $.root().html() || html;
}

const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
const bodies = JSON.parse(fs.readFileSync(bodiesPath, 'utf8'));
const path = '/property-maintenance/landscaping-services/';
const page = pages.find((p) => p.path === path);
if (!page) throw new Error('landscaping page not found');

page.bodyHtml = patchHtml(page.bodyHtml);
if (page.content) page.content = patchHtml(page.content);

const css = '/css/page-design/landscaping-services.css';
if (!Array.isArray(page.pageCss)) page.pageCss = [];
if (!page.pageCss.includes(css)) page.pageCss.push(css);

bodies[path] = page.bodyHtml;

fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2) + '\n');
fs.writeFileSync(bodiesPath, JSON.stringify(bodies, null, 2) + '\n');
console.log('Patched landscaping HTML + pageCss');
