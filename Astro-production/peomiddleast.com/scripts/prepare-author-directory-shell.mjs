#!/usr/bin/env node
/**
 * Extract author directory shell from live /author/ page.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHELL_DIR = join(ROOT, 'src/legacy/author-directory-shell');
const REF_URL = process.argv[2] || 'https://peomiddleast.com/author/';
const MARKER = '<!--ASTRO_AUTHOR:DIRECTORY-->';

function localizeUrls(html) {
  return html
    .replaceAll('https://peomiddleast.com/', '/')
    .replaceAll('http://peomiddleast.com/', '/')
    .replaceAll('https://dev.peomiddleast.com/', '/')
    .replaceAll('http://dev.peomiddleast.com/', '/');
}

async function main() {
  console.log('Fetching author directory:', REF_URL);
  const res = await fetch(REF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PEOAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REF_URL}: ${res.status}`);
  let html = localizeUrls(await res.text());

  const $ = cheerio.load(html, { decodeEntities: false });
  const gridSection = $('.elementor-element-86e3bc4').first();
  if (!gridSection.length) throw new Error('Author directory section .elementor-element-86e3bc4 not found');

  const container = gridSection.find('> .elementor-container').first();
  if (!container.length) throw new Error('Author directory container not found');

  container.empty().append(MARKER);

  await mkdir(SHELL_DIR, { recursive: true });
  const outPath = join(SHELL_DIR, 'template.html');
  await writeFile(outPath, $.html(), 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
