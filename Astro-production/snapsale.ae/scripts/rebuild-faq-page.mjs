#!/usr/bin/env node
/**
 * Rebuild /snapsale-faqs/ after Wayback import.
 *
 * Live https://snapsale.ae/snapsale-faqs/ 301s to homepage and deleted Elementor
 * post-312.css — prepare:page then saves homepage HTML into those .css paths.
 * This script:
 *   1) grafts FAQ body into the working about-us chrome/CSS shell
 *   2) stubs/restores corrupted CSS
 *   3) ensures /css/snapsale-faqs.css is linked
 *
 * Usage: node scripts/rebuild-faq-page.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAQ = join(ROOT, 'src/legacy/snapsale-faqs.cleaned.html');
const ABOUT = join(ROOT, 'src/legacy/about-us.cleaned.html');
const FAQ_CSS = join(ROOT, 'public/css/snapsale-faqs.css');

function isHtml(path) {
  if (!existsSync(path)) return true;
  const h = readFileSync(path).toString('utf8', 0, 40).trimStart().toLowerCase();
  return h.startsWith('<!doctype') || h.startsWith('<html');
}

if (!existsSync(ABOUT)) throw new Error('Missing about-us.cleaned.html — import about-us first');
if (!existsSync(FAQ)) throw new Error('Missing snapsale-faqs.cleaned.html — run import-extra-pages first');
if (!existsSync(FAQ_CSS)) throw new Error('Missing public/css/snapsale-faqs.css');

const $about = cheerio.load(readFileSync(ABOUT, 'utf8'), { decodeEntities: false });
const $faq = cheerio.load(readFileSync(FAQ, 'utf8'), { decodeEntities: false });
const faqMain = $faq('[data-elementor-type="wp-page"]').first();
const aboutMain = $about('[data-elementor-type="wp-page"]').first();
if (!faqMain.length || !aboutMain.length) throw new Error('Missing Elementor wp-page region');

aboutMain.replaceWith(faqMain.toString());
$about('title').text('FAQs - Snapsale - Frequently Asked Questions');
$about('meta[name="description"]').attr(
  'content',
  'Find answers to common moving questions — packing, scheduling, specialty items, coverage areas, and booking with Snapsale UAE.',
);
$about('link[rel="canonical"]').attr('href', 'https://snapsale.ae/snapsale-faqs/');
$about('meta[property="og:url"]').attr('content', 'https://snapsale.ae/snapsale-faqs/');
$about('meta[property="og:title"]').attr('content', 'FAQs - Snapsale - Frequently Asked Questions');
$about('body').attr(
  'class',
  ($about('body').attr('class') || '')
    .replace(/page-id-\d+/g, 'page-id-312')
    .replace(/elementor-page-\d+/g, 'elementor-page-312')
    .replace(/postid-\d+/g, 'postid-312'),
);
$about('link[href*="post-3202.css"]').remove();
$about('link[href*="eael-3202.css"]').remove();

const badEnds = [
  'global.css',
  'post-312.css',
  'post-339.css',
  'post-1321.css',
  'ha-312.css',
  'ecs-style.css',
  'wpcf7-redirect-frontend.min.css',
  'widget-theme-elements.min.css',
  'frontend-lite.min.css',
];
$about('link[rel="stylesheet"]').each((_, el) => {
  const href = ($about(el).attr('href') || '').split('?')[0];
  if (badEnds.some((b) => href.endsWith(b))) $about(el).remove();
});

for (const href of [
  '/wp-content/plugins/elementor/assets/css/frontend.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-accordion.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-heading.min.css',
  '/css/snapsale-faqs.css',
]) {
  if (!$about(`link[href^="${href}"]`).length) {
    $about('head').append(`<link rel="stylesheet" href="${href}" />\n`);
  }
}

$about('li').removeClass('current-menu-item current_page_item current-menu-ancestor current-menu-parent');
$about('a').removeClass('elementor-item-active').removeAttr('aria-current');
$about('a[href="/snapsale-faqs/"]').each((_, el) => {
  const $a = $about(el);
  $a.addClass('elementor-item-active').attr('aria-current', 'page');
  $a.closest('li').addClass('current-menu-item current_page_item');
});

writeFileSync(FAQ, `<!DOCTYPE html>\n${$about.html()}`);

// Prefer SVG question icon (live PNG deleted / 301→home)
{
  let html = readFileSync(FAQ, 'utf8');
  html = html
    .replaceAll('/wp-content/uploads/2023/08/question-icon.png', '/wp-content/uploads/2023/08/question-icon.svg')
    .replaceAll('/wp-content/uploads/2023/08/question-icon-150x150.png', '/wp-content/uploads/2023/08/question-icon.svg');
  writeFileSync(FAQ, html);
}

const frontendMin = join(ROOT, 'public/wp-content/plugins/elementor/assets/css/frontend.min.css');
const frontendLite = join(ROOT, 'public/wp-content/plugins/elementor/assets/css/frontend-lite.min.css');
if (existsSync(frontendMin) && !isHtml(frontendMin)) {
  copyFileSync(frontendMin, frontendLite);
}

for (const stub of [
  'public/wp-content/uploads/elementor/css/post-312.css',
  'public/wp-content/uploads/elementor/css/post-339.css',
  'public/wp-content/uploads/elementor/css/post-1321.css',
  'public/wp-content/cache/min/1/wp-content/uploads/happyaddons/css/ha-312.css',
  'public/wp-content/cache/min/1/wp-content/plugins/ele-custom-skin/assets/css/ecs-style.css',
  'public/wp-content/plugins/wpcf7-redirect/build/css/wpcf7-redirect-frontend.min.css',
  'public/wp-content/plugins/elementor-pro/assets/css/frontend-lite.min.css',
  'public/wp-content/plugins/elementor-pro/assets/css/widget-theme-elements.min.css',
  'public/wp-content/uploads/elementor/css/global.css',
]) {
  const abs = join(ROOT, stub);
  if (isHtml(abs)) {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, `/* stub — missing on live; FAQ layout via /css/snapsale-faqs.css */\n`);
  }
}

const distCss = join(ROOT, 'dist/client/css/snapsale-faqs.css');
if (existsSync(join(ROOT, 'dist/client'))) {
  mkdirSync(dirname(distCss), { recursive: true });
  copyFileSync(FAQ_CSS, distCss);
}

console.log('Rebuilt src/legacy/snapsale-faqs.cleaned.html + CSS stubs');
