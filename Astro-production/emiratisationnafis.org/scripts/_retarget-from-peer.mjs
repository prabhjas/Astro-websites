#!/usr/bin/env node
/**
 * Retarget copied emiratisationnafis.org peer → emiratisationnafis.org
 */
import { readdir, readFile, writeFile, rename, access } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  s = s.replace(/https:\/\/(?:www\.)?emiratisationnafis\.org/gi, 'https://emiratisationnafis.org');
  s = s.replace(/http:\/\/(?:www\.)?emiratisationnafis\.org/gi, 'http://emiratisationnafis.org');
  s = s.replace(/www\.emiratisationnafis\.org/gi, 'www.emiratisationnafis.org');
  s = s.replace(/emiratisationnafis\.org/gi, 'emiratisationnafis.org');
  s = s.replace(/contact@emiratisationnafis\.org/gi, 'contact@emiratisationnafis.org');
  s = s.replace(/contact@emiratisationnafis\.org/gi, 'contact@emiratisationnafis.org');

  s = s.replace(/emiratisationnafis-astro/g, 'emiratisationnafis-astro');
  s = s.replace(/emiratisationnafis-blog-listing\.js/g, 'emiratisationnafis-blog-listing.js');
  s = s.replace(/data-emiratisationnafis-/g, 'data-emiratisationnafis-');
  s = s.replace(/site-emiratisationnafis/g, 'site-emiratisationnafis');
  s = s.replace(/siteId:\s*'emiratisationnafis'/g, "siteId: 'emiratisationnafis'");
  s = s.replace(/siteId:\s*"emiratisationnafis"/g, 'siteId: "emiratisationnafis"');

  s = s.replace(/Emiratisation Nafis Contact Form/g, 'Emiratisation Nafis Contact Form');
  s = s.replace(/Emiratisation Nafis Astro/g, 'Emiratisation Nafis Astro');
  s = s.replace(/EmiratisationNafis-Astro/g, 'EmiratisationNafis-Astro');
  s = s.replace(/EmiratisationNafisAstro/g, 'EmiratisationNafisAstro');
  s = s.replace(/Emiratisation Nafis/g, 'Emiratisation Nafis');
  s = s.replace(/EmiratisationNafis/g, 'EmiratisationNafis');
  s = s.replace(/emiratisationnafis/g, 'emiratisationnafis');

  // Ports: gate 5108 → nafis 5108; leftover peer ports
  s = s.replace(/\b5105\b/g, '5108');
  s = s.replace(/\b5111\b/g, '5108');
  s = s.replace(/\b5095\b/g, '5108');

  // Website ID (docs/WEBSITE-ID-REGISTRY.md)
  s = s.replace(/WEBSITE_ID=5063/g, 'WEBSITE_ID=5063');
  s = s.replace(/WEBSITE_ID:\s*4796/g, 'WEBSITE_ID: 5063');

  s = s.replace(/PUBLIC_GTM_ID=
  return s;
}

const files = await walk(ROOT);
let changed = 0;
for (const f of files) {
  const raw = await readFile(f, 'utf8');
  const next = retarget(raw);
  if (next !== raw) {
    await writeFile(f, next, 'utf8');
    changed += 1;
    console.log('updated', f.slice(ROOT.length + 1));
  }
}

// Rename deploy unit files if present
const renames = [
  ['deploy/emiratisationnafis.service', 'deploy/emiratisationnafis.service'],
  ['deploy/emiratisationnafis.org.caddy', 'deploy/emiratisationnafis.org.caddy'],
  ['public/js/emiratisationnafis-blog-listing.js', 'public/js/emiratisationnafis-blog-listing.js'],
];
for (const [from, to] of renames) {
  const a = join(ROOT, from);
  const b = join(ROOT, to);
  try {
    await access(a);
    await rename(a, b);
    console.log('renamed', from, '→', to);
  } catch {
    /* missing ok */
  }
}

console.log(`retarget done; files changed=${changed}`);
