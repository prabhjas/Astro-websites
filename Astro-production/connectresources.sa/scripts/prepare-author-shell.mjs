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
const ORIGIN = 'https://connectgroup.co';
const REF_URL = process.argv[2] || `${ORIGIN}/author/kate-williams/`;

const MARKERS = {
  profile: '<!--ASTRO_AUTHOR:PROFILE-->',
  postsHeading: '<!--ASTRO_AUTHOR:POSTS_HEADING-->',
  posts: '<!--ASTRO_AUTHOR:POSTS-->',
  pagination: '<!--ASTRO_AUTHOR:PAGINATION-->',
};

async function main() {
  console.log('Fetching reference author archive:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = await res.text();

  html = html.replaceAll('https://connectgroup.co/', '/');
  html = html.replaceAll('http://connectgroup.co/', '/');

  const $ = cheerio.load(html, { decodeEntities: false });
  const archive = $('[data-elementor-type="archive"]').first();
  if (!archive.length) throw new Error('Author archive markup not found');

  const sections = archive.children('section');
  const profileSection = sections.first();
  const postsSection = sections.eq(1);

  profileSection.replaceWith(
    `<section class="elementor-section elementor-top-section astro-author-profile-section">${MARKERS.profile}</section>`,
  );

  postsSection.find('h2.elementor-heading-title').first().replaceWith(MARKERS.postsHeading);

  const ecs = postsSection.find('.ecs-posts').first();
  if (ecs.length) {
    ecs.empty().append(MARKERS.posts);
  }

  postsSection.find('.ecs-load-more, .e-load-more, [class*="load-more"]').remove();
  const pag = postsSection.find('.elementor-pagination').first();
  if (pag.length) pag.replaceWith(MARKERS.pagination);
  else postsSection.append(`<motion.div class="astro-author-pagination">${MARKERS.pagination}</motion.div>`);

  await mkdir(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  await writeFile(outPath, $.html(), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
