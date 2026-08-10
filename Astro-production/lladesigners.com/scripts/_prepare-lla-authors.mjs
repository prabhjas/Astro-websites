import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { join } from 'node:path';

const ROOT = 'D:/Astro-websites/Astro-production/lladesigners.com';
const indexHtml = readFileSync(join(ROOT, 'scripts/author-index-live.html'), 'utf8');
const singleHtml = readFileSync(join(ROOT, 'scripts/author-lana-live.html'), 'utf8');

// --- Prepare author index cleaned page (full page mirror) ---
function localize(html) {
  return html
    .replaceAll('https://lladesigners.com/', '/')
    .replaceAll('https://www.lladesigners.com/', '/')
    .replaceAll('http://lladesigners.com/', '/')
    .replaceAll('http://www.lladesigners.com/', '/');
}

function stripAnalytics(html) {
  return html
    .replace(/<!--\s*Google Tag Manager\s*\(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*\(noscript\)\s*-->/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(/<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>\s*<\/noscript>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[^>]*>\s*<\/script>/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->\s*/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>\s*/gi, '');
}

let indexOut = stripAnalytics(localize(indexHtml));
if (!indexOut.includes('astro-mirror-fixes.js')) {
  indexOut = indexOut.replace('</body>', '<script src="/js/astro-mirror-fixes.js?v=20260810-qa3" defer></script>\n</body>');
}
writeFileSync(join(ROOT, 'src/legacy/author.cleaned.html'), indexOut);
console.log('Wrote author.cleaned.html', indexOut.length);

// --- Prepare author shell from live single ---
const $ = cheerio.load(localize(singleHtml), { decodeEntities: false });
const archive = $('[data-elementor-type="archive"]').first();
if (!archive.length) throw new Error('no archive');

const sections = archive.children('section');
const profileSection = sections.first();
const postsSection = sections.eq(1);

profileSection.replaceWith(
  `<section class="elementor-section elementor-top-section astro-author-profile-section"><!--ASTRO_AUTHOR:PROFILE--></section>`,
);

// Replace heading
const heading = postsSection.find('h2.elementor-heading-title').first();
if (heading.length) heading.replaceWith('<!--ASTRO_AUTHOR:POSTS_HEADING-->');
else postsSection.prepend('<!--ASTRO_AUTHOR:POSTS_HEADING-->');

// Find posts container - try multiple selectors
let postsHost =
  postsSection.find('.ecs-posts').first().length
    ? postsSection.find('.ecs-posts').first()
    : postsSection.find('.elementor-posts-container').first().length
      ? postsSection.find('.elementor-posts-container').first()
      : postsSection.find('.elementor-loop-container').first().length
        ? postsSection.find('.elementor-loop-container').first()
        : null;

if (!postsHost || !postsHost.length) {
  // Dump structure
  console.log('posts section widgets:');
  postsSection.find('[data-widget_type]').each((i, el) => {
    console.log(i, $(el).attr('data-widget_type'), $(el).attr('data-id'), $(el).attr('class')?.slice(0, 80));
  });
  // Look for any grid of links/images
  const html = postsSection.html() || '';
  writeFileSync(join(ROOT, 'scripts/_posts-section.html'), html);
  console.log('wrote _posts-section.html', html.length);
} else {
  console.log('posts host', postsHost.attr('class'));
  postsHost.empty().append('<!--ASTRO_AUTHOR:POSTS-->');
}

postsSection.find('.ecs-load-more, .e-load-more, [class*="load-more"]').remove();
const pag = postsSection.find('.elementor-pagination').first();
if (pag.length) pag.replaceWith('<!--ASTRO_AUTHOR:PAGINATION-->');
else postsSection.append('<div class="astro-author-pagination"><!--ASTRO_AUTHOR:PAGINATION--></div>');

mkdirSync(join(ROOT, 'src/legacy/author-shell'), { recursive: true });
const shellHtml = stripAnalytics($.html());
writeFileSync(join(ROOT, 'src/legacy/author-shell/template.html'), shellHtml);
console.log('Wrote author-shell/template.html', shellHtml.length);

// Extract first live post card HTML for reference
const $live = cheerio.load(singleHtml);
const livePosts = $live('[data-elementor-type="archive"]');
livePosts.find('[data-widget_type]').each((i, el) => {
  if (i < 15) console.log('live widget', i, $live(el).attr('data-widget_type'), $live(el).attr('data-id'));
});
