#!/usr/bin/env node
/**
 * One-shot: retarget copied alburaq.ae peer files → alburaq.ae.
 * Safe to re-run; skips binary/heavy dirs.
 */
import { readdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.astro',
  '.json',
  '.md',
  '.example',
  '.caddy',
  '.service',
  '.txt',
  '.css',
  '.html',
  '.svg',
  '.yml',
  '.yaml',
]);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.data',
  '.astro',
  'source',
  'legacy',
  'wp-content',
  'wp-includes',
]);

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (
      ent.name.startsWith('.') &&
      ent.name !== '.env.example' &&
      ent.name !== '.gitignore'
    ) {
      continue;
    }
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      out.push(...(await walk(p)));
    } else {
      const ext = extname(ent.name);
      if (
        TEXT_EXT.has(ext) ||
        ent.name === '.env.example' ||
        ent.name.endsWith('.caddy') ||
        ent.name.endsWith('.service')
      ) {
        out.push(p);
      }
    }
  }
  return out;
}

function retarget(text) {
  let s = text;
  // Domains / emails first (longer patterns before shorter)
  s = s.replace(/https:\/\/(?:www\.)?alburaq\.ae/gi, 'https://alburaq.ae');
  s = s.replace(/http:\/\/(?:www\.)?alburaq\.ae/gi, 'http://alburaq.ae');
  s = s.replace(/www\.alburaq\.ae/gi, 'www.alburaq.ae');
  s = s.replace(/contact@alburaq\.ae/gi, 'contact@alburaq.ae');
  s = s.replace(/alburaq\.ae/gi, 'alburaq.ae');
  // Ports / package / ids
  s = s.replace(/\b5111\b/g, '5120');
  s = s.replace(/alburaq-astro/g, 'alburaq-astro');
  s = s.replace(/site-alburaq/g, 'site-alburaq');
  s = s.replace(/siteId:\s*'alburaq'/g, "siteId: 'alburaq'");
  s = s.replace(/siteId:\s*"alburaq"/g, 'siteId: "alburaq"');
  s = s.replace(/Al Buraq Astro/g, 'Al Buraq Astro');
  s = s.replace(/Al Buraq/g, 'Al Buraq');
  s = s.replace(/alburaq/g, 'alburaq');
  return s;
}

async function main() {
  const files = await walk(ROOT);
  let changed = 0;
  for (const file of files) {
    const before = await readFile(file, 'utf8');
    const after = retarget(before);
    if (after !== before) {
      await writeFile(file, after, 'utf8');
      changed++;
      console.log('updated', file.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
    }
  }

  // Rename deploy artifacts
  const renames = [
    ['deploy/alburaq.service', 'deploy/alburaq.service'],
    ['deploy/alburaq.ae.caddy', 'deploy/alburaq.ae.caddy'],
  ];
  for (const [fromRel, toRel] of renames) {
    const from = join(ROOT, fromRel);
    const to = join(ROOT, toRel);
    if (existsSync(from) && !existsSync(to)) {
      await rename(from, to);
      console.log('renamed', fromRel, '→', toRel);
    } else if (existsSync(from) && existsSync(to) && from !== to) {
      await unlink(from);
      console.log('removed duplicate', fromRel);
    }
  }

  console.log(`\nRetarget complete. Files changed: ${changed}/${files.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
