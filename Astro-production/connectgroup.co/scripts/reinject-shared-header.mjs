/**
 * Re-inject updated shared header into prerendered dist HTML.
 * Also strips accidental <html><body> wrappers left by a prior cheerio bug.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { applySharedChrome, clearSharedChromeCache } from '../src/lib/shared-chrome.js';

clearSharedChromeCache();

const ROOT = process.cwd();
const CLIENT = join(ROOT, 'dist/client');

// Keep chrome copies in sync
copyFileSync(join(ROOT, 'src/legacy/chrome/header.html'), join(ROOT, 'public/chrome/header.html'));
copyFileSync(join(ROOT, 'src/legacy/chrome/header.html'), join(ROOT, 'dist/client/chrome/header.html'));
copyFileSync(join(ROOT, 'src/legacy/chrome/header.css'), join(ROOT, 'public/chrome/header.css'));
copyFileSync(join(ROOT, 'src/legacy/chrome/header.css'), join(ROOT, 'dist/client/chrome/header.css'));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

function slugFromPath(file) {
  const rel = file.slice(CLIENT.length + 1).replace(/\\/g, '/');
  if (rel === 'index.html') return 'homepage';
  return rel.replace(/\/index\.html$/, '').split('/')[0];
}

/** Remove cheerio document wrappers around the shared header fragment. */
function stripChromeDocumentWrapper(html) {
  const open = '<html><head></head><body>';
  const close = '</body></html>';
  let out = html;
  // Only strip when immediately wrapping a header fragment
  out = out.replace(/<html><head><\/head><body>\s*(<header\b[\s\S]*?<\/header>)\s*<\/body><\/html>/gi, '$1');
  return out;
}

const files = walk(CLIENT);
let updated = 0;
let skipped = 0;

for (const file of files) {
  const slug = slugFromPath(file);
  let html = readFileSync(file, 'utf8');
  const before = html;
  html = stripChromeDocumentWrapper(html);

  const needs =
    html.includes('elementor-location-header') ||
    html.includes('elementor-27130') ||
    before.includes('<html><head></head><body><header');

  if (!needs && html === before) {
    skipped++;
    continue;
  }

  let next = applySharedChrome(html, slug === 'homepage' ? 'homepage' : slug);
  next = stripChromeDocumentWrapper(next);

  if (next !== before) {
    writeFileSync(file, next);
    updated++;
  } else {
    skipped++;
  }
}

const about = readFileSync(join(CLIENT, 'about-us/index.html'), 'utf8');
console.log(JSON.stringify({ files: files.length, updated, skipped }, null, 2));
console.log('about wrapper?', about.includes('<html><head></head><body><header'));
console.log('about 35463', about.includes('mega-menu-item-35463'));
const hdrAt = about.search(/<header[^>]*elementor-27130/);
console.log('about header context', about.slice(Math.max(0, hdrAt - 30), hdrAt + 90));
