/**
 * Audit: indexable pages/posts vs generated sitemaps.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = JSON.parse(readFileSync(join(root, 'src/data/pages.json'), 'utf8'));
const posts = JSON.parse(readFileSync(join(root, 'src/data/posts.json'), 'utf8'));
const sitemapUrls = JSON.parse(readFileSync(join(root, 'src/data/sitemap-urls.json'), 'utf8'));

const EXCLUDED_SITEMAP_PATHS = new Set([
  '/es/privacy-policy/',
  '/ru/about-us/',
  '/ru/privacy-policy/',
  '/es/about-us/',
  '/privacy-policy-2/',
  '/es/iberia-eor-landing-page-english-2/',
  '/iberia-eor-landing-page-english-1/',
  '/hr-services-spain-new/',
  '/author/',
]);
const EXCLUDED_PAGE_SLUGS = new Set(['demo', 'status']);

function norm(path) {
  if (!path) return '';
  let p = path.startsWith('/') ? path : `/${path}`;
  if (!p.endsWith('/')) p += '/';
  return p;
}

function robotsString(robots) {
  if (!robots) return null;
  if (typeof robots === 'string') return robots;
  return [robots.index, robots.follow].filter(Boolean).join(', ') || null;
}

function isIndexable(robots) {
  const raw = robotsString(robots);
  if (!raw) return true;
  return !/\bnoindex\b/i.test(raw);
}

function parseLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    try {
      return norm(new URL(m[1]).pathname);
    } catch {
      return norm(m[1]);
    }
  });
}

async function fetchXml(path) {
  const res = await fetch(`http://127.0.0.1:5089${path}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.text();
}

const indexablePages = pages
  .filter((p) => (p.status || 'published') === 'published')
  .map((p) => ({
    path: norm(p.path || `/${p.slug}/`),
    title: p.title,
    indexable: isIndexable(p.seo?.robots),
    excludedPath: EXCLUDED_SITEMAP_PATHS.has(norm(p.path || `/${p.slug}/`)),
    topSlug: norm(p.path || `/${p.slug}/`).replace(/^\/|\/$/g, '').split('/')[0] || '',
  }))
  .filter((p) => p.indexable && !p.excludedPath && !EXCLUDED_PAGE_SLUGS.has(p.topSlug));

const indexablePosts = posts
  .filter((p) => (p.status || 'published') === 'published')
  .map((p) => ({
    path: norm(p.path || `/${p.slug}/`),
    title: p.title,
    indexable: isIndexable(p.seo?.robots),
  }))
  .filter((p) => p.indexable);

const pageXml = await fetchXml('/page-sitemap.xml');
const postXml = await fetchXml('/post-sitemap.xml');
const indexXml = await fetchXml('/sitemap_index.xml');

const pageLocs = new Set(parseLocs(pageXml));
const postLocs = new Set(parseLocs(postXml));

const missingPages = indexablePages.filter((p) => !pageLocs.has(p.path));
const extraPages = [...pageLocs].filter((loc) => !indexablePages.some((p) => p.path === loc));

const missingPosts = indexablePosts.filter((p) => !postLocs.has(p.path));
const extraPosts = [...postLocs].filter((loc) => !indexablePosts.some((p) => p.path === loc));

const noindexInPages = pages
  .filter((p) => !isIndexable(p.seo?.robots) || EXCLUDED_SITEMAP_PATHS.has(norm(p.path || `/${p.slug}/`)))
  .map((p) => norm(p.path || `/${p.slug}/`));

const noindexInSitemap = noindexInPages.filter((p) => pageLocs.has(p));

console.log('=== Sitemap index ===');
console.log(parseLocs(indexXml).join('\n'));

console.log('\n=== Page sitemap ===');
console.log(`URLs in page-sitemap.xml: ${pageLocs.size}`);
console.log(`Indexable pages in pages.json: ${indexablePages.length}`);

console.log('\n--- Missing from page-sitemap (should be indexed) ---');
if (missingPages.length) {
  for (const p of missingPages) console.log(`  MISSING  ${p.path}  (${p.title})`);
} else console.log('  None');

console.log('\n--- In page-sitemap but not expected indexable ---');
if (extraPages.length) {
  for (const p of extraPages) console.log(`  EXTRA    ${p}`);
} else console.log('  None');

console.log('\n--- Noindex pages incorrectly in page-sitemap ---');
if (noindexInSitemap.length) {
  for (const p of noindexInSitemap) console.log(`  FAIL     ${p}`);
} else console.log('  None');

console.log('\n=== Post sitemap ===');
console.log(`URLs in post-sitemap.xml: ${postLocs.size}`);
console.log(`Indexable posts in posts.json: ${indexablePosts.length}`);

console.log('\n--- Missing from post-sitemap ---');
if (missingPosts.length) {
  for (const p of missingPosts.slice(0, 20)) console.log(`  MISSING  ${p.path}`);
  if (missingPosts.length > 20) console.log(`  ... and ${missingPosts.length - 20} more`);
} else console.log('  None');

console.log('\n--- Guides/country/eor in sitemap-urls.json snapshot ---');
for (const key of ['guides', 'country', 'eor']) {
  const rows = sitemapUrls[key] || [];
  console.log(`  ${key}: ${rows.length} in live snapshot`);
}
