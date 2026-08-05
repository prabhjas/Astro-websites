#!/usr/bin/env node
/**
 * Extract Elementor category archive shell from live WP.
 * Template: Elementor archive 632 (archive_custom skin + loop 545)
 *
 * Usage: node scripts/prepare-category-shell.mjs [url]
 */
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/category-shell');
const ORIGIN = 'https://connectfreelance.ae';
const REF_URL = process.argv[2] || `${ORIGIN}/category/business/`;

const MARKERS = {
  posts: '<!--ASTRO_CATEGORY:POSTS-->',
  pagination: '<!--ASTRO_CATEGORY:PAGINATION-->',
};

function rewriteUrls(html) {
  return html
    .replace(/https?:\/\/(?:www\.)?connectfreelance\.ae(\/[^"'()\s<>]*)/gi, (_, path) =>
      path.replace(/&amp;/g, '&').split('#')[0],
    )
    .replace(/(?<!:)\/\/(?:www\.)?connectfreelance\.ae(\/[^"'()\s<>]*)/gi, (_, path) =>
      path.replace(/&amp;/g, '&').split('#')[0],
    );
}

/** Remove WP-exported GTM / gtag — IDs load from .env via /runtime-gtm.js. */
function stripHardcodedAnalytics(html) {
  return html
    .replace(/<!--\s*Google Tag Manager\s*\(noscript\)\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*\(noscript\)\s*-->/gi, '')
    .replace(/<!--\s*Google Tag Manager\s*-->[\s\S]*?<!--\s*End Google Tag Manager\s*-->/gi, '')
    .replace(/<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>\s*<\/noscript>/gi, '')
    .replace(/<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?googletagmanager\.com\/gtm\.js[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtm\.js[^>]*>\s*<\/script>/gi, '')
    .replace(/<!--\s*Google tag\s*\(gtag\.js\)\s*-->\s*/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>\s*/gi, '')
    .replace(
      /<script[^>]*>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    )
    .replace(
      /<script[^>]*>\s*function gtag\(\)[\s\S]*?gtag\(\s*['"]config['"][\s\S]*?<\/script>\s*/gi,
      '',
    );
}

async function ensureCss() {
  const dest = join(ROOT, 'public/wp-content/uploads/elementor/css/post-632.css');
  const res = await fetch(`${ORIGIN}/wp-content/uploads/elementor/css/post-632.css`, {
    headers: { 'User-Agent': 'ConnectFreelance-Astro/1.0' },
  });
  if (!res.ok) throw new Error(`Failed to fetch post-632.css: ${res.status}`);
  let css = rewriteUrls(await res.text());
  await writeFile(dest, css, 'utf8');
  console.log('✓ post-632.css');
}

async function main() {
  console.log('Fetching category archive:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectFreelanceAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = rewriteUrls(await res.text());

  const $ = cheerio.load(html, { decodeEntities: false });

  const archive = $('[data-elementor-type="archive"][data-elementor-id="632"], .elementor-632[data-elementor-type="archive"]').first();
  if (!archive.length) throw new Error('Elementor archive template 632 not found');

  // Unwrap rocket lazy images in chrome
  $('img[data-lazy-src]').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('data-lazy-src');
    if (src) $img.attr('src', src);
    const srcset = $img.attr('data-lazy-srcset');
    if (srcset) $img.attr('srcset', srcset);
    $img.removeAttr('data-lazy-src').removeAttr('data-lazy-srcset').removeAttr('data-lazy-sizes');
  });

  const postsContainer = $('.elementor-element-4d56765 .ecs-posts, .ecs-posts.elementor-posts-container').first();
  if (!postsContainer.length) throw new Error('Category ECS posts container not found');
  postsContainer.empty().append(MARKERS.posts);
  console.log('✓ posts marker');

  // Replace pagination with marker (keep nav wrapper if present)
  const pag = $('.elementor-element-4d56765 .elementor-pagination, .elementor-632 .elementor-pagination').first();
  if (pag.length) {
    pag.replaceWith(`<nav class="elementor-pagination astro-category-pagination" role="navigation" aria-label="Pagination">${MARKERS.pagination}</nav>`);
    console.log('✓ pagination marker (replaced)');
  } else {
    postsContainer.after(
      `<nav class="elementor-pagination astro-category-pagination" role="navigation" aria-label="Pagination">${MARKERS.pagination}</nav>`,
    );
    console.log('✓ pagination marker (appended)');
  }

  // Neutralize category-specific body classes so any category can reuse the shell
  $('body').attr('class', (i, cls) => {
    let next = String(cls || '')
      .replace(/\bcategory-[a-z0-9-]+\b/gi, '')
      .replace(/\bcategory-\d+\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!/\barchive\b/.test(next)) next = `archive ${next}`;
    if (!/\bcategory\b/.test(next)) next = next.replace(/\barchive\b/, 'archive category');
    return `${next} astro-category-archive`.replace(/\s+/g, ' ').trim();
  });

  // Drop WP admin bar / rocket blockers
  $('#wpadminbar').remove();
  $('html').removeClass('admin-bar');
  $('script[type="rocketlazyloadscript"], script[type="text/rocketlazyloadscript"]').each((_, el) => {
    const $s = $(el);
    const rocketSrc = $s.attr('data-rocket-src');
    if (rocketSrc && !$s.attr('src')) $s.attr('src', rocketSrc);
    $s.removeAttr('type').removeAttr('data-rocket-src').removeAttr('data-rocket-defer');
  });

  if (!$('link[href*="post-632.css"]').length) {
    $('head').append('<link rel="stylesheet" href="/wp-content/uploads/elementor/css/post-632.css" />');
  }
  if (!$('link[href*="post-545.css"]').length) {
    $('head').append('<link rel="stylesheet" href="/wp-content/uploads/elementor/css/post-545.css" />');
  }
  if (!$('link[href*="cf-category-layout.css"]').length) {
    $('head').append('<link rel="stylesheet" href="/css/cf-category-layout.css" data-cf-category-layout="1" />');
  }
  if (!$('script[src*="astro-mirror-fixes.js"]').length) {
    $('body').append('<script src="/js/astro-mirror-fixes.js" defer></script>');
  }

  // Placeholder title/meta — assembled at serve time
  $('title').text('<!--ASTRO_CATEGORY:DOC_TITLE-->');

  const shellHtml = stripHardcodedAnalytics($.html());
  for (const [k, v] of Object.entries(MARKERS)) {
    if (!shellHtml.includes(v)) console.warn('MISSING MARKER', k);
  }

  await mkdir(SHELL_DIR, { recursive: true });
  await ensureCss();
  await writeFile(join(SHELL_DIR, 'template.html'), shellHtml, 'utf8');
  await writeFile(
    join(SHELL_DIR, 'notes.md'),
    `# Category archive shell

Source: ${REF_URL}
Generated: ${new Date().toISOString()}

Elementor archive template **632** with loop cards **545**.
Live grid: 2 columns, container max-width 900px, section bg #F7F7F7, gaps 35×30.

Markers:
- posts: \`${MARKERS.posts}\`
- pagination: \`${MARKERS.pagination}\`
`,
    'utf8',
  );
  console.log('Wrote', join(SHELL_DIR, 'template.html'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
