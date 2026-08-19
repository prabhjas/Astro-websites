#!/usr/bin/env node
/** Apply mirror hygiene + alt inference to all legacy cleaned HTML files. */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMirrorHygiene, inferMissingImgAlts } from '../src/lib/mirror-hygiene.js';

const LEGACY = join(dirname(fileURLToPath(import.meta.url)), '../src/legacy');
const files = readdirSync(LEGACY).filter((f) => f.endsWith('.cleaned.html'));

for (const file of files) {
  const slug = file.replace(/\.cleaned\.html$/, '');
  const path = join(LEGACY, file);
  let html = readFileSync(path, 'utf8');
  html = inferMissingImgAlts(applyMirrorHygiene(html), slug);
  writeFileSync(path, html, 'utf8');
  console.log('patched', file);
}

console.log(`Done — ${files.length} files`);
