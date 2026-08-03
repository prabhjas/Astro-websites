#!/usr/bin/env node
/**
 * Extract a reusable blog post shell from a live WordPress single post.
 * Usage: node scripts/prepare-blog-shell.mjs [url]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/blog-shell');
const ORIGIN = 'https://connectgroup.co';
const REF_URL = process.argv[2] || `${ORIGIN}/hr-audit-uae-checklist/`;

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

async function main() {
  console.log('Fetching reference post:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = await res.text();

  // Rewrite absolute asset URLs to local paths (same as prepare-page)
  html = html.replaceAll('https://connectgroup.co/', '/');
  html = html.replaceAll('http://connectgroup.co/', '/');

  const $ = cheerio.load(html, { decodeEntities: false });

  // Breadcrumb slot — top of main column
  const mainCol = $('.post-single .elementor-col-66').first();
  if (mainCol.length) {
    mainCol.find('.elementor-widget-wrap').first().prepend(
      `<div class="elementor-element astro-blog-breadcrumb-wrap elementor-widget">${MARKERS.breadcrumb}</div>`,
    );
  }

  // Replace dynamic post content areas with markers
  $('[data-widget_type="theme-post-featured-image.default"] img').first().replaceWith(MARKERS.featured);
  $('[data-widget_type="theme-post-title.default"] h1').first().replaceWith(MARKERS.title);

  const contentWidget = $('[data-widget_type="theme-post-content.default"]').first();
  if (contentWidget.length) {
    const wpPost = contentWidget.find('[data-elementor-type="wp-post"]').first();
    if (wpPost.length) {
      wpPost.replaceWith(`<div class="astro-blog-content">${MARKERS.content}</div>`);
    } else if (contentWidget.find('.elementor-widget-container').length) {
      contentWidget.find('.elementor-widget-container').first().html(MARKERS.content);
    } else {
      contentWidget.append(`<div class="elementor-widget-container">${MARKERS.content}</div>`);
    }
  }

  // Category (first post-info terms in main column)
  mainCol.find('[data-widget_type="post-info.default"]').each((i, el) => {
    const $el = $(el);
    if ($el.find('.elementor-post-info__item--type-terms').length && !$el.data('astro-replaced')) {
      $el.replaceWith(MARKERS.category);
      return false;
    }
  });

  // Author
  mainCol.find('[data-widget_type="post-info.default"]').each((i, el) => {
    const $el = $(el);
    if ($el.find('.elementor-post-info__item--type-author').length) {
      $el.replaceWith(MARKERS.author);
      return false;
    }
  });

  // Published date (bottom)
  mainCol.find('[data-widget_type="post-info.default"]').each((i, el) => {
    const $el = $(el);
    if ($el.find('.elementor-post-info__item--type-date').length) {
      $el.replaceWith(MARKERS.date);
      return false;
    }
  });

  // TOC slot — top of sidebar column (33%)
  const sidebar = $('.post-single .elementor-col-33').first();
  if (sidebar.length) {
    sidebar.find('.elementor-widget-wrap').first().prepend(
      `<section class="elementor-section elementor-inner-section elementor-element astro-blog-toc-section elementor-section-boxed elementor-section-height-default" data-id="astro-toc"><div class="elementor-container elementor-column-gap-default"><div class="elementor-column elementor-col-100 elementor-inner-column"><div class="elementor-widget-wrap elementor-element-populated">${MARKERS.toc}</div></div></motion.div></div></div></section>`,
    );
  }

  // Neutralize post-specific body classes
  $('body').attr('class', (i, cls) =>
    (cls || '')
      .replace(/postid-\d+/g, '')
      .replace(/post-\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim() + ' astro-blog-post',
  );

  // Remove Rank Math TOC blocks if any
  $('.wp-block-rank-math-toc-block, .rank-math-toc, #ez-toc-container').remove();

  const shellHtml = $.html();

  await mkdir(SHELL_DIR, { recursive: true });
  await writeFile(join(SHELL_DIR, 'template.html'), shellHtml, 'utf8');
  await writeFile(
    join(SHELL_DIR, 'notes.md'),
    `# Blog post shell

| Field | Value |
|-------|-------|
| Reference URL | ${REF_URL} |
| Created | ${new Date().toISOString().slice(0, 10)} |

Extracted from live WordPress single-post Elementor template (ID 18825).
Markers: \`ASTRO_BLOG:*\` replaced at render time by \`serveBlogPost()\`.
`,
    'utf8',
  );

  console.log('Wrote', join(SHELL_DIR, 'template.html'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
