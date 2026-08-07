#!/usr/bin/env node
/**
 * Pre-deploy asset gate (Connect FZ regression guard).
 *
 * 1) Collect /wp-content and /wp-includes refs from src + public
 * 2) Confirm files exist under public/
 * 3) Reject HTML soft-404s masquerading as images/css/js/fonts
 * 4) Optionally confirm public/wp-content is mirrored into dist/client
 *
 * Usage:
 *   node scripts/verify-assets.mjs
 *   node scripts/verify-assets.mjs --require-dist
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const DIST_CLIENT = join(ROOT, 'dist/client');
const DATA = join(ROOT, '.data');
const requireDist = process.argv.includes('--require-dist');

const TEXT_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.astro', '.md']);
const ASSET_EXT_RE =
  /\.(css|js|mjs|map|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|webp|avif|ico|json|mp4|webm|mov)$/i;
const BINARYISH = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.css',
  '.js',
  '.mjs',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.map',
  '.json',
  '.mp4',
]);

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '.git') continue;
      walkFiles(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function collectRefs(text, into) {
  const patterns = [
    /(?:https?:)?\/\/(?:www\.)?payrollmiddleast\.org(\/(?:wp-content|wp-includes)\/[^"'\\)\s?#]+)/gi,
    /(["'(])(\/(?:wp-content|wp-includes)\/[^"'\\)\s?#]+)/g,
    /url\(\s*['"]?(\/(?:wp-content|wp-includes)\/[^'")?#]+)['"]?\s*\)/gi,
    /https?:\/\/(?:www\.)?peomiddleast\.com(\/(?:wp-content|wp-includes)\/[^"'\\)\s?#]+)/gi,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const raw = (m[2] || m[1] || '').split('?')[0];
      if (raw && ASSET_EXT_RE.test(raw) && !raw.includes('*')) into.add(raw);
    }
  }
  for (const m of text.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0]?.split('?')[0];
      if (u?.startsWith('/wp-') && ASSET_EXT_RE.test(u)) into.add(u);
    }
  }
}

function isHtmlMasquerade(filePath) {
  const buf = readFileSync(filePath).subarray(0, 256);
  const low = Buffer.from(buf).toString('utf8').toLowerCase().trimStart();
  return low.startsWith('<!doctype') || low.startsWith('<html') || low.slice(0, 100).includes('<head>');
}

const refs = new Set();
for (const root of [join(ROOT, 'src'), PUBLIC]) {
  for (const file of walkFiles(root)) {
    const ext = extname(file).toLowerCase();
    if (!TEXT_EXTS.has(ext) && !file.endsWith('.cleaned.html')) continue;
    try {
      collectRefs(readFileSync(file, 'utf8'), refs);
    } catch {
      /* ignore */
    }
  }
}

const missing = [];
for (const u of [...refs].sort()) {
  const disk = join(PUBLIC, ...u.split('/').filter(Boolean));
  if (!existsSync(disk) || statSync(disk).size <= 0) missing.push(u);
}

const masquerades = [];
for (const file of walkFiles(PUBLIC)) {
  const ext = extname(file).toLowerCase();
  if (!BINARYISH.has(ext)) continue;
  try {
    if (isHtmlMasquerade(file)) masquerades.push(file.replace(ROOT + '/', ''));
  } catch {
    /* ignore */
  }
}

let distMissing = [];
if (requireDist || existsSync(join(DIST_CLIENT, 'wp-content'))) {
  const uploadsPublic = join(PUBLIC, 'wp-content');
  if (existsSync(uploadsPublic)) {
    for (const file of walkFiles(uploadsPublic)) {
      const rel = file.slice(PUBLIC.length);
      const dest = join(DIST_CLIENT, rel);
      if (!existsSync(dest) || statSync(dest).size !== statSync(file).size) {
        distMissing.push(rel);
      }
    }
  }
}

mkdirSync(DATA, { recursive: true });
const report = {
  refs: refs.size,
  missing,
  masquerades,
  distMissingCount: distMissing.length,
  distMissingSample: distMissing.slice(0, 50),
};
writeFileSync(join(DATA, 'asset-verify-report.json'), JSON.stringify(report, null, 2));

console.log(`refs=${refs.size}`);
console.log(`missing=${missing.length}`);
console.log(`html_masquerade=${masquerades.length}`);
console.log(`dist_out_of_sync=${distMissing.length}`);
for (const u of missing.slice(0, 30)) console.log('MISS', u);
for (const u of masquerades.slice(0, 30)) console.log('HTML', u);
if (distMissing.length) {
  console.log('DIST sample:');
  for (const u of distMissing.slice(0, 20)) console.log(' ', u);
}

const fail =
  missing.length > 0 ||
  masquerades.length > 0 ||
  (requireDist && distMissing.length > 0);
if (fail) {
  console.error('verify-assets FAILED — see .data/asset-verify-report.json');
  process.exit(1);
}
console.log('verify-assets PASS');
