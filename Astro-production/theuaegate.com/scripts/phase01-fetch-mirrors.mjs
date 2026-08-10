#!/usr/bin/env node
/**
 * Phase 01 — fetch live HTML mirrors + referenced same-origin assets for theuaegate.com
 *
 * Usage:
 *   node scripts/phase01-fetch-mirrors.mjs
 *   node scripts/phase01-fetch-mirrors.mjs --assets
 *   node scripts/phase01-fetch-mirrors.mjs --force
 */
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://theuaegate.com';
const EXPORT_ROOT = join(ROOT, 'source', 'wordpress-exports');
const PUBLIC_ROOT = join(ROOT, 'public');
const SITEMAP_DIR = join(ROOT, 'source', 'sitemaps');
const MANIFEST = join(ROOT, 'source', 'phase01-manifest.json');

const args = process.argv.slice(2);
const force = args.includes('--force');
const doAssets = args.includes('--assets') || args.includes('--all');
const htmlOnly = !doAssets && !args.includes('--all');
const CONCURRENCY = 6;

const UA = 'theuaegate-astro-Phase01/0.1';

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function slugFromUrl(url) {
  const u = new URL(url);
  let path = u.pathname.replace(/\/$/, '');
  if (!path || path === '/') return 'homepage';
  // Decode %xx so Arabic folders stay under Windows MAX_PATH and stay human-readable.
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep encoded */
  }
  return path.replace(/^\//, '').replace(/\/+/g, '/');
}

