#!/usr/bin/env node
/**
 * Create category-shell/template.html from a live category archive page.
 * Localizes URLs and inserts markers for dynamic content.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ORIGIN = 'https://emiratisationgateway.com';
const SHELL_DIR = join(ROOT, 'src/legacy/category-shell');

const MARKERS = {
  title: '<!--ASTRO_CATEGORY:TITLE-->',
  posts: '<!--ASTRO_CATEGORY:POSTS-->',
  pagination: '<!--ASTRO_CATEGORY:PAGINATION-->',
};

async function main() {
  // Fetch live category page
  console.log('Fetching live category page...');
  const res = await fetch(`${ORIGIN}/category/emiratisation/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AstroMigrate/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  let html = await res.text();
  console.log(`Got ${html.length} bytes`);

  // Localize absolute URLs
  html = html.replaceAll(`${ORIGIN}/`, '/');
  html = html.replaceAll(ORIGIN, '');

  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove WP-specific scripts
  $('script[src*="wp-includes"]').remove();
  $('script[src*="wp-content"]').remove();
  $('script[src*="admin-ajax"]').remove();
  $('script[src*="cloudflare"]').remove();
  $('script[src*="cdn-cgi"]').remove();

  // Replace archive title
  const archiveTitle = $('.ast-archive-description');
  if (archiveTitle.length) {
    archiveTitle.html(MARKERS.title);
    console.log('Replaced archive title with marker');
  }

  // Replace articles with marker
  const astRow = $('article.ast-article-post').first().parent();
  if (astRow.length && astRow.hasClass('ast-row')) {
    astRow.empty().html(MARKERS.posts);
    console.log('Replaced .ast-row posts with marker');
  }

  // Replace pagination
  const pagination = $('.ast-pagination').first();
  if (pagination.length) {
    pagination.replaceWith(MARKERS.pagination);
    console.log('Replaced pagination with marker');
  }

  // Remove sidebar widgets content but keep structure
  // (or remove sidebar entirely for simplicity matching)
  
  mkdirSync(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  writeFileSync(outPath, $.html(), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
