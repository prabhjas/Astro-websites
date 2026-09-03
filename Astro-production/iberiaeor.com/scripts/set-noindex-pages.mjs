/**
 * One-off: set noindex,nofollow on selected Iberia EOR pages.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesFile = join(root, 'src/data/pages.json');

const NOINDEX_PATHS = new Set([
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

const pages = JSON.parse(readFileSync(pagesFile, 'utf8'));
let updated = 0;

for (const page of pages) {
  if (!NOINDEX_PATHS.has(page.path)) continue;
  page.seo = page.seo || {};
  page.seo.robots = { index: 'noindex', follow: 'nofollow' };
  updated += 1;
}

writeFileSync(pagesFile, `${JSON.stringify(pages, null, 2)}\n`, 'utf8');
console.log(`Updated robots on ${updated} page(s).`);
