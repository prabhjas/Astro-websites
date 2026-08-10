#!/usr/bin/env node
/**
 * Find image/asset URLs referenced by CBC cleaned HTML that are missing under public/.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectbusinesscenter.com';

const paths = process.argv.slice(2);
const files = paths.length
  ? paths.map((p) => (p.endsWith('.cleaned.html') ? p : join(LEGACY, `${p}.cleaned.html`)))
  : readdirSync(LEGACY)
      .filter((f) => f.endsWith('.cleaned.html'))
      .map((f) => join(LEGACY, f));

const missing = new Map(); // localPath -> count
const ok = new Map();
const remoteOnly = new Map();

function toLocalPath(url) {
  let u = url.trim().split('#')[0].split('?')[0];
  if (u.startsWith('data:')) return null;
  if (u.startsWith('//')) u = 'https:' + u;
  if (u.startsWith(ORIGIN)) u = u.slice(ORIGIN.length);
  if (u.startsWith('https://www.connectbusinesscenter.com')) {
    u = u.slice('https://www.connectbusinesscenter.com'.length);
  }
  if (!u.startsWith('/')) return null;
  // skip non-assets
  if (!/\.(png|jpe?g|webp|gif|svg|avif|ico|woff2?|ttf|eot|otf|css|js|mp4|webm)($)/i.test(u) && !u.includes('/wp-content/')) {
    return null;
  }
  try {
    u = decodeURIComponent(u);
  } catch {
    /* keep */
  }
  return u;
}

function collect(html) {
  const found = new Set();
  const patterns = [
    /\b(?:src|data-src|data-lazy-src|data-bg|data-large_image|href)=(["'])([^"']+)\1/gi,
    /\bcontent=(["'])([^"']+\.(?:png|jpe?g|webp|gif|svg|avif)[^"']*)\1/gi,
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
    /(["'])(\/wp-content\/[^"']+\.(?:png|jpe?g|webp|gif|svg|avif|css|js|woff2?))\1/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const local = toLocalPath(m[2] || m[1]);
      if (local) found.add(local);
    }
  }
  return found;
}

for (const file of files) {
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  for (const rel of collect(html)) {
    const abs = join(PUBLIC, rel.replace(/^\//, ''));
    if (existsSync(abs) && statSync(abs).size > 0) {
      ok.set(rel, (ok.get(rel) || 0) + 1);
    } else if (rel.startsWith('http')) {
      remoteOnly.set(rel, (remoteOnly.get(rel) || 0) + 1);
    } else {
      missing.set(rel, (missing.get(rel) || 0) + 1);
    }
  }
}

const missList = [...missing.entries()].sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify({
  files: files.length,
  okUnique: ok.size,
  missingUnique: missList.length,
  missingRefs: missList.reduce((s, [, c]) => s + c, 0),
  topMissing: missList.slice(0, 40).map(([p, c]) => ({ path: p, refs: c })),
}, null, 2));
