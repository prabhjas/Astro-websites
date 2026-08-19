#!/usr/bin/env node
/**
 * Apply alt_text_uae_company_setup.json mappings to shared header chrome.
 * Usage: node scripts/apply-uae-company-setup-alt.mjs [path-to-json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath =
  process.argv[2] ||
  'C:/Users/DELL/Downloads/company setup ALT/alt_text_uae_company_setup.json';

const headerPaths = [
  join(root, 'public/chrome/header.html'),
  join(root, 'src/legacy/chrome/header.html'),
];

const { alt_text_mappings } = JSON.parse(readFileSync(jsonPath, 'utf8'));
const byFile = new Map();
for (const m of alt_text_mappings) {
  byFile.set(m.image_url.split('/').pop(), m.alt_text);
}

function patch(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/(?:src|data-lazy-src)="([^"]+)"/i);
    if (!srcMatch) return tag;
    const file = srcMatch[1].split('/').pop().split('?')[0];
    const alt = byFile.get(file);
    if (!alt) return tag;
    const escaped = alt.replace(/"/g, '&quot;');
    if (/alt="[^"]*"/i.test(tag)) {
      return tag.replace(/alt="[^"]*"/i, `alt="${escaped}"`);
    }
    return tag.replace('<img', `<img alt="${escaped}"`);
  });
}

for (const p of headerPaths) {
  const original = readFileSync(p, 'utf8');
  const before = (original.match(/alt=""/g) || []).length;
  const next = patch(original);
  writeFileSync(p, next);
  const after = (next.match(/alt=""/g) || []).length;
  console.log(`${p}: empty alt ${before} -> ${after}`);
}
