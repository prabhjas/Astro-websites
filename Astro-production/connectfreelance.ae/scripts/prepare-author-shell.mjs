#!/usr/bin/env node
/**
 * Extract a reusable author archive shell from live connectfreelance.ae.
 * Usage: node scripts/prepare-author-shell.mjs [url]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/author-shell');
const ORIGIN = 'https://connectfreelance.ae';
const REF_URL = process.argv[2] || `${ORIGIN}/author/desery/`;

const MARKERS = {
  profile: '<!--ASTRO_AUTHOR:PROFILE-->',
  posts: '<!--ASTRO_AUTHOR:POSTS-->',
  pagination: '<!--ASTRO_AUTHOR:PAGINATION-->',
};

function normaliseUrls(html) {
  return html
    .replaceAll(`${ORIGIN}/`, '/')
    .replaceAll('http://connectfreelance.ae/', '/');
}

async function main() {
  console.log('Fetching reference author archive:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectFreelanceAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = normaliseUrls(await res.text());

  const $ = cheerio.load(html, { decodeEntities: false });
  const archive = $('[data-elementor-id="22597"]').first();
  if (!archive.length) throw new Error('Author archive markup (elementor-22597) not found');

  const authorSec = archive.find('.author-sec2').first();
  if (!authorSec.length) throw new Error('Author profile block (.author-sec2) not found');
  authorSec.replaceWith(MARKERS.profile);

  const filterPost = archive.find('.filter-post').first();
  if (!filterPost.length) throw new Error('Author posts block (.filter-post) not found');
  filterPost.empty().append(MARKERS.posts);
  filterPost.after(`<div class="astro-author-pagination">${MARKERS.pagination}</div>`);

  // Remove WP Rocket jQuery load-more (replaced by astro-mirror-fixes.js).
  archive.find('#loadMore').next('script').remove();
  archive.find('#loadMore').remove();

  // Strip hardcoded GTM snippets; runtime loader injects from env.
  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const text = $(el).html() || '';
    if (src.includes('googletagmanager.com') || text.includes('GTM-')) {
      $(el).remove();
    }
  });

  await mkdir(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  await writeFile(outPath, normaliseUrls($.html()), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
