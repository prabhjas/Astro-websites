#!/usr/bin/env node
/**
 * Scan all public CSS for url(...) assets missing on disk; download from live.
 */
import { createWriteStream, existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LIVE = '';

function walk(dir, acc = []) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of names) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (/\.css$/i.test(name)) acc.push(full);
  }
  return acc;
}

async function download(path) {
  const dest = join(PUBLIC, path.replace(/^\//, ''));
  if (existsSync(dest)) return 'skip';
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(LIVE + path, {
    headers: { 'User-Agent': 'cfs-css-asset-sync/0.1' },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'ok';
}

async function main() {
  const cssFiles = walk(join(PUBLIC, 'wp-content'));
  const needed = new Set();
  for (const file of cssFiles) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const relCss = file.slice(PUBLIC.length).replace(/\\/g, '/');
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      let raw = m[1].trim().split('?')[0].split('#')[0].replace(/&amp;/g, '&');
      if (!raw || raw.startsWith('data:')) continue;
      if (!/\.(woff2?|ttf|eot|otf|png|jpe?g|gif|svg|webp|ico)$/i.test(raw)) continue;
      let abs;
      try {
        abs = new URL(raw, LIVE + relCss);
      } catch {
        continue;
      }
      if (!abs.pathname.startsWith('/wp-content/') && !abs.pathname.startsWith('/wp-includes/')) continue;
      const dest = join(PUBLIC, abs.pathname.replace(/^\//, ''));
      if (!existsSync(dest)) needed.add(abs.pathname);
    }
  }
  console.log(`css_files=${cssFiles.length} missing_on_disk=${needed.size}`);
  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const path of [...needed].sort()) {
    try {
      const r = await download(path);
      if (r === 'skip') skip++;
      else ok++;
      if ((ok + skip) % 25 === 0) console.log(`… ${ok + skip}/${needed.size}`);
    } catch (e) {
      fail++;
      if (fail <= 15) console.log('FAIL', path, e.message);
    }
  }
  console.log(`done ok=${ok} skip=${skip} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
