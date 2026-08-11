#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.astro', '.json', '.md', '.example',
  '.caddy', '.service', '.txt', '.css', '.html', '.svg', '.yml', '.yaml',
]);
const SKIP = new Set(['node_modules', 'dist', '.data', '.astro', 'source', 'legacy', 'wp-content', 'wp-includes']);

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') && ent.name !== '.env.example' && ent.name !== '.gitignore') continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP.has(ent.name)) continue;
      out.push(...(await walk(p)));
    } else if (TEXT.has(extname(ent.name)) || ent.name === '.env.example') {
      out.push(p);
    }
  }
  return out;
}

function fix(s) {
  return s
    .replace(/LLA Designers\\\.com/g, 'lladesigners\\.com')
    .replace(/lladesigners\.com/g, 'lladesigners.com')
    .replace(/\/var\/LLA Designers\//g, '/var/lladesigners/')
    .replace(/LLA Designers\.service/g, 'lladesigners.service');
}

let n = 0;
for (const f of await walk(ROOT)) {
  const before = await readFile(f, 'utf8');
  const after = fix(before);
  if (after !== before) {
    await writeFile(f, after);
    n++;
    console.log('fixed', f.slice(ROOT.length + 1));
  }
}
console.log(`fixed ${n} files`);
