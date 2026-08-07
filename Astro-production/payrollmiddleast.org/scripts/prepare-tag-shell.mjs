#!/usr/bin/env node
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
/**
 * Extract reusable tag archive shell from live WordPress tag page.
 * Template: Elementor archive 24660 (archive_cards skin)
 *
 * Usage: node scripts/prepare-tag-shell.mjs [url]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/tag-shell');
const ORIGIN = 'https://connectgroup.co';
const REF_URL = process.argv[2] || `${ORIGIN}/tag/company-setup/`;

const MARKERS = {
  posts: '<!--ASTRO_TAG:POSTS-->',
  pagination: '<!--ASTRO_TAG:PAGINATION-->',
  title: '<!--ASTRO_TAG:TITLE-->',
};

async function main() {
  console.log('Fetching reference tag archive:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = await res.text();

  html = html.replaceAll('https://connectgroup.co/', '/');
  html = html.replaceAll('http://connectgroup.co/', '/');

  const $ = cheerio.load(html, { decodeEntities: false });

  // Title in <title> is fine; also set a marker if there's an archive title widget
  const archive = $('[data-elementor-type="archive"]').first();
  if (!archive.length) throw new Error('Tag archive markup not found');

  const postsContainer = $('[data-widget_type="archive-posts.archive_cards"] .elementor-posts-container').first();
  if (!postsContainer.length) throw new Error('archive_cards posts container not found');

  postsContainer.empty().append(MARKERS.posts);

  // Replace load-more / html widgets after posts with pagination marker
  const postsWidget = $('[data-widget_type="archive-posts.archive_cards"]').first();
  postsWidget.nextAll('.elementor-widget-html, .elementor-pagination').remove();
  postsWidget.after(`<div class="astro-tag-pagination">${MARKERS.pagination}</div>`);

  // Prefixed document title placeholder handled at assemble time
  await mkdir(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  await writeFile(outPath, $.html(), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
