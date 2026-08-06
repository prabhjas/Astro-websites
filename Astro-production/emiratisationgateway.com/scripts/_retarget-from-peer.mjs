#!/usr/bin/env node
/**
 * One-shot: retarget copied emiratisationgateway.com peer files → emiratisationgateway.com.
 * Safe to re-run; skips binary/heavy dirs.
 *
 * Order matters: replace LONGER strings first so that
 * "emiratisationgateway.com" is never double-replaced.
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

  // ── Domain replacements (longest first to avoid double-replace) ──

  // Full URLs with protocol
  s = s.replace(/https:\/\/(?:www\.)?emiratisationgateway\.com/gi, 'https://emiratisationgateway.com');
  s = s.replace(/http:\/\/(?:www\.)?emiratisationgateway\.com/gi, 'http://emiratisationgateway.com');

  // www. prefix domain
  s = s.replace(/www\.emiratisationgateway\.com/gi, 'www.emiratisationgateway.com');

  // Bare domain
  s = s.replace(/emiratisationgateway\.com/gi, 'emiratisationgateway.com');

  // Email addresses
  s = s.replace(/contact@emiratisationgateway\.com/gi, 'contact@emiratisationgateway.com');

  // ── Package / unit / id replacements ──
  // Order: compound ids first, then bare unit id

  // Package name
  s = s.replace(/emiratisationgateway-astro/g, 'emiratisationgateway-astro');

  // Blog listing JS
  s = s.replace(/emiratisationgateway-blog-listing\.js/g, 'emiratisationgateway-blog-listing.js');

  // systemd user
  s = s.replace(/site-emiratisationgateway\b/g, 'site-emiratisationgateway');

  // siteId in code
  s = s.replace(/siteId:\s*'emiratisationgateway'/g, "siteId: 'emiratisationgateway'");
  s = s.replace(/siteId:\s*"emiratisationgateway"/g, 'siteId: "emiratisationgateway"');

  // ── Brand display names ──
  s = s.replace(/Emiratisation Gateway Contact Form/g, 'Emiratisation Gateway Contact Form');
  s = s.replace(/Emiratisation Gateway Astro/g, 'Emiratisation Gateway Astro');
  s = s.replace(/EmiratisationGateway-Astro/g, 'EmiratisationGateway-Astro');
  s = s.replace(/EmiratisationGatewayAstro/g, 'EmiratisationGatewayAstro');
  s = s.replace(/Emiratisation Gateway/g, 'Emiratisation Gateway');

  // Bare unit id (careful — only whole word to avoid breaking "emiratisationgateway")
  // Use word boundary on the right only (left boundary doesn't help since the prefix varies)
  s = s.replace(/(?<![a-zA-Z])emiratisationgateway(?![a-zA-Z])/g, 'emiratisationgateway');

  // ── Port: 5106 → 5106 ──
  s = s.replace(/\b5105\b/g, '5106');

  // Clear peer GTM id
  s = s.replace(/PUBLIC_GTM_ID=

  // ── Logo path — live brand asset ──
  s = s.replace(
    /\/wp-content\/uploads\/2023\/07\/logo-emiratisation-GATE-151x59\.png/g,
    '/wp-content/uploads/2023/10/logo-Emiratization-Gateway_normal-227x50.png',
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
  ['deploy/emiratisationgateway.com.caddy', 'deploy/emiratisationgateway.com.caddy'],
  ['deploy/emiratisationgateway.service', 'deploy/emiratisationgateway.service'],
  ['public/js/emiratisationgateway-blog-listing.js', 'public/js/emiratisationgateway-blog-listing.js'],
];
for (const [a, b] of renames) {
  try {
    await rename(join(ROOT, a), join(ROOT, b));
    console.log('renamed', a, '->', b);
  } catch (e) {
    console.warn('rename skip', a, e.message);
  }
}
