import { readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectfm.ae';
const FIX = process.argv.includes('--fix');
const CHECK_PAGES = process.argv.includes('--pages');

const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif|ico|bmp|woff2?|ttf|otf)(\?|$)/i;
const PATH_RE = /\/wp-content\/[^"'\\)\s?#]+/gi;
const ABS_RE = /https?:\/\/(?:www\.)?connectfm\.ae(\/[^"'\\)\s]*)/gi;

function toLocalPath(pathname) {
  const clean = pathname.split('?')[0].split('#')[0];
  return join(PUBLIC, ...clean.split('/').filter(Boolean));
}

function collectFromText(text, source) {
  /** @type {{url:string, path:string, source:string}[]} */
  const hits = [];
  for (const m of text.matchAll(ABS_RE)) {
    const path = m[1].split('?')[0].split('#')[0];
    if (!IMG_EXT.test(path) && !path.includes('/uploads/') && !path.includes('/wp-content/')) continue;
    if (/\.(css|js)(\?|$)/i.test(path)) continue;
    hits.push({ url: ORIGIN + path, path, source });
  }
  // also root-relative image urls that may be missing locally
  for (const m of text.matchAll(/(?:src|srcset|href|content|poster|data-src|data-lazy-src)=["']([^"']+)["']/gi)) {
    const raw = m[1];
    for (const part of raw.split(',').map((s) => s.trim().split(/\s+/)[0])) {
      if (!part.startsWith('/wp-content/')) continue;
      const path = part.split('?')[0].split('#')[0];
      if (!IMG_EXT.test(path) && !path.includes('/uploads/')) continue;
      hits.push({ url: ORIGIN + path, path, source });
    }
  }
  for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    let raw = m[1].trim();
    if (raw.startsWith('https://connectfm.ae') || raw.startsWith('http://connectfm.ae') || raw.startsWith('https://www.connectfm.ae')) {
      raw = raw.replace(/^https?:\/\/(?:www\.)?connectfm\.ae/, '');
    }
    if (!raw.startsWith('/wp-content/')) continue;
    const path = raw.split('?')[0].split('#')[0];
    if (!IMG_EXT.test(path) && !path.includes('/uploads/')) continue;
    hits.push({ url: ORIGIN + path, path, source });
  }
  return hits;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'connectfm-local-asset-check/1.0', Referer: ORIGIN + '/' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function rewriteAbsInFile(filePath) {
  let text = readFileSync(filePath, 'utf8');
  const before = text;
  text = text.replace(/https?:\/\/(?:www\.)?connectfm\.ae(\/wp-content\/[^"'\\)\s]*)/gi, '$1');
  if (text !== before) {
    writeFileSync(filePath, text);
    return true;
  }
  return false;
}

async function main() {
  const sources = [];
  // CSS with known live urls
  sources.push(join(PUBLIC, 'css/connectfm-typography.css'));
  sources.push(join(PUBLIC, 'css/migration-overrides.css'));
  sources.push(join(PUBLIC, 'css/live-inline.css'));
  sources.push(join(PUBLIC, 'css/elementor-bg-fallback.css'));
  sources.push(join(PUBLIC, 'css/wp-custom.css'));

  // Elementor CSS in public
  const { readdirSync, statSync } = await import('node:fs');
  function walk(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p, out);
      else if (/\.(css|html|js|json)$/i.test(name)) out.push(p);
    }
    return out;
  }
  walk(join(PUBLIC, 'wp-content/uploads/elementor/css'), sources);
  walk(join(ROOT, 'src/data'), sources);
  walk(join(ROOT, 'src/content'), sources);

  if (CHECK_PAGES) {
    const pages = [
      '/',
      '/top-hvac-companies-in-dubai/',
      '/blog/',
      '/contact-us/',
      '/about-us/',
    ];
    for (const path of pages) {
      try {
        const res = await fetch('http://127.0.0.1:5087' + path);
        const html = await res.text();
        const tmp = join(ROOT, 'scripts', `_scan-${path.replace(/\W+/g, '_') || 'home'}.html`);
        writeFileSync(tmp, html);
        sources.push(tmp);
      } catch (e) {
        console.warn('page fetch fail', path, e.message);
      }
    }
  }

  /** @type {Map<string,{url:string,path:string,sources:Set<string>}>} */
  const byPath = new Map();
  for (const src of sources) {
    if (!existsSync(src)) continue;
    const text = readFileSync(src, 'utf8');
    for (const hit of collectFromText(text, src)) {
      const cur = byPath.get(hit.path) || { url: hit.url, path: hit.path, sources: new Set() };
      cur.sources.add(src.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
      byPath.set(hit.path, cur);
    }
  }

  const missing = [];
  const present = [];
  for (const item of [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const local = toLocalPath(item.path);
    if (existsSync(local)) present.push(item);
    else missing.push({ ...item, local });
  }

  console.log(`Referenced image/upload assets: ${byPath.size}`);
  console.log(`Present locally: ${present.length}`);
  console.log(`Missing locally: ${missing.length}`);
  for (const m of missing.slice(0, 80)) {
    console.log(' MISSING', m.path);
  }

  // Absolute live image URLs still written in source files
  const absLiveFiles = [];
  for (const src of sources) {
    if (!existsSync(src)) continue;
    if (src.includes('scripts/_scan-')) continue;
    const text = readFileSync(src, 'utf8');
    const matches = [...text.matchAll(ABS_RE)].map((m) => m[0]);
    const imgMatches = matches.filter((u) => IMG_EXT.test(u) || u.includes('/uploads/'));
    if (imgMatches.length) absLiveFiles.push({ src: src.replace(ROOT, ''), count: imgMatches.length, samples: [...new Set(imgMatches)].slice(0, 5) });
  }
  console.log(`\nFiles still containing absolute connectfm.ae asset URLs: ${absLiveFiles.length}`);
  for (const f of absLiveFiles) {
    console.log(' FILE', f.src, 'count', f.count);
    f.samples.forEach((s) => console.log('  ', s));
  }

  if (FIX) {
    let dlOk = 0;
    let dlFail = 0;
    for (const m of missing) {
      try {
        await download(m.url, m.local);
        dlOk += 1;
        console.log(' DL', m.path);
      } catch (e) {
        dlFail += 1;
        console.warn(' FAIL', m.path, e.message);
      }
    }
    let rewritten = 0;
    const rewriteTargets = [
      join(PUBLIC, 'css/connectfm-typography.css'),
      join(PUBLIC, 'css/migration-overrides.css'),
      join(PUBLIC, 'css/live-inline.css'),
      join(PUBLIC, 'css/elementor-bg-fallback.css'),
      join(PUBLIC, 'css/wp-custom.css'),
      ...walk(join(PUBLIC, 'wp-content/uploads/elementor/css')),
      ...walk(join(ROOT, 'src/data')),
      ...walk(join(ROOT, 'src/content')),
    ];
    for (const f of rewriteTargets) {
      if (existsSync(f) && rewriteAbsInFile(f)) {
        rewritten += 1;
        console.log(' REWRITE', f.replace(ROOT, ''));
      }
    }
    // sync dist client copies for css
    const distCss = join(ROOT, 'dist/client/css');
    if (existsSync(distCss)) {
      for (const name of ['connectfm-typography.css', 'migration-overrides.css', 'live-inline.css', 'elementor-bg-fallback.css', 'wp-custom.css']) {
        const from = join(PUBLIC, 'css', name);
        const to = join(distCss, name);
        if (existsSync(from)) writeFileSync(to, readFileSync(from));
      }
    }
    console.log(`\nDownloaded ${dlOk}, failed ${dlFail}, rewritten files ${rewritten}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
