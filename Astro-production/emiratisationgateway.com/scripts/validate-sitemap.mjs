#!/usr/bin/env node
/**
 * Validate Rank Math–style robots + sitemap files in dist/ after build.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

function mustExist(rel) {
  const full = join(DIST, rel);
  if (!existsSync(full)) {
    throw new Error(`Missing ${rel} in dist/`);
  }
  return readFileSync(full, 'utf8');
}

function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ missing — run npm run build first');
    process.exit(1);
  }

  const robots = mustExist('robots.txt');
  if (!/Sitemap:\s+\S+sitemap_index\.xml/i.test(robots)) {
    throw new Error('robots.txt missing Sitemap: …/sitemap_index.xml');
  }

  const index = mustExist('sitemap_index.xml');
  if (!index.includes('<sitemapindex')) throw new Error('sitemap_index.xml invalid');

  const page = mustExist('page-sitemap.xml');
  if (!page.includes('<urlset')) throw new Error('page-sitemap.xml invalid');

  const post = mustExist('post-sitemap.xml');
  if (!post.includes('<urlset')) throw new Error('post-sitemap.xml invalid');

  const pageCount = (page.match(/<loc>/g) || []).length;
  const postCount = (post.match(/<loc>/g) || []).length;
  console.log(`OK — robots.txt + sitemap_index.xml`);
  console.log(`  page-sitemap.xml: ${pageCount} URLs`);
  console.log(`  post-sitemap.xml: ${postCount} URLs`);
}

main();
