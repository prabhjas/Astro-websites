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
const ORIGIN = 'https://peomiddleast.com';
const REF_URL = process.argv[2] || `${ORIGIN}/author/timothy-patridge/`;

const MARKERS = {
  profile: '<!--ASTRO_AUTHOR:PROFILE-->',
  postsHeading: '<!--ASTRO_AUTHOR:POSTS_HEADING-->',
  posts: '<!--ASTRO_AUTHOR:POSTS-->',
  pagination: '<!--ASTRO_AUTHOR:PAGINATION-->',
};

function localizeUrls(html) {
  return html
    .replaceAll('https://peomiddleast.com/', '/')
    .replaceAll('http://peomiddleast.com/', '/')
    .replaceAll('https://dev.peomiddleast.com/', '/')
    .replaceAll('http://dev.peomiddleast.com/', '/');
}

async function main() {
  console.log('Fetching reference author archive:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PEOAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = localizeUrls(await res.text());

  const $ = cheerio.load(html, { decodeEntities: false });
  const archive = $('[data-elementor-type="archive"]').first();
  if (!archive.length) throw new Error('Author archive markup not found (data-elementor-type="archive")');

  const sections = archive.children('section');
  const profileSection = sections.first();
  const postsSection = sections.eq(1);

  profileSection.replaceWith(
    `<section class="elementor-section elementor-top-section astro-author-profile-section">${MARKERS.profile}</section>`,
  );

  postsSection.find('h2.elementor-heading-title').first().replaceWith(MARKERS.postsHeading);

  const postsContainer =
    postsSection.find('.elementor-posts-container').first() ||
    postsSection.find('.ecs-posts').first();
  if (postsContainer.length) {
    postsContainer.empty().append(MARKERS.posts);
  } else {
    throw new Error('Author posts container not found (.elementor-posts-container)');
  }

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
