#!/usr/bin/env node
/**
 * Fill missing local media referenced by HTML/CSS.
 * - Regenerates -WxH variants from local full-size with sips when possible
 * - Downloads from live only when response is real image bytes (never HTML soft-404)
 *
 * Usage: node scripts/fill-missing-assets.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://snapsale.ae';
const UA = 'Mozilla/5.0 (compatible; SnapsaleAssetFill/1.0)';
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif']);

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
  const ls = buf.subarray(0, 120).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase();
  return ls.startsWith('<!doctype') || ls.startsWith('<html');
}

function magicOk(buf, ext) {
  if (!buf || buf.length < 24 || isHtmlBuf(buf)) return false;
  if (ext === '.svg') {
    const t = buf.subarray(0, 400).toString('utf8').toLowerCase();
    return t.includes('<svg') || t.includes('<?xml');
  }
  if (ext === '.png') return (buf[0] === 0x89 && buf[1] === 0x50) || (buf[0] === 0xff && buf[1] === 0xd8);
  if (ext === '.jpg' || ext === '.jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (ext === '.webp') return buf.toString('ascii', 0, 4) === 'RIFF';
  if (ext === '.gif') return buf.toString('ascii', 0, 4) === 'GIF8';
  return buf.length > 200;
}

function extractUrls(text) {
  const urls = new Set();
  const re =
    /(?:src|href|data-src|data-lazy-src|poster)=["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|srcset=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[1] || m[2] || m[3] || '';
    for (const part of raw.split(',')) {
      let u = part.trim().split(/\s+/)[0];
      if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('tel:')) continue;
      if (u.startsWith('https://snapsale.ae')) u = u.slice('https://snapsale.ae'.length);
      if (u.startsWith('http://snapsale.ae')) u = u.slice('http://snapsale.ae'.length);
      if (u.startsWith('//snapsale.ae')) u = u.slice('//snapsale.ae'.length);
      u = u.split('?')[0];
      if (u.startsWith('/wp-content/') || u.startsWith('/images/') || u.startsWith('/chrome/')) urls.add(u);
    }
  }
  return urls;
}

function collectRefs() {
  const roots = [
    join(ROOT, 'src/legacy'),
    join(PUBLIC, 'css'),
    join(PUBLIC, 'chrome'),
    join(PUBLIC, 'wp-content/uploads/elementor/css'),
  ];
  const refs = new Set();
  for (const r of roots) {
    for (const f of walk(r).filter((x) => /\.(html|css)$/i.test(x))) {
      try {
        for (const u of extractUrls(readFileSync(f, 'utf8'))) refs.add(u);
      } catch {
        /* skip */
      }
    }
  }
  return [...refs].filter((u) => IMG_EXT.has(extname(u).toLowerCase()));
}

async function fetchImage(url) {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (isHtmlBuf(buf)) return null;
    return buf;
  } catch {
    return null;
  }
}

function resizeFromFull(fullAbs, destAbs, w, h) {
  mkdirSync(dirname(destAbs), { recursive: true });
  const r = spawnSync(
    'sips',
    ['-z', String(h), String(w), fullAbs, '--out', destAbs],
    { encoding: 'utf8' },
  );
  return r.status === 0 && existsSync(destAbs) && magicOk(readFileSync(destAbs), extname(destAbs).toLowerCase());
}

const missing = [];
for (const u of collectRefs().sort()) {
  const abs = join(PUBLIC, u.replace(/^\//, ''));
  const ext = extname(u).toLowerCase();
  if (!existsSync(abs) || !magicOk(readFileSync(abs), ext)) missing.push(u);
}

console.log(`fill-missing-assets: ${missing.length} to fill`);
let ok = 0;
let fail = 0;
const failed = [];

for (const u of missing) {
  const abs = join(PUBLIC, u.replace(/^\//, ''));
  const ext = extname(u).toLowerCase();
  const m = u.match(/-(\d+)x(\d+)(\.[a-z0-9]+)$/i);
  let done = false;

  if (m) {
    const fullRel = u.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
    const fullAbs = join(PUBLIC, fullRel.replace(/^\//, ''));
    if (existsSync(fullAbs) && magicOk(readFileSync(fullAbs), extname(fullAbs).toLowerCase())) {
      if (resizeFromFull(fullAbs, abs, Number(m[1]), Number(m[2]))) {
        console.log(`OK  resize ${u}`);
        ok += 1;
        done = true;
      }
    }
  }

  if (!done) {
    const fullRel = m ? u.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '') : u;
    const candidates = [ORIGIN + u];
    if (m) candidates.push(ORIGIN + fullRel);
    for (const url of candidates) {
      const buf = await fetchImage(url);
      if (!buf) continue;
      const srcExt = extname(new URL(url).pathname).toLowerCase();
      const bufOk = magicOk(buf, ext) || magicOk(buf, srcExt) || magicOk(buf, '.jpg') || magicOk(buf, '.png');
      if (!bufOk) continue;

      mkdirSync(dirname(abs), { recursive: true });
      if (m && url.endsWith(fullRel)) {
        const fullAbs = join(PUBLIC, fullRel.replace(/^\//, ''));
        mkdirSync(dirname(fullAbs), { recursive: true });
        if (!existsSync(fullAbs)) writeFileSync(fullAbs, buf);
        if (resizeFromFull(fullAbs, abs, Number(m[1]), Number(m[2]))) {
          console.log(`OK  fetch+resize ${u}`);
          ok += 1;
          done = true;
          break;
        }
      } else {
        writeFileSync(abs, buf);
        if (magicOk(readFileSync(abs), ext) || (ext === '.png' && magicOk(buf, '.jpg'))) {
          console.log(`OK  fetch ${u}`);
          ok += 1;
          done = true;
          break;
        }
      }
    }
  }

  if (!done) {
    fail += 1;
    failed.push(u);
    console.log(`FAIL ${u}`);
  }
}

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(
  join(ROOT, 'docs/asset-fill-report.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), ok, fail, failed }, null, 2),
);
console.log(`done ok=${ok} fail=${fail}`);
process.exit(fail ? 1 : 0);
