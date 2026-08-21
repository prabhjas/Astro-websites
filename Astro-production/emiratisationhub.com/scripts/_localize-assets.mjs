#!/usr/bin/env node
/**
 * Localize remaining absolute / third-party media in cleaned HTML:
 * 1) Rewrite /... → /...
 * 2) Download third-party image hosts into public/ and rewrite to local paths
 * 3) Download any still-missing /wp-content|/wp-includes assets from live
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const LIVE = '';

const EXTERNAL_HOSTS = [
  'connectgroup.co',
  'www.connectgroup.co',
  'emiratisationnafis.org',
  'www.emiratisationnafis.org',
];

function walk(dir, acc = []) {
  for (const n of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.name.endsWith('.cleaned.html')) acc.push(p);
  }
  return acc;
}

function localPathForExternal(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
  const base = u.pathname.split('/').pop() || 'asset.bin';
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `/wp-content/uploads/_external/${host}/${hash}-${safe}`;
}

async function download(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 50) return 'exists';
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AstroMirror/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50) throw new Error('too small');
  writeFileSync(dest, buf);
  return 'downloaded';
}

function collectMissingLocalPaths(html) {
  const missing = new Set();
  const re = /(?:https:\/\/(?:www\.)?emiratisationhub\.com)?(\/(?:wp-content|wp-includes)\/[^"'\\\s>?#]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const path = m[1].split('?')[0].replace(/[),]+$/, '');
    if (!path || path.includes(')')) continue;
    const disk = join(PUBLIC, path.replace(/^\//, ''));
    if (!existsSync(disk) || statSync(disk).size < 50) missing.add(path);
  }
  return missing;
}

async function main() {
  const files = walk(LEGACY);
  let rewrittenFiles = 0;
  const externalMap = new Map(); // remote → local
  const missingLocal = new Set();

  for (const f of files) {
    let html = readFileSync(f, 'utf8');
    const before = html;

    html = html
      .replace(/https:\/\/(?:www\.)?emiratisationhub\.com\//g, '/')
      .replace(/http:\/\/(?:www\.)?emiratisationhub\.com\//g, '/');

    for (const host of EXTERNAL_HOSTS) {
      const re = new RegExp(`https?:\\/\\/${host.replace(/\./g, '\\.')}\\/[^"'\\\\\\s>]+`, 'gi');
      html = html.replace(re, (url) => {
        const clean = url.replace(/[),]+$/, '');
        if (!/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(clean)) return url;
        if (!externalMap.has(clean)) externalMap.set(clean, localPathForExternal(clean));
        return externalMap.get(clean);
      });
    }

    for (const path of collectMissingLocalPaths(html)) missingLocal.add(path);

    if (html !== before) {
      writeFileSync(f, html, 'utf8');
      rewrittenFiles += 1;
    }
  }

  console.log(`Rewrote absolute/local URLs in ${rewrittenFiles}/${files.length} files`);
  console.log(`External images to localize: ${externalMap.size}`);
  console.log(`Missing local wp assets: ${missingLocal.size}`);

  let got = 0;
  let fail = 0;
  for (const [remote, local] of externalMap) {
    const dest = join(PUBLIC, local.replace(/^\//, ''));
    try {
      const status = await download(remote, dest);
      console.log(`${status} ${local}`);
      got += 1;
    } catch (e) {
      console.warn(`FAIL ${remote}: ${e.message}`);
      fail += 1;
    }
  }

  for (const path of missingLocal) {
    const dest = join(PUBLIC, path.replace(/^\//, ''));
    const remote = `${LIVE}${path}`;
    try {
      const status = await download(remote, dest);
      if (status === 'downloaded') console.log(`downloaded ${path}`);
      got += 1;
    } catch (e) {
      console.warn(`FAIL ${path}: ${e.message}`);
      fail += 1;
    }
  }

  console.log(JSON.stringify({ got, fail, external: externalMap.size, missingLocal: missingLocal.size }, null, 2));
}

await main();