function kindFromSitemapName(name) {
  if (name.includes('law')) return 'law';
  if (name.includes('post')) return 'post';
  if (name.includes('page')) return 'page';
  return 'other';
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
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

async function loadEntriesFromLocalSitemaps() {
  const files = (await readdir(SITEMAP_DIR)).filter((f) => f.endsWith('.xml') && f !== 'sitemap_index.xml');
  /** @type {{ slug: string, url: string, kind: string }[]} */
  const entries = [];
  const seen = new Set();
  for (const file of files) {
    const xml = await readFile(join(SITEMAP_DIR, file), 'utf8');
    const kind = kindFromSitemapName(file);
    for (const loc of extractLocs(xml)) {
      if (!loc.startsWith(ORIGIN)) continue;
      if (loc.includes('sitemap')) continue;
      const slug = slugFromUrl(loc);
      if (seen.has(slug)) continue;
      seen.add(slug);
      entries.push({ slug, url: loc.endsWith('/') || loc === ORIGIN + '/' ? loc : `${loc}/`, kind });
    }
  }
  // normalize homepage url
  for (const e of entries) {
    if (e.slug === 'homepage') e.url = `${ORIGIN}/`;
  }
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

function collectSameOriginAssetUrls(html, pageUrl) {
  const urls = new Set();
  const attrs = [
    /(?:src|href|poster)=["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /srcset=["']([^"']+)["']/gi,
  ];
  for (const re of attrs) {
    let m;
    while ((m = re.exec(html))) {
      const raw = m[1];
      if (re.source.includes('srcset')) {
        for (const part of raw.split(',')) {
          const u = part.trim().split(/\s+/)[0];
          pushAsset(urls, u, pageUrl);
        }
      } else {
        pushAsset(urls, raw, pageUrl);
      }
    }
  }
  // Elementor / WP CSS often references /wp-content/
  return [...urls];
}

function pushAsset(set, raw, pageUrl) {
  if (!raw || raw.startsWith('data:') || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
  let abs;
  try {
    abs = new URL(raw, pageUrl);
  } catch {
    return;
  }
  if (abs.origin !== ORIGIN) return;
  const path = abs.pathname;
  // skip HTML routes; keep static-ish assets
  if (path.endsWith('/') || path === '') return;
  const ext = extname(path).toLowerCase();
  const keepExt = new Set([
    '.css', '.js', '.mjs', '.map',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.pdf', '.json', '.xml', '.txt',
  ]);
  if (!keepExt.has(ext) && !path.includes('/wp-content/') && !path.includes('/wp-includes/')) return;
  if (path.endsWith('.php') || path.includes('.php?')) return;
  set.add(abs.href.split('#')[0].split('?')[0]);
}

async function downloadBinary(url, dest) {
  if (existsSync(dest) && !force) return 'skip';
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  if (!res.body) throw new Error(`no body for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'ok';
}

async function fetchHtmlEntry(entry) {
  const dir = join(EXPORT_ROOT, entry.slug);
  const out = join(dir, 'index-https.html');
  if (existsSync(out) && !force) {
    const html = await readFile(out, 'utf8');
    return { ...entry, status: 'skip', bytes: html.length, assetUrls: collectSameOriginAssetUrls(html, entry.url) };
  }
  try {
    const html = await fetchText(entry.url);
    await mkdir(dir, { recursive: true });
    await writeFile(out, html, 'utf8');
    await writeFile(
      join(dir, 'notes.md'),
      `# ${entry.slug}\n\n| Field | Value |\n|-------|-------|\n| Kind | ${entry.kind} |\n| Live URL | ${entry.url} |\n| Fetched | ${new Date().toISOString()} |\n`,
      'utf8',
    );
    return { ...entry, status: 'ok', bytes: html.length, assetUrls: collectSameOriginAssetUrls(html, entry.url) };
  } catch (err) {
    return { ...entry, status: 'error', error: String(err?.message || err), assetUrls: [] };
  }
}

async function main() {
  await mkdir(EXPORT_ROOT, { recursive: true });
  await mkdir(PUBLIC_ROOT, { recursive: true });
  const entries = await loadEntriesFromLocalSitemaps();
  console.log(`Phase01: ${entries.length} unique URLs from local sitemaps`);

  const htmlResults = await mapPool(entries, CONCURRENCY, async (entry, idx) => {
    const r = await fetchHtmlEntry(entry);
    if ((idx + 1) % 10 === 0 || r.status === 'error') {
      console.log(`[html ${idx + 1}/${entries.length}] ${r.status} ${entry.slug}`);
    }
    return r;
  });

  const ok = htmlResults.filter((r) => r.status === 'ok' || r.status === 'skip');
  const err = htmlResults.filter((r) => r.status === 'error');
  console.log(`HTML done: ok/skip=${ok.length} error=${err.length}`);

  const assetSet = new Set();
  for (const r of ok) for (const u of r.assetUrls || []) assetSet.add(u);
  console.log(`Discovered same-origin assets: ${assetSet.size}`);

  /** @type {{ url: string, status: string, error?: string }[]} */
  let assetResults = [];
  if (!htmlOnly) {
    const assets = [...assetSet].sort();
    assetResults = await mapPool(assets, CONCURRENCY, async (url, idx) => {
      const path = new URL(url).pathname;
      const dest = join(PUBLIC_ROOT, path.replace(/^\//, ''));
      try {
        const status = await downloadBinary(url, dest);
        if ((idx + 1) % 50 === 0) console.log(`[asset ${idx + 1}/${assets.length}] ${status}`);
        return { url, status };
      } catch (e) {
        return { url, status: 'error', error: String(e?.message || e) };
      }
    });
    const aOk = assetResults.filter((a) => a.status === 'ok' || a.status === 'skip').length;
    const aErr = assetResults.filter((a) => a.status === 'error').length;
    console.log(`Assets done: ok/skip=${aOk} error=${aErr}`);
  } else {
    console.log('Skipping asset download (pass --assets). Asset URLs recorded in manifest.');
  }

  const manifest = {
    origin: ORIGIN,
    fetchedAt: new Date().toISOString(),
    html: htmlResults.map(({ slug, url, kind, status, bytes, error }) => ({ slug, url, kind, status, bytes, error })),
    assetUrls: [...assetSet].sort(),
    assetResults: assetResults.slice(0, 5000),
  };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote ${MANIFEST}`);
  if (err.length) {
    console.log('HTML errors:');
    for (const e of err.slice(0, 20)) console.log(`  ${e.slug}: ${e.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
