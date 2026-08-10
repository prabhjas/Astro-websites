#!/usr/bin/env node
/**
 * Extract a reusable author archive shell from a live WordPress author page.
 * Usage: node scripts/prepare-author-shell.mjs [url]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/author-shell');
const ORIGIN = 'https://movey.ae';
const REF_URL = process.argv[2] || `${ORIGIN}/author/kate-c/`;

const MARKERS = {
  profile: '<!--ASTRO_AUTHOR:PROFILE-->',
  postsHeading: '<!--ASTRO_AUTHOR:POSTS_HEADING-->',
  posts: '<!--ASTRO_AUTHOR:POSTS-->',
  pagination: '<!--ASTRO_AUTHOR:PAGINATION-->',
};

async function main() {
  console.log('Fetching reference author archive:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpmproAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = await res.text();

  html = html.replaceAll('https://movey.ae/', '/');
  html = html.replaceAll('http://movey.ae/', '/');
  html = html.replaceAll('https://www.movey.ae/', '/');

  const $ = cheerio.load(html, { decodeEntities: false });
  const archive = $('[data-elementor-type="archive"]').first();
  if (!archive.length) throw new Error('Author archive markup not found');

  const sections = archive.children('section');
  const profileSection = sections.first();
  const postsSection = sections.eq(1);

  profileSection.replaceWith(
    `<section class="elementor-section elementor-top-section elementor-element elementor-element-86eb7d9 elementor-section-boxed elementor-section-height-default elementor-section-height-default" data-id="86eb7d9" data-element_type="section" data-e-type="section" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">${MARKERS.profile}</section>`,
  );

  postsSection.find('h2.elementor-heading-title').first().replaceWith(MARKERS.postsHeading);

  const ecs = postsSection.find('.ecs-posts, .elementor-posts-container, .elementor-loop-container').first();
  if (ecs.length) {
    ecs.empty().append(MARKERS.posts);
  }

  postsSection.find('.elementor-posts-container .elementor-post').remove();

  postsSection.find('.ecs-load-more, .e-load-more, [class*="load-more"]').remove();
  const pag = postsSection.find('.elementor-pagination').first();
  if (pag.length) pag.replaceWith(MARKERS.pagination);
  else postsSection.append(`<div class="astro-author-pagination">${MARKERS.pagination}</div>`);

  await mkdir(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  await writeFile(outPath, $.html(), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
