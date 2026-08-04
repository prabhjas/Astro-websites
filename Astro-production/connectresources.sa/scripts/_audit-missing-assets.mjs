#!/usr/bin/env node
import { existsSync, mkdirSync, createWriteStream, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectresources.sa';

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

async function download(urlPath) {
  const dest = join(PUBLIC, ...urlPath.split('/').filter(Boolean));
  if (existsSync(dest)) return 'cached';
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(`${ORIGIN}${urlPath}`, {
    headers: { 'User-Agent': 'connectresources-sa-asset-fixer/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'new';
}

const files = listCleaned(LEGACY);
const urls = new Set();
for (const f of files) {
  for (const u of collectUrls(readFileSync(f, 'utf8'))) urls.add(u);
}

const missing = [...urls].filter((u) => !existsSync(join(PUBLIC, ...u.split('/').filter(Boolean))));
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

const still = [...urls].filter((u) => !existsSync(join(PUBLIC, ...u.split('/').filter(Boolean))));
console.log(`still_missing=${still.length}`);
for (const u of still) console.log(' ', u);
