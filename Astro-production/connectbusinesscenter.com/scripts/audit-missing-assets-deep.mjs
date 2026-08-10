#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = join(ROOT, 'src/legacy');
const PUBLIC = join(ROOT, 'public');
const ORIGIN_RE = /https?:\/\/(?:www\.)?connectbusinesscenter\.com/gi;

const files = readdirSync(LEGACY).filter((f) => f.endsWith('.cleaned.html'));

/** @type {Map<string, number>} */
const missing = new Map();
/** @type {Map<string, number>} */
const absAlive = new Map();
let absCount = 0;
let absLocalizedOk = 0;

function normalizePath(raw) {
  let u = String(raw || '').trim().replace(/\\+\//g, '/').replace(/\\\//g, '/');
  u = u.replace(/&amp;/g, '&').replace(/&quot;/g, '"').split('#')[0].split('?')[0];
  if (!u || u.startsWith('data:') || u.startsWith('blob:')) return null;
  if (u.startsWith('//')) u = 'https:' + u;
  u = u.replace(ORIGIN_RE, '');
  if (!u.startsWith('/')) return null;
  if (!u.includes('/wp-content/') && !u.includes('/wp-includes/') && !/\.(png|jpe?g|webp|gif|svg|avif|ico|css|js|woff2?|mp4|webm)$/i.test(u)) {
    return null;
  }
  try {
    u = decodeURIComponent(u);
  } catch {
    /* keep */
  }
  // Windows-illegal cleanup already applied at prepare; keep as-is for lookup
  return u;
}

function addMissing(rel) {
  missing.set(rel, (missing.get(rel) || 0) + 1);
}

function fileExists(rel) {
  const abs = join(PUBLIC, rel.replace(/^\//, ''));
  return existsSync(abs) && statSync(abs).size > 0;
}

for (const f of files) {
  const html = readFileSync(join(LEGACY, f), 'utf8');

  // Absolute origin still present (should usually be localized for assets)
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?connectbusinesscenter\.com(\/[^"'\\\s)>]+)/gi)) {
    absCount++;
    const rel = normalizePath(m[0]);
    if (!rel) continue;
    if (/\.(png|jpe?g|webp|gif|svg|avif|css|js|woff2?|mp4)$/i.test(rel) || rel.includes('/wp-content/uploads/')) {
      absAlive.set(rel, (absAlive.get(rel) || 0) + 1);
      if (fileExists(rel)) absLocalizedOk++;
      else addMissing(rel);
    }
  }

  // Escaped Elementor URLs: https:\/\/connectbusinesscenter.com\/wp-content\/...
  for (const m of html.matchAll(/https?:\\\/\\\/(?:www\.)?connectbusinesscenter\.com(\\\/[^"'\\\s]+)/gi)) {
    const raw = m[0].replace(/\\\//g, '/');
    const rel = normalizePath(raw);
    if (!rel) continue;
    if (!fileExists(rel)) addMissing(rel);
  }

  // Root-relative assets
  const re = /(?:src|data-src|data-lazy-src|data-bg|data-large_image|href|content)=["']([^"']+)["']|url\(\s*['"]?([^'")]+)['"]?\s*\)|["'](\/wp-content\/[^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const cand = m[1] || m[2] || m[3];
    const rel = normalizePath(cand);
    if (!rel) continue;
    if (!/\.(png|jpe?g|webp|gif|svg|avif|ico|css|js|woff2?|mp4|webm)$/i.test(rel) && !rel.includes('/uploads/')) continue;
    if (!fileExists(rel)) addMissing(rel);
  }
}

const missList = [...missing.entries()].sort((a, b) => b[1] - a[1]);
const report = {
  cleanedPages: files.length,
  absoluteOriginRefs: absCount,
  missingUnique: missList.length,
  missingTop: missList.slice(0, 50),
  absAssetUnique: absAlive.size,
};
writeFileSync(join(ROOT, 'source/missing-assets-report.json'), JSON.stringify({ ...report, allMissing: missList }, null, 2));
console.log(JSON.stringify(report, null, 2));
