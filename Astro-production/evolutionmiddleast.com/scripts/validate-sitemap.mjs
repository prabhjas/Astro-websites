#!/usr/bin/env node
/**
 * Validate the SSR robots/sitemap data layer after an Astro build.
 *
 * These endpoints use `prerender = false`, so current Astro builds place their
 * handlers under dist/server instead of emitting files at the root of dist/.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(process.argv[2] || 'dist');
const siteOrigin = (
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://www.evolutionmiddleast.com'
)
  .trim()
  .replace(/\/$/, '');

const importSource = (path) => import(pathToFileURL(join(root, path)).href);
const { buildSitemapDataset } = await importSource('src/lib/seo/sitemap-data.ts');
const { renderRobotsTxt, renderSitemapIndex, renderUrlSet } = await importSource(
  'src/lib/seo/sitemap-xml.ts',
);
const { ROBOTS_DISALLOW_PATHS } = await importSource('src/lib/seo/sitemap-config.ts');

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(existsSync(join(distDir, 'server', 'entry.mjs')), 'dist/server/entry.mjs missing — run pnpm build first');
assert(!existsSync(join(distDir, 'sitemap-index.xml')), 'Competing sitemap-index.xml found in dist/');

const robots = renderRobotsTxt(siteOrigin, ROBOTS_DISALLOW_PATHS);
assert(robots.includes(`Sitemap: ${siteOrigin}/sitemap_index.xml`), 'robots.txt has the wrong sitemap URL');
assert(!robots.includes('Disallow: /\n') && !robots.includes('Disallow: /\r\n'), 'robots.txt blocks the whole site');

const dataset = buildSitemapDataset({
  env: { PUBLIC_SITE_URL: siteOrigin },
  trustRequestHost: false,
  adminDir: process.env.INTERNAL_ADMIN_DIR?.trim() || join(root, '.data/internal-admin'),
});
const indexXml = renderSitemapIndex(dataset.indexItems);
const childUrls = extractLocs(indexXml);
assert(indexXml.includes('<sitemapindex'), 'sitemap_index.xml is invalid');
assert(childUrls.length > 0, 'sitemap_index.xml has no child sitemaps');

const allUrls = [];
for (const chunk of [...dataset.pageChunks, ...dataset.postChunks]) {
  const xml = renderUrlSet(chunk);
  assert(xml.includes('<urlset'), 'A child sitemap is invalid');
  allUrls.push(...extractLocs(xml));
}

assert(new Set(allUrls).size === allUrls.length, 'Duplicate URLs found across child sitemaps');
for (const url of allUrls) {
  assert(url === siteOrigin || url.startsWith(`${siteOrigin}/`), `URL outside canonical origin: ${url}`);
  assert(!url.includes('?') && !url.includes('#'), `Query or fragment found in sitemap URL: ${url}`);
}

console.log(`OK — ${allUrls.length} unique URLs across ${childUrls.length} child sitemaps`);
console.log(`Canonical origin: ${siteOrigin}`);
