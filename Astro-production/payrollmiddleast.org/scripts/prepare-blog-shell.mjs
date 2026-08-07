#!/usr/bin/env node
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
/**
 * Extract a reusable blog post shell from a live Elementor + Astra single post.
 * Usage: node scripts/prepare-blog-shell.mjs [url]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/blog-shell');
const ORIGIN = 'https://www.payrollmiddleast.org';
const REF_URL = process.argv[2] || `${ORIGIN}/what-is-wps-in-uae/`;

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
    .replaceAll('https://www.payrollmiddleast.org/', '/')
    .replaceAll('http://www.payrollmiddleast.org/', '/')
    .replaceAll('https://payrollmiddleast.org/', '/')
    .replaceAll('http://payrollmiddleast.org/', '/')
    .replace(/\/\/www\.payrollmiddleast\.org\//g, '/')
    .replace(/\/\/payrollmiddleast\.org\//g, '/');
}

async function main() {
  console.log('Fetching reference post:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PayrollMiddleastAstro/0.1)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = rewriteUrls(await res.text());

  const $ = cheerio.load(html, { decodeEntities: false });

  $('img[data-lazy-src]').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('data-lazy-src');
    if (src) $img.attr('src', src);
    const srcset = $img.attr('data-lazy-srcset');
    if (srcset) $img.attr('srcset', srcset);
    $img.removeAttr('data-lazy-src').removeAttr('data-lazy-srcset').removeAttr('data-lazy-sizes');
  });

  // Featured image (Elementor theme-post-featured-image)
  const $image = $('.elementor-widget-theme-post-featured-image .elementor-widget-container').first();
  if ($image.length) {
    $image.html(MARKERS.featured);
    console.log('✓ featured image marker');
  } else {
    console.warn('✗ featured image not found');
  }

  // Title
  const $title = $('.elementor-widget-theme-post-title h1, h1.elementor-heading-title').first();
  if ($title.length) {
    $title.replaceWith(MARKERS.title);
    console.log('✓ title marker');
  } else {
    console.warn('✗ post_title not found');
  }

  // Post info list → author / date / category slots
  const $postInfo = $('.elementor-widget-post-info .elementor-post-info').first();
  if ($postInfo.length) {
    $postInfo.html(
      `<li class="elementor-icon-list-item astro-blog-author">${MARKERS.author}</li>` +
        `<li class="elementor-icon-list-item astro-blog-date">${MARKERS.date}</li>` +
        `<li class="elementor-icon-list-item astro-blog-category">${MARKERS.category}</li>`,
    );
    console.log('✓ author/date/category markers (post-info)');
  } else {
    console.warn('✗ post-info not found');
  }

  // Content body
  const $content = $('.elementor-widget-theme-post-content .elementor-widget-container').first();
  if ($content.length) {
    $content.html(`${MARKERS.toc}${MARKERS.content}`);
    console.log('✓ content + toc markers');
  } else {
    console.warn('✗ post_content not found');
  }

  // Breadcrumb — inject above single post content if Rank Math / Elementor breadcrumb missing
  if (!$('.astro-blog-breadcrumb-wrap').length) {
    const $single = $('[data-elementor-type="single-post"]').first();
    if ($single.length) {
      $single.prepend(
        `<div class="astro-blog-breadcrumb-wrap" style="max-width:1280px;margin:0 auto;padding:1rem 1.25rem 0;">${MARKERS.breadcrumb}</div>`,
      );
      console.log('✓ breadcrumb marker');
    } else {
      $('body').prepend(`<div class="astro-blog-breadcrumb-wrap">${MARKERS.breadcrumb}</div>`);
      console.log('✓ breadcrumb marker (body)');
    }
  }

  $('body').attr('class', (i, cls) => {
    const next = String(cls || '')
      .replace(/postid-\d+/g, '')
      .replace(/\bpost-\d+\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `${next} astro-blog-post`.replace(/\s+/g, ' ').trim();
  });
  $('body').removeClass('home');

  $('script[type="rocketlazyloadscript"], script[type="text/rocketlazyloadscript"]').each((_, el) => {
    const $s = $(el);
    const rocketSrc = $s.attr('data-rocket-src');
    if (rocketSrc && !$s.attr('src')) $s.attr('src', rocketSrc);
    $s.removeAttr('type').removeAttr('data-rocket-src').removeAttr('data-rocket-defer');
  });

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
    `# Blog post shell (Elementor + Astra)

Source: ${REF_URL}
Generated: ${new Date().toISOString()}

payrollmiddleast.org singles use Astra + Elementor theme-post widgets.

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
