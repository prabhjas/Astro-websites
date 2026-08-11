#!/usr/bin/env node
/**
 * Fetch live /author/ page HTML for the author directory mirror.
 * Usage: node scripts/prepare-author-directory.mjs
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/legacy/author-directory.cleaned.html');
const URL = 'https://saudicompanyformation.com/author/';

async function main() {
  const res = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpmproAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${URL}: ${res.status}`);
  let html = await res.text();
  html = html
    .replaceAll('https://saudicompanyformation.com/', '/')
    .replaceAll('http://saudicompanyformation.com/', '/')
    .replaceAll('https://www.saudicompanyformation.com/', '/')
    .replace(/https:\/\/saudicompanyformation\.com\/wp-content\//g, '/wp-content/')
    .replace(/(href|src|data-lazy-src)=(["'])\/\//g, '$1=$2/')
    .replace(/(data-lazy-srcset|srcset)=(["'])\/\//g, '$1=$2/');
  await writeFile(OUT, html, 'utf8');
  console.log('Wrote', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
