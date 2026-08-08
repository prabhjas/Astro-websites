#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
for (const rel of ['src/legacy/chrome/header.html', 'src/legacy/chrome/footer.html']) {
  const f = join(ROOT, rel);
  const before = readFileSync(f, 'utf8');
  const after = before
    .replace(/https:\/\/(?:www\.)?emiratisationhub\.com\//g, '/')
    .replace(/http:\/\/(?:www\.)?emiratisationhub\.com\//g, '/');
  writeFileSync(f, after);
  console.log(rel, before === after ? 'unchanged' : 'rewrote');
}
