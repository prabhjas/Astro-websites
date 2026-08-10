#!/usr/bin/env node
/**
 * Audit missing image/font assets on local CFS vs live.
 */
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CFS_BASE || 'http://127.0.0.1:5114';
const LIVE = 'https://companyformationsaudi.com';
const PUBLIC = join(ROOT, 'public');
const shouldDownload = process.argv.includes('--download');

async function fetchText(url) {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'cfs-asset-audit/0.1' },
  });
  return { status: r.status, text: await r.text() };
}

async function statusOf(url) {
  try {
    const r = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'cfs-asset-audit/0.1' },
    });
    return r.status;
  } catch {
    return 0;
  }
}

function collectAssetUrls(html, origin) {
  const urls = new Set();
  const push = (u) => {
    if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('javascript:')) return;
    u = u.replace(/&amp;/g, '&').replace(/&#038;/g, '&').trim();
    try {
      const abs = new URL(u, origin);
      if (
        abs.hostname === '127.0.0.1' ||
        abs.hostname === 'localhost' ||
        abs.hostname.endsWith('companyformationsaudi.com') ||
        abs.hostname.endsWith('fonts.googleapis.com') ||
        abs.hostname.endsWith('fonts.gstatic.com')
      ) {
        urls.add(abs.href);
      }
    } catch {
      /* ignore */
    }
  };

  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) push(m[1]);
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) push(part.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/"url"\s*:\s*"((?:\\\/|\/)wp-content[^"\\]+)"/gi)) {
    push(m[1].replace(/\\\//g, '/'));
  }
  return [...urls];
}

async function download(url, dest) {
  if (existsSync(dest) && !process.argv.includes('--force')) return 'skip';
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'cfs-asset-audit/0.1' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'ok';
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const pages = [
    '/',
    '/about-us/',
    '/contact-us/',
    '/saudi-business-visa/',
    '/law/article-77-saudi-labor-law/',
    '/legal-services/',
  ];

  /** @type {Set<string>} */
  const all = new Set();
  for (const p of pages) {
    const local = await fetchText(BASE + p);
    console.log('page', p, local.status);
    if (local.status !== 200) continue;
    for (const u of collectAssetUrls(local.text, BASE + p)) all.add(u);
  }

  const localPaths = [];
  const externalFonts = [];
  for (const href of all) {
    const u = new URL(href);
    if (u.hostname.endsWith('fonts.googleapis.com') || u.hostname.endsWith('fonts.gstatic.com')) {
      externalFonts.push(href);
      continue;
    }
    if (!u.pathname.startsWith('/wp-content/') && !u.pathname.startsWith('/wp-includes/') && !u.pathname.startsWith('/chrome/') && !u.pathname.startsWith('/css/') && !u.pathname.startsWith('/fonts/')) {
      continue;
    }
    localPaths.push(u.pathname);
  }

  const uniquePaths = [...new Set(localPaths)].sort();
  console.log('paths_to_check', uniquePaths.length, 'external_font_urls', externalFonts.length);

  const missing = [];
  await mapPool(uniquePaths, 8, async (path) => {
    const st = await statusOf(BASE + encodeURI(path).replace(/%2F/gi, '/'));
    // encodeURI keeps slashes; better use path as-is with fetch URL constructor
    const st2 = await statusOf(new URL(path, BASE).href);
    const status = st2 || st;
    if (status >= 400 || status === 0) missing.push({ path, status });
  });

  missing.sort((a, b) => a.path.localeCompare(b.path));
  console.log('missing', missing.length);
  for (const m of missing.slice(0, 50)) console.log('  ', m.status, m.path);

  // Probe google fonts CSS from homepage
  const home = await fetchText(BASE + '/');
  const live = await fetchText(LIVE + '/');
  const gfLocal = [...home.text.matchAll(/https:\/\/fonts\.googleapis\.com\/css[^"'<\s]+/gi)].map((m) =>
    m[0].replace(/&#038;/g, '&').replace(/&amp;/g, '&'),
  );
  const gfLive = [...live.text.matchAll(/https:\/\/fonts\.googleapis\.com\/css[^"'<\s]+/gi)].map((m) =>
    m[0].replace(/&#038;/g, '&').replace(/&amp;/g, '&'),
  );
  console.log('gf_local_count', new Set(gfLocal).size, 'gf_live_count', new Set(gfLive).size);
  for (const u of new Set([...gfLocal, ...gfLive])) {
    console.log('gf_status', await statusOf(u), u.slice(0, 140));
  }

  // Live vs local kit CSS: look for font-face files in linked CSS
  const cssHrefs = [...home.text.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1]);
  const cssMissingFonts = [];
  for (const href of cssHrefs.slice(0, 80)) {
    let abs;
    try {
      abs = new URL(href, BASE);
    } catch {
      continue;
    }
    if (!abs.pathname.startsWith('/wp-content/') && !abs.pathname.startsWith('/wp-includes/')) continue;
    if ((await statusOf(abs.href)) >= 400) continue;
    const css = (await fetchText(abs.href)).text;
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const raw = m[1].split('?')[0];
      if (!/\.(woff2?|ttf|eot|otf|png|jpe?g|svg|gif|webp)$/i.test(raw)) continue;
      let asset;
      try {
        asset = new URL(raw, abs.href);
      } catch {
        continue;
      }
      if (!asset.hostname.includes('127.0.0.1') && !asset.hostname.includes('companyformationsaudi.com') && asset.hostname !== 'localhost') continue;
      const st = await statusOf(asset.href);
      if (st >= 400 || st === 0) {
        cssMissingFonts.push({ css: abs.pathname, asset: asset.pathname, st });
      }
    }
  }

  const cssMissUnique = [...new Map(cssMissingFonts.map((x) => [x.asset, x])).values()];
  console.log('css_missing_assets', cssMissUnique.length);
  for (const m of cssMissUnique.slice(0, 40)) console.log('  ', m.st, m.asset, 'from', m.css);

  const toFetch = [...new Set([...missing.map((m) => m.path), ...cssMissUnique.map((m) => m.asset)])];

  if (shouldDownload && toFetch.length) {
    console.log('Downloading', toFetch.length, 'from live…');
    let ok = 0,
      fail = 0;
    await mapPool(toFetch, 6, async (path) => {
      const dest = join(PUBLIC, path.replace(/^\//, ''));
      const remote = LIVE + path;
      try {
        const r = await download(remote, dest);
        ok++;
        if (ok % 20 === 0) console.log('  downloaded', ok);
        return r;
      } catch (e) {
        fail++;
        console.warn('FAIL', path, e.message);
      }
    });
    console.log('download done ok=', ok, 'fail=', fail);
  }

  await writeFile(
    join(ROOT, 'source/asset-audit-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), missing, cssMissUnique, toFetch }, null, 2),
  );
  console.log('Wrote source/asset-audit-report.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
