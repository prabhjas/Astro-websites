/**
 * Validate Rank Math–style robots + sitemaps.
 *
 * robots.txt / sitemap endpoints are SSR (`prerender = false`) so they are not
 * emitted as static files under dist/. This script validates the live data layer
 * (discovery + XML render) and still fails if a competing Astro sitemap-index.xml
 * appears under dist/.
 *
 * Usage: node --import tsx scripts/validate-sitemap.mjs [distDir]
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const distDir = resolve(process.argv[2] || 'dist');
const siteEnv = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://connectgroup.co')
  .trim()
  .replace(/\/$/, '');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) {
    locs.push(m[1].trim());
  }
  return locs;
}

function isWellFormedXml(xml) {
  if (!xml.includes('<?xml')) return false;
  const openUrlset = (xml.match(/<urlset[\s>]/g) || []).length;
  const closeUrlset = (xml.match(/<\/urlset>/g) || []).length;
  const openIndex = (xml.match(/<sitemapindex[\s>]/g) || []).length;
  const closeIndex = (xml.match(/<\/sitemapindex>/g) || []).length;
  if (openUrlset || closeUrlset) return openUrlset === 1 && closeUrlset === 1;
  if (openIndex || closeIndex) return openIndex === 1 && closeIndex === 1;
  return false;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataUrl = pathToFileURL(join(root, 'src/lib/seo/sitemap-data.ts')).href;
const xmlUrl = pathToFileURL(join(root, 'src/lib/seo/sitemap-xml.ts')).href;
const configUrl = pathToFileURL(join(root, 'src/lib/seo/sitemap-config.ts')).href;

const { buildSitemapDataset } = await import(dataUrl);
const { renderRobotsTxt, renderSitemapIndex, renderUrlSet } = await import(xmlUrl);
const { ROBOTS_DISALLOW_PATHS } = await import(configUrl);

console.log(`Validating SSR sitemap data layer (dist check: ${distDir})`);
console.log(`Expected site origin: ${siteEnv}`);

const robotsBody = renderRobotsTxt(siteEnv, ROBOTS_DISALLOW_PATHS);
ok('Generated default robots.txt');
if (!robotsBody.includes('Disallow: /tag/')) fail('robots.txt missing /tag/ disallow');
if (!robotsBody.includes('Disallow: /category/')) fail('robots.txt missing /category/ disallow');
if (!robotsBody.includes('Disallow: /wp-admin/')) fail('robots.txt missing /wp-admin/ disallow');
if (!robotsBody.includes(`Sitemap: ${siteEnv}/sitemap_index.xml`)) {
  fail(`robots.txt must reference Sitemap: ${siteEnv}/sitemap_index.xml`);
} else {
  ok('robots.txt Sitemap line uses resolved domain + sitemap_index.xml');
}
if (robotsBody.includes('Disallow: /\n') || robotsBody.includes('Disallow: /\r\n')) {
  fail('robots.txt accidentally blocks the entire site');
}

const dataset = buildSitemapDataset({
  env: { PUBLIC_SITE_URL: siteEnv },
  trustRequestHost: false,
  adminDir: process.env.INTERNAL_ADMIN_DIR?.trim() || join(root, '.data/internal-admin'),
});

const indexBody = renderSitemapIndex(dataset.indexItems);
ok('Generated sitemap_index.xml');
if (!isWellFormedXml(indexBody)) fail('sitemap_index.xml is not well-formed');

if (existsSync(join(distDir, 'sitemap-index.xml'))) {
  fail('Competing Astro default sitemap-index.xml found — remove @astrojs/sitemap output');
} else {
  ok('No competing sitemap-index.xml in dist (or dist not built yet)');
}

const childSitemapUrls = extractLocs(indexBody);
if (childSitemapUrls.length === 0) fail('sitemap_index.xml has no child sitemaps');

const allLocs = [];
const seen = new Set();

for (let i = 0; i < dataset.pageChunks.length; i += 1) {
  const xml = renderUrlSet(dataset.pageChunks[i]);
  if (!isWellFormedXml(xml)) fail(`page sitemap chunk ${i + 1} is not well-formed`);
  for (const loc of extractLocs(xml)) {
    if (seen.has(loc)) fail(`Duplicate loc across sitemaps: ${loc}`);
    seen.add(loc);
    allLocs.push(loc);
  }
}

for (let i = 0; i < dataset.postChunks.length; i += 1) {
  const xml = renderUrlSet(dataset.postChunks[i]);
  if (!isWellFormedXml(xml)) fail(`post sitemap chunk ${i + 1} is not well-formed`);
  for (const loc of extractLocs(xml)) {
    if (seen.has(loc)) fail(`Duplicate loc across sitemaps: ${loc}`);
    seen.add(loc);
    allLocs.push(loc);
  }
}

for (const loc of allLocs) {
  if (!loc.startsWith(`${siteEnv}/`) && loc !== siteEnv) {
    fail(`Sitemap loc outside configured domain: ${loc}`);
  }
  if (loc.includes('?') || loc.includes('#')) fail(`Query/hash URL in sitemap: ${loc}`);
}

ok(`${allLocs.length} unique URLs across ${childSitemapUrls.length} child sitemaps`);
if (process.exitCode) {
  process.exit(process.exitCode);
}
