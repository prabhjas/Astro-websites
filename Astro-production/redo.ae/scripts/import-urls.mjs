/**
 * Import specific live URLs that may be missing from Rank Math sitemaps
 * (e.g. noindex pages), then prepare + download assets.
 *
 * Usage:
 *   node scripts/import-urls.mjs https://redo.ae/foo/ https://redo.ae/bar/
 *   node scripts/import-urls.mjs --slugs redo-house-renovation,redo-landscaping
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://redo.ae';

const args = process.argv.slice(2);
const shouldDownload = !args.includes('--no-download');
const slugsArg = args.find((a) => a.startsWith('--slugs='))?.slice('--slugs='.length)
  || (args.includes('--slugs') ? args[args.indexOf('--slugs') + 1] : null);

function slugFromUrl(url) {
  const u = new URL(url);
  let path = u.pathname.replace(/\/$/, '');
  if (!path || path === '/') return 'homepage';
  return path.replace(/^\//, '');
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'redo-ae-astro-Migrator/0.1',
      Accept: '*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

function extractRobots(html) {
  const m =
    html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i);
  return m?.[1] || null;
}

async function writeExport(slug, html, liveUrl) {
  const dir = join(ROOT, 'source/wordpress-exports', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index-https.html'), html, 'utf8');
  await writeFile(
    join(dir, 'notes.md'),
    `# ${slug}

| Field | Value |
|-------|-------|
| Kind | page (manual URL import) |
| Live URL | ${liveUrl} |
| Robots | ${extractRobots(html) || '(none)'} |
| Added | ${new Date().toISOString().slice(0, 10)} |
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

function isNoindex(robots) {
  return /\bnoindex\b/i.test(robots || '');
}

async function updateInventory(entries) {
  const invPath = join(ROOT, 'src/data/sitemap-inventory.json');
  let inv = { pages: [], posts: [], origin: ORIGIN };
  if (existsSync(invPath)) {
    inv = JSON.parse(await readFile(invPath, 'utf8'));
  }
  inv.generatedAt = new Date().toISOString();
  inv.manualPages = inv.manualPages || [];
  for (const e of entries) {
    // Keep noindex URLs off sitemap inventory.pages (Rank Math also excludes them).
    // Routing still works via src/legacy/<slug>.cleaned.html.
    if (!isNoindex(e.robots)) {
      if (!inv.pages.some((p) => p.slug === e.slug) && !inv.posts.some((p) => p.slug === e.slug)) {
        inv.pages.push({ slug: e.slug, url: e.url, manual: true });
      }
    } else {
      inv.pages = inv.pages.filter((p) => p.slug !== e.slug);
    }
    if (!inv.manualPages.some((p) => p.slug === e.slug)) {
      inv.manualPages.push({
        slug: e.slug,
        url: e.url,
        robots: e.robots,
        importedAt: new Date().toISOString(),
      });
    } else {
      const row = inv.manualPages.find((p) => p.slug === e.slug);
      row.robots = e.robots;
      row.importedAt = new Date().toISOString();
    }
  }
  inv.pages.sort((a, b) => a.slug.localeCompare(b.slug));
  await mkdir(join(ROOT, 'src/data'), { recursive: true });
  await writeFile(invPath, JSON.stringify(inv, null, 2), 'utf8');
  console.log('Updated src/data/sitemap-inventory.json');
}

const urls = [];
if (slugsArg) {
  for (const s of slugsArg.split(',').map((x) => x.trim()).filter(Boolean)) {
    urls.push(`${ORIGIN}/${s.replace(/^\/|\/$/g, '')}/`);
  }
}
for (const a of args) {
  if (a.startsWith('http://') || a.startsWith('https://')) urls.push(a);
  else if (!a.startsWith('--') && a !== slugsArg && !args.includes('--slugs')) {
    // bare slug
    if (!/[=,]/.test(a)) urls.push(`${ORIGIN}/${a.replace(/^\/|\/$/g, '')}/`);
  }
}

if (!urls.length) {
  console.error('Usage: node scripts/import-urls.mjs <url...>');
  console.error('   or: node scripts/import-urls.mjs --slugs slug-a,slug-b');
  process.exit(1);
}

const results = [];
for (const url of urls) {
  const slug = slugFromUrl(url);
  try {
    console.log(`FETCH page: ${url}`);
    const html = await fetchText(url);
    if (!/<html/i.test(html) || html.length < 3000) {
      console.warn(`THIN ${slug} len=${html.length}`);
      results.push({ slug, url, status: 'thin', robots: null });
      continue;
    }
    const robots = extractRobots(html);
    await writeExport(slug, html, url);
    console.log(`SAVED ${slug} (${html.length} bytes) robots="${robots}"`);
    const ok = await runPrepare(slug);
    results.push({ slug, url, status: ok ? 'ok' : 'prepare-failed', robots });
  } catch (err) {
    console.warn(`FAIL ${slug}:`, err.message || err);
    results.push({ slug, url, status: 'failed', error: String(err), robots: null });
  }
}

await updateInventory(results.filter((r) => r.status === 'ok' || r.status === 'prepare-failed'));

console.log('\nSummary:');
for (const r of results) {
  console.log(`  ${r.slug}: ${r.status} robots=${r.robots || '-'}`);
}
const failed = results.filter((r) => r.status !== 'ok');
process.exit(failed.length ? 1 : 0);
