#!/usr/bin/env node
/**
 * Extract a reusable blog post shell from a live Impreza single post.
 * Usage: node scripts/prepare-blog-shell.mjs [url]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/blog-shell');
const ORIGIN = 'https://alburaq.ae';
const REF_URL = process.argv[2] || `${ORIGIN}/kitchen-renovation-dubai/`;

const MARKERS = {
  breadcrumb: '<!--ASTRO_BLOG:BREADCRUMB-->',
  featured: '<!--ASTRO_BLOG:FEATURED_IMAGE-->',
  category: '<!--ASTRO_BLOG:CATEGORY-->',
  author: '<!--ASTRO_BLOG:AUTHOR-->',
  title: '<!--ASTRO_BLOG:TITLE-->',
  content: '<!--ASTRO_BLOG:CONTENT-->',
  date: '<!--ASTRO_BLOG:DATE-->',
  toc: '<!--ASTRO_BLOG:TOC-->',
};

function rewriteUrls(html) {
  return html
    .replaceAll('https://alburaq.ae/', '/')
    .replaceAll('https://alburaq.ae/', '/')
    .replaceAll('https://alburaq.ae/', '/')
    .replaceAll('http://alburaq.ae/', '/')
    .replace(/\/\/alburaq\.ae\//g, '/');
}

async function main() {
  console.log('Fetching reference post:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlburaqAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = rewriteUrls(await res.text());

  const $ = cheerio.load(html, { decodeEntities: false });

  // Unwrap WP Rocket lazy images in the shell chrome
  $('img[data-lazy-src]').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('data-lazy-src');
    if (src) $img.attr('src', src);
    const srcset = $img.attr('data-lazy-srcset');
    if (srcset) $img.attr('srcset', srcset);
    $img.removeAttr('data-lazy-src').removeAttr('data-lazy-srcset').removeAttr('data-lazy-sizes');
  });

  // Featured image — keep wrapper, replace inner img with marker
  const $image = $('.w-post-elm.post_image').first();
  if ($image.length) {
    $image.html(MARKERS.featured);
    console.log('✓ featured image marker');
  } else {
    console.warn('✗ post_image not found');
  }

  // Title
  const $title = $('h1.w-post-elm.post_title, h1.post_title').first();
  if ($title.length) {
    $title.replaceWith(MARKERS.title);
    console.log('✓ title marker');
  } else {
    console.warn('✗ post_title not found');
  }

  // Category / taxonomy (first in main article area)
  const $tax = $('.w-post-elm.post_taxonomy').first();
  if ($tax.length) {
    $tax.replaceWith(
      `<div class="w-post-elm post_taxonomy style_simple color_link_inherit astro-blog-category">${MARKERS.category}</div>`,
    );
    console.log('✓ category marker');
  } else {
    console.warn('✗ post_taxonomy not found');
  }

  // Author (first)
  const $author = $('.w-post-elm.post_author').first();
  if ($author.length) {
    $author.replaceWith(
      `<div class="w-post-elm post_author vcard author color_link_inherit astro-blog-author">${MARKERS.author}</div>`,
    );
    console.log('✓ author marker');
  } else {
    console.warn('✗ post_author not found');
  }

  // Date
  const $date = $('.w-post-elm.post_date, time.entry-date').first();
  if ($date.length) {
    const tag = $date.prop('tagName')?.toLowerCase() === 'time' ? 'time' : 'div';
    const cls = $date.attr('class') || 'w-post-elm post_date';
    $date.replaceWith(`<${tag} class="${cls} astro-blog-date">${MARKERS.date}</${tag}>`);
    console.log('✓ date marker');
  } else {
    console.warn('✗ post_date not found');
  }

  // Content body
  const $content = $('#singlecontentwrappercs, .w-post-elm.post_content').first();
  if ($content.length) {
    const id = $content.attr('id') || 'singlecontentwrappercs';
    const cls = $content.attr('class') || 'w-post-elm post_content';
    $content.replaceWith(
      `<div class="${cls} astro-blog-content" id="${id}">${MARKERS.content}</div>`,
    );
    console.log('✓ content marker');
  } else {
    console.warn('✗ post_content not found');
  }

  // Replace reference-post BlooD TOC with a single dynamic marker (keeps live CSS classes)
  const $bdToc = $('.bd_toc_container').first();
  if ($bdToc.length) {
    $bdToc.replaceWith(MARKERS.toc);
    console.log('✓ toc marker (replaced bd_toc)');
  } else {
    const $contentHost = $('.astro-blog-content').first();
    if ($contentHost.length) {
      $contentHost.before(MARKERS.toc);
      console.log('✓ toc marker (before content)');
    } else {
      console.warn('✗ toc slot not found');
    }
  }
  // Remove any leftover reference TOC copies / previous astro slots
  $('.astro-blog-toc-slot').remove();
  $('.bd_toc_container').remove();

  // Breadcrumb — prepend above title area if Impreza has none
  const $mainSection = $('.l-main .l-section').first();
  if ($mainSection.length && !$('.astro-blog-breadcrumb-wrap').length) {
    $mainSection.prepend(
      `<div class="astro-blog-breadcrumb-wrap" style="max-width:1140px;margin:0 auto;padding:1rem 1.25rem 0;">${MARKERS.breadcrumb}</div>`,
    );
    console.log('✓ breadcrumb marker');
  }

  // Body classes: keep single-post shape, drop post-specific id
  $('body').attr('class', (i, cls) => {
    const next = String(cls || '')
      .replace(/postid-\d+/g, '')
      .replace(/\bpost-\d+\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${next} astro-blog-post`.replace(/\s+/g, ' ').trim();
  });
  $('body').removeClass('home');

  // Strip rocket-blocked script types so shell chrome JS can run
  $('script[type="rocketlazyloadscript"], script[type="text/rocketlazyloadscript"]').each((_, el) => {
    const $s = $(el);
    const rocketSrc = $s.attr('data-rocket-src');
    if (rocketSrc && !$s.attr('src')) $s.attr('src', rocketSrc);
    $s.removeAttr('type').removeAttr('data-rocket-src').removeAttr('data-rocket-defer');
  });

  // Ensure mirror fixes
  if (!$('script[src*="astro-mirror-fixes.js"]').length) {
    $('body').append('<script src="/js/astro-mirror-fixes.js" defer></script>');
  }

  const shellHtml = $.html();
  const missing = Object.values(MARKERS).filter((m) => !shellHtml.includes(m));
  if (missing.length) {
    console.warn('MISSING MARKERS:', missing.join(', '));
  } else {
    console.log('All ASTRO_BLOG markers present');
  }

  await mkdir(SHELL_DIR, { recursive: true });
  await writeFile(join(SHELL_DIR, 'template.html'), shellHtml, 'utf8');
  await writeFile(
    join(SHELL_DIR, 'notes.md'),
    `# Blog post shell (Impreza)

Source: ${REF_URL}
Generated: ${new Date().toISOString()}

Live Al Buraq singles use the Impreza theme (\`w-post-elm\`), not Elementor theme-post widgets.

Markers:
${Object.entries(MARKERS)
  .map(([k, v]) => `- ${k}: \`${v}\``)
  .join('\n')}
`,
    'utf8',
  );

  console.log('Wrote', join(SHELL_DIR, 'template.html'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
