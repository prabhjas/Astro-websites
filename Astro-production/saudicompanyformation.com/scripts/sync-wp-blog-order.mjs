#!/usr/bin/env node
/**
 * Sync Insights archive order from live post-sitemap.xml (preferred) or a local copy.
 *
 * Usage:
 *   node scripts/sync-wp-blog-order.mjs
 *   node scripts/sync-wp-blog-order.mjs --from /path/to/post-sitemap.xml
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/wp-blog-order.json');
const ORIGIN = 'https://saudicompanyformation.com';
const UA = 'Mozilla/5.0 (compatible; saudicompanyformation-com-astro/1.0)';

const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const fromPath = fromIdx >= 0 ? args[fromIdx + 1] : null;

function slugsFromSitemapXml(xml) {
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const slugs = [];
  const seen = new Set();
  for (const loc of locs) {
    if (/\/wp-content\//i.test(loc)) continue;
    if (!loc.includes('saudicompanyformation.com')) continue;
    try {
      const u = new URL(loc);
      const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      // Skip homepage / multi-segment CPTs (law/..., ar/...)
      if (parts.length !== 1) continue;
      const slug = parts[0];
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    } catch {
      /* ignore */
    }
  }
  return slugs;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

let xml;
if (fromPath) {
  if (!existsSync(fromPath)) throw new Error(`Missing --from file: ${fromPath}`);
  xml = readFileSync(fromPath, 'utf8');
  console.log(`Using local sitemap: ${fromPath}`);
} else {
  xml = await fetchText(`${ORIGIN}/post-sitemap.xml`);
  console.log('Fetched live post-sitemap.xml');
}

const slugs = slugsFromSitemapXml(xml);
writeFileSync(OUT, `${JSON.stringify(slugs, null, 2)}\n`, 'utf8');
console.log(`Wrote ${slugs.length} slugs to ${OUT}`);
