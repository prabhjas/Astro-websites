#!/usr/bin/env node
/**
 * Import WordPress pages/posts from the live Rank Math sitemap index.
 *
 * Usage:
 *   node scripts/import-from-sitemap.mjs
 *   node scripts/import-from-sitemap.mjs --download --prepare
 *   node scripts/import-from-sitemap.mjs --only pages
 *   node scripts/import-from-sitemap.mjs --only posts --slugs about-us,contact
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://theuaegate.com';
const SITEMAP_INDEX = `${ORIGIN}/sitemap_index.xml`;

const args = process.argv.slice(2);
const shouldPrepare = args.includes('--prepare');
const shouldDownload = args.includes('--download') || shouldPrepare;
const onlyArg = args.find((a) => a.startsWith('--only='))?.slice('--only='.length)
  || (args.includes('--only') ? args[args.indexOf('--only') + 1] : null);
const slugsArg = args.find((a) => a.startsWith('--slugs='))?.slice('--slugs='.length)
  || (args.includes('--slugs') ? args[args.indexOf('--slugs') + 1] : null);
const onlySlugs = slugsArg
  ? new Set(slugsArg.split(',').map((s) => s.trim()).filter(Boolean))
  : null;

const CONCURRENCY = 4;

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function slugFromUrl(url) {
  const u = new URL(url);
  let path = u.pathname.replace(/\/$/, '');
  if (!path || path === '/') return 'homepage';
  return path.replace(/^\//, '');
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'theuaegate-astro-Migrator/0.1',
      Accept: '*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function writeExport(slug, html, kind, liveUrl) {
  const dir = join(ROOT, 'source/wordpress-exports', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index-https.html'), html, 'utf8');
  await writeFile(
    join(dir, 'notes.md'),
    `# ${slug} export notes

| Field | Value |
|-------|-------|
| Kind | ${kind} |
| Live URL | ${liveUrl} |
| File | \`index-https.html\` |
| Source | Live fetch via import-from-sitemap.mjs |
| Added | ${new Date().toISOString().slice(0, 10)} |
| Astro route | ${slug === 'homepage' ? '/' : `/${slug}/`} |

## Prepare

\`\`\`bash
npm run prepare:page -- ${slug} --download
\`\`\`
`,
    'utf8',
  );
}

function runPrepare(slug) {
  return new Promise((resolve) => {
    const childArgs = [join(ROOT, 'scripts/prepare-page.mjs'), slug];
    if (shouldDownload) childArgs.push('--download');
    const child = spawn(process.execPath, childArgs, { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function resolveChildSitemaps() {
  /** Live theuaegate Rank Math may only expose page/post sitemaps (no index yet). */
  const fallback = [
    `${ORIGIN}/page-sitemap.xml`,
    `${ORIGIN}/page-sitemap1.xml`,
    `${ORIGIN}/post-sitemap.xml`,
    `${ORIGIN}/post-sitemap1.xml`,
  ];
  try {
    console.log(`Fetching sitemap index: ${SITEMAP_INDEX}`);
    const indexXml = await fetchText(SITEMAP_INDEX);
    const fromIndex = extractLocs(indexXml).filter((u) => u.endsWith('.xml'));
    if (fromIndex.length) return fromIndex;
  } catch (err) {
    console.warn(`Sitemap index unavailable (${err.message || err}); using page/post fallbacks`);
  }
  return fallback;
}

async function main() {
  const childSitemaps = await resolveChildSitemaps();

  /** @type {{ slug: string, url: string, kind: 'page' | 'post' }[]} */
  const entries = [];

  for (const sm of childSitemaps) {
    const kind = sm.includes('post-sitemap')
      ? 'post'
      : sm.includes('page-sitemap')
        ? 'page'
        : null;
    if (!kind) {
      console.log(`Skipping non page/post sitemap: ${sm}`);
      continue;
    }
    if (onlyArg && onlyArg !== 'all' && onlyArg !== `${kind}s` && onlyArg !== kind) {
      continue;
    }

    console.log(`Reading ${kind} sitemap: ${sm}`);
    let xml;
    try {
      xml = await fetchText(sm);
    } catch (err) {
      console.warn(`Skip ${sm}: ${err.message || err}`);
      continue;
    }
    for (const loc of extractLocs(xml)) {
      if (loc.endsWith('.kml') || loc.endsWith('.xml')) continue;
      const slug = slugFromUrl(loc);
      if (onlySlugs && !onlySlugs.has(slug)) continue;
      entries.push({ slug, url: loc, kind });
    }
  }

  // Dedupe by slug (prefer page over post if conflict)
  const bySlug = new Map();
  for (const e of entries) {
    const prev = bySlug.get(e.slug);
    if (!prev || (prev.kind === 'post' && e.kind === 'page')) {
      bySlug.set(e.slug, e);
    }
  }
  const unique = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  console.log(`Found ${unique.length} URLs to import (${unique.filter((e) => e.kind === 'page').length} pages, ${unique.filter((e) => e.kind === 'post').length} posts)`);

  const inventory = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    sitemapIndex: SITEMAP_INDEX,
    pages: unique.filter((e) => e.kind === 'page').map((e) => ({ slug: e.slug, url: e.url })),
    posts: unique.filter((e) => e.kind === 'post').map((e) => ({ slug: e.slug, url: e.url })),
  };
  await mkdir(join(ROOT, 'src/data'), { recursive: true });
  await writeFile(join(ROOT, 'src/data/sitemap-inventory.json'), JSON.stringify(inventory, null, 2), 'utf8');
  console.log('Wrote src/data/sitemap-inventory.json');

  const results = await mapPool(unique, CONCURRENCY, async (entry) => {
    const exportPath = join(ROOT, 'source/wordpress-exports', entry.slug, 'index-https.html');
    try {
      if (existsSync(exportPath)) {
        const existing = await readFile(exportPath, 'utf8');
        if (existing.length > 5000) {
          console.log(`SKIP fetch (exists): ${entry.slug}`);
          return { ...entry, status: 'cached' };
        }
      }
      console.log(`FETCH ${entry.kind}: ${entry.url}`);
      const html = await fetchText(entry.url);
      if (!/<html/i.test(html) || html.length < 3000) {
        return { ...entry, status: 'thin', length: html.length };
      }
      await writeExport(entry.slug, html, entry.kind, entry.url);
      return { ...entry, status: 'fetched', length: html.length };
    } catch (err) {
      console.warn(`FAIL ${entry.slug}:`, err.message || err);
      return { ...entry, status: 'failed', error: String(err) };
    }
  });

  const fetched = results.filter((r) => r.status === 'fetched').length;
  const cached = results.filter((r) => r.status === 'cached').length;
  const failed = results.filter((r) => r.status === 'failed' || r.status === 'thin');
  console.log(`Import done: ${fetched} fetched, ${cached} cached, ${failed.length} failed/thin`);
  for (const f of failed) console.warn('  -', f.slug, f.status, f.error || f.length || '');

  if (shouldPrepare) {
    console.log(`\nPreparing ${unique.length} pages (download=${shouldDownload})…`);
    for (const entry of unique) {
      const exportPath = join(ROOT, 'source/wordpress-exports', entry.slug, 'index-https.html');
      if (!existsSync(exportPath)) {
        console.warn(`No export for ${entry.slug}, skipping prepare`);
        continue;
      }
      const ok = await runPrepare(entry.slug);
      if (!ok) console.warn(`Prepare failed: ${entry.slug}`);
    }
  }

  console.log('\nNext:');
  console.log('  npm run import:sitemap:download   # fetch + prepare + download assets');
  console.log('  npm run dev');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
