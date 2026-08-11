#!/usr/bin/env node
/**
 * Restore HTML-junk / bad-magic upload files.
 *
 * Live Movey 301s many deleted upload paths to the homepage (Connect FZ mode).
 * Strategy:
 *   1) Reject live soft-404 HTML
 *   2) WP media API — strict token overlap, download only real image bytes
 *   3) Same-page good image fallback (featured / content) from cleaned HTML
 *   4) Convert PNG→JPEG (and vice versa) with `sips` when extension requires it
 *
 * Usage: node scripts/restore-junk-uploads.mjs
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const UPLOADS = join(PUBLIC, 'wp-content/uploads');
const ORIGIN = 'https://movey.ae';
const UA = 'Mozilla/5.0 (compatible; MoveyAssetRestore/1.2)';
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function isHtmlBuf(buf) {
  if (!buf?.length) return true;
  const ls = buf.subarray(0, 120).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase();
  return ls.startsWith('<!doctype') || ls.startsWith('<html');
}

function magicOk(buf, ext) {
  if (!buf || buf.length < 24 || isHtmlBuf(buf)) return false;
  if (ext === '.svg') {
    const t = buf.subarray(0, 400).toString('utf8').toLowerCase();
    return t.includes('<svg') || t.includes('<?xml');
  }
  if (ext === '.png') return buf[0] === 0x89 && buf[1] === 0x50;
  if (ext === '.jpg' || ext === '.jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (ext === '.webp') return buf.toString('ascii', 0, 4) === 'RIFF';
  if (ext === '.gif') return buf.toString('ascii', 0, 4) === 'GIF8';
  return buf.length > 500;
}

function detectKind(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF') return 'webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  return null;
}

function isBad(absPath) {
  const ext = extname(absPath).toLowerCase();
  if (!IMG_EXT.has(ext)) return false;
  if (!existsSync(absPath)) return true;
  return !magicOk(readFileSync(absPath), ext);
}

function tokens(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/-\d+x\d+$/i, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !['the', 'and', 'for', 'with', 'from', 'uae'].includes(t));
}

function scoreOverlap(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit += 1;
  return hit / Math.max(A.size, B.size);
}

async function fetchBuf(url, { allowRedirect = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      redirect: allowRedirect ? 'follow' : 'manual',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location') || '';
      if (!allowRedirect) return null;
      if (loc === ORIGIN || loc === `${ORIGIN}/` || /movey\.ae\/?$/i.test(loc)) return null;
    }
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (isHtmlBuf(buf)) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function convertToExt(buf, destExt) {
  const kind = detectKind(buf);
  const want =
    destExt === '.jpg' || destExt === '.jpeg'
      ? 'jpeg'
      : destExt === '.png'
        ? 'png'
        : destExt === '.webp'
          ? 'webp'
          : null;
  if (!want) return null;
  if (kind === want) return buf;
  // browsers tolerate jpeg-as-png sometimes; we still convert when possible
  const tmp = mkdtempSync(join(tmpdir(), 'movey-img-'));
  try {
    const srcExt = kind === 'jpeg' ? '.jpg' : kind === 'png' ? '.png' : kind === 'webp' ? '.webp' : '.bin';
    const src = join(tmp, `in${srcExt}`);
    const out = join(tmp, `out${destExt === '.jpeg' ? '.jpg' : destExt}`);
    writeFileSync(src, buf);
    const format = want === 'jpeg' ? 'jpeg' : want;
    const r = spawnSync('sips', ['-s', 'format', format, src, '--out', out], { encoding: 'utf8' });
    if (r.status !== 0 || !existsSync(out)) return null;
    const outBuf = readFileSync(out);
    return magicOk(outBuf, destExt === '.jpeg' ? '.jpg' : destExt) ? outBuf : null;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function writeImage(absPath, buf) {
  const ext = extname(absPath).toLowerCase();
  let out = buf;
  if (!magicOk(out, ext)) {
    const converted = convertToExt(buf, ext);
    if (!converted) return false;
    out = converted;
  }
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, out);
  return magicOk(readFileSync(absPath), ext);
}

function buildPageFallbacks() {
  /** @type {Map<string, string[]>} junkRel -> candidate local abs paths */
  const map = new Map();
  const legacy = walk(join(ROOT, 'src/legacy')).filter((f) => f.endsWith('.cleaned.html'));
  for (const htmlPath of legacy) {
    const html = readFileSync(htmlPath, 'utf8');
    const refs = [...html.matchAll(/\/wp-content\/uploads\/[^"'?\s>]+\.(?:jpe?g|png|webp|gif)/gi)].map(
      (m) => m[0].split('#')[0],
    );
    const uniq = [...new Set(refs)];
    const good = [];
    for (const u of uniq) {
      const abs = join(PUBLIC, u.replace(/^\//, ''));
      if (existsSync(abs) && !isBad(abs)) good.push(abs);
    }
    // prefer Featured-Image / larger files
    good.sort((a, b) => {
      const af = /featured-image/i.test(a) ? 0 : 1;
      const bf = /featured-image/i.test(b) ? 0 : 1;
      if (af !== bf) return af - bf;
      return statSync(b).size - statSync(a).size;
    });
    if (!good.length) continue;
    for (const u of uniq) {
      const abs = join(PUBLIC, u.replace(/^\//, ''));
      if (!isBad(abs) && existsSync(abs)) continue;
      const list = map.get(u) || [];
      for (const g of good.slice(0, 3)) if (!list.includes(g)) list.push(g);
      map.set(u, list);
    }
  }
  return map;
}

async function mediaCandidates(filename) {
  const stem = filename.replace(/\.[^.]+$/, '').replace(/-\d+x\d+$/i, '');
  const urls = [
    `${ORIGIN}/wp-json/wp/v2/media?search=${encodeURIComponent(stem)}&per_page=20`,
    `${ORIGIN}/wp-json/wp/v2/media?search=${encodeURIComponent(stem.replace(/-/g, ' '))}&per_page=20`,
  ];
  /** @type {{url:string, score:number}[]} */
  const scored = [];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const arr = await res.json();
      if (!Array.isArray(arr)) continue;
      for (const m of arr) {
        const sources = [];
        if (m.source_url) sources.push(m.source_url);
        for (const s of Object.values(m.media_details?.sizes || {})) {
          if (s.source_url) sources.push(s.source_url);
        }
        for (const src of sources) {
          const base = basename(decodeURIComponent(new URL(src).pathname));
          const score = Math.max(scoreOverlap(filename, base), scoreOverlap(stem, m.slug || ''));
          scored.push({ url: src, score });
        }
      }
    } catch {
      /* ignore */
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const s of scored) {
    if (s.score < 0.34) continue;
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out.slice(0, 6);
}

async function restoreOne(absPath, pageFallbacks) {
  const rel = '/' + relative(PUBLIC, absPath).replaceAll('\\', '/');
  const filename = basename(absPath);
  const ext = extname(absPath).toLowerCase();

  // 1) live exact (manual redirect — never follow home soft-404)
  let buf = await fetchBuf(ORIGIN + rel);
  if (buf && detectKind(buf)) {
    if (writeImage(absPath, buf)) return { ok: true, via: 'live' };
  }

  // 2) WP media with token score
  const cands = await mediaCandidates(filename);
  for (const c of cands) {
    buf = await fetchBuf(c.url, { allowRedirect: true });
    if (!buf || !detectKind(buf)) continue;
    if (writeImage(absPath, buf)) return { ok: true, via: `wp-media:${c.score.toFixed(2)}:${c.url}` };
  }

  // 3) same-page local good image
  const fallbacks = pageFallbacks.get(rel) || [];
  for (const fb of fallbacks) {
    const srcBuf = readFileSync(fb);
    if (!detectKind(srcBuf)) continue;
    if (writeImage(absPath, srcBuf)) {
      return { ok: true, via: `page-fallback:${relative(PUBLIC, fb)}` };
    }
  }

  return { ok: false };
}

const targets = walk(UPLOADS).filter(isBad);
console.log(`restore-junk-uploads: ${targets.length} bad files`);
const pageFallbacks = buildPageFallbacks();
console.log(`page fallback maps: ${pageFallbacks.size}`);

let ok = 0;
let fail = 0;
const failed = [];
const viaMap = {};
for (const f of targets) {
  const rel = relative(UPLOADS, f);
  const r = await restoreOne(f, pageFallbacks);
  if (r.ok) {
    ok += 1;
    viaMap['/wp-content/uploads/' + rel.replaceAll('\\', '/')] = r.via;
    console.log(`OK  ${rel} ← ${r.via}`);
  } else {
    fail += 1;
    failed.push('/wp-content/uploads/' + rel.replaceAll('\\', '/'));
    console.log(`FAIL ${rel}`);
  }
}

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(
  join(ROOT, 'docs/asset-restore-report.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), ok, fail, viaMap, failed }, null, 2),
);
console.log(`done ok=${ok} fail=${fail}`);
process.exit(fail ? 1 : 0);
