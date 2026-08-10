#!/usr/bin/env node
/**
 * One-shot: retarget copied emiratisationgate.org peer files → emiratisationgate.org.
 * Safe to re-run; skips binary/heavy dirs.
 */
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
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
  // Domains first (longest / most specific)
  s = s.replace(/https:\/\/(?:www\.)?emiratisationgate\.org/gi, 'https://emiratisationgate.org');
  s = s.replace(/http:\/\/(?:www\.)?emiratisationgate\.org/gi, 'http://emiratisationgate.org');
  s = s.replace(/www\.emiratisationgate\.org/gi, 'www.emiratisationgate.org');
  s = s.replace(/emiratisationgate\.org/gi, 'emiratisationgate.org');
  s = s.replace(/contact@emiratisationgate\.org/gi, 'contact@emiratisationgate.org');
  s = s.replace(/contact@emiratisationgate\.org/gi, 'contact@emiratisationgate.org');

  // Package / unit / ids
  s = s.replace(/emiratisationgate-astro/g, 'emiratisationgate-astro');
  s = s.replace(/emiratisationgate-blog-listing\.js/g, 'emiratisationgate-blog-listing.js');
  s = s.replace(/site-emiratisationgate/g, 'site-emiratisationgate');
  s = s.replace(/siteId:\s*'emiratisationgate'/g, "siteId: 'emiratisationgate'");
  s = s.replace(/siteId:\s*"emiratisationgate"/g, 'siteId: "emiratisationgate"');

  // Brand display names
  s = s.replace(/Emiratisation Gate Contact Form/g, 'Emiratisation Gate Contact Form');
  s = s.replace(/Emiratisation Gate Astro/g, 'Emiratisation Gate Astro');
  s = s.replace(/EmiratisationGate-Astro/g, 'EmiratisationGate-Astro');
  s = s.replace(/EmiratisationGateAstro/g, 'EmiratisationGateAstro');
  s = s.replace(/\bPittant\b/g, 'Emiratisation Gate');
  s = s.replace(/\bpittant\b/g, 'emiratisationgate');

  // Peer leftover ports → this site's fleet port
  s = s.replace(/\b5111\b/g, '5105');
  s = s.replace(/\b5095\b/g, '5105');

  // Clear peer GTM id so we don't ship emiratisationgate's container
  s = s.replace(/PUBLIC_GTM_ID=/g, 'PUBLIC_GTM_ID=');
  s = s.replace(//g, '');

  // Logo path — live brand asset
  s = s.replace(
    /\/wp-content\/uploads\/2023\/06\/Emiratisation Gate-Logo\.svg/g,
    '/wp-content/uploads/2023/07/logo-emiratisation-GATE-151x59.png',
  );

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
console.log(`files changed: ${changed} of ${files.length}`);

const renames = [
  ['deploy/emiratisationgate.service', 'deploy/emiratisationgate.service'],
  ['deploy/emiratisationgate.org.caddy', 'deploy/emiratisationgate.org.caddy'],
  ['public/js/emiratisationgate-blog-listing.js', 'public/js/emiratisationgate-blog-listing.js'],
];
for (const [a, b] of renames) {
  try {
    await rename(join(ROOT, a), join(ROOT, b));
    console.log('renamed', a, '->', b);
  } catch (e) {
    console.warn('rename skip', a, e.message);
  }
}
