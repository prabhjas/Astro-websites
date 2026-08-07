#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://peomiddleast.com';

function listCleaned(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) listCleaned(p, out);
    else if (name.name.endsWith('.cleaned.html')) out.push(p);
  }
  return out;
}

function collectUrls(html) {
  const set = new Set();
  for (const m of html.matchAll(/(?:src|href|content)="(\/(?:wp-content|wp-includes)\/[^"?#]+)"/gi)) {
    set.add(m[1]);
  }
  for (const m of html.matchAll(/url\(\s*['"]?(\/(?:wp-content|wp-includes)\/[^'")?#]+)['"]?\s*\)/gi)) {
    set.add(m[1]);
  }
  return [...set];
}

function isSoft404Buf(buf, filePath = '') {
  if (!buf || buf.length < 20) return true;
  const ext = extname(filePath).toLowerCase();
  if (['.svg', '.css', '.js', '.html', '.json'].includes(ext)) return false;
  const head = buf.subarray(0, 120).toString('utf8');
  return buf[0] === 0x3c && /<!DOCTYPE|<html/i.test(head);
}

function isRealLocal(dest) {
  if (!existsSync(dest) || statSync(dest).size < 40) return false;
  return !isSoft404Buf(readFileSync(dest).subarray(0, 120), dest);
}

async function download(urlPath) {
  const dest = join(PUBLIC, ...urlPath.split('/').filter(Boolean));
  if (isRealLocal(dest)) return 'cached';
  if (existsSync(dest) && isSoft404Buf(readFileSync(dest).subarray(0, 120), dest)) {
    unlinkSync(dest);
  }
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(`${ORIGIN}${urlPath}`, {
    headers: { 'User-Agent': 'peomiddleast-asset-fixer/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html') || isSoft404Buf(buf, dest)) {
    throw new Error('soft404-html');
  }
  writeFileSync(dest, buf);
  return 'new';
}

const files = listCleaned(LEGACY);
const urls = new Set();
for (const f of files) {
  for (const u of collectUrls(readFileSync(f, 'utf8'))) urls.add(u);
}

const missing = [...urls].filter((u) => !isRealLocal(join(PUBLIC, ...u.split('/').filter(Boolean))));
console.log(`referenced=${urls.size} missing=${missing.length}`);

let ok = 0;
let fail = 0;
for (const u of missing) {
  try {
    const st = await download(u);
    console.log(st, u);
    ok++;
  } catch (err) {
    console.warn('FAIL', u, err.message || err);
    fail++;
  }
}
console.log(`downloaded=${ok} failed=${fail}`);

const still = [...urls].filter((u) => !isRealLocal(join(PUBLIC, ...u.split('/').filter(Boolean))));
console.log(`still_missing=${still.length}`);
for (const u of still) console.log(' ', u);
