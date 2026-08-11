#!/usr/bin/env node
/**
 * Rebrand theuaegate peer leftovers → theuaegate.com (port 5117).
 */
import { readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXT = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.astro',
  '.md',
  '.json',
  '.yml',
  '.yaml',
  '.txt',
  '.service',
  '.example',
]);

function transform(text) {
  return text
    .replaceAll('https://www.theuaegate.com', 'https://www.theuaegate.com')
    .replaceAll('http://www.theuaegate.com', 'http://www.theuaegate.com')
    .replaceAll('https://theuaegate.com', 'https://theuaegate.com')
    .replaceAll('http://theuaegate.com', 'http://theuaegate.com')
    .replaceAll('www.theuaegate.com', 'www.theuaegate.com')
    .replaceAll('theuaegate.com', 'theuaegate.com')
    .replaceAll('The UAE Gate', 'The UAE Gate')
    .replaceAll('theuaegate-astro', 'theuaegate-astro')
    .replaceAll("siteId: 'theuaegate'", "siteId: 'theuaegate'")
    .replaceAll('siteId: "theuaegate"', 'siteId: "theuaegate"')
    .replaceAll('WEBSITE_ID=5117', 'WEBSITE_ID=5117')
    .replaceAll('PORT=5117', 'PORT=5117')
    .replaceAll('port 5117', 'port 5117')
    .replaceAll(':5117', ':5117')
    .replaceAll('(theuaegate = 5117)', '(theuaegate = 5117)')
    .replaceAll('theuaegate.service', 'theuaegate.service')
    .replaceAll('theuaegate', 'theuaegate')
    .replaceAll('5117', '5117');
}

async function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.data', 'dist', '.astro', 'wordpress-exports', 'public'].includes(ent.name)) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

async function main() {
  const targets = [
    ...(await walk(join(ROOT, 'src'))),
    ...(await walk(join(ROOT, 'scripts'))),
    ...(await walk(join(ROOT, 'deploy'))),
    ...(await walk(join(ROOT, 'imports'))),
    ...(await walk(join(ROOT, 'docs'))),
    join(ROOT, 'package.json'),
    join(ROOT, 'astro.config.mjs'),
    join(ROOT, 'tsconfig.json'),
    join(ROOT, '.env.example'),
    join(ROOT, 'README.md'),
    join(ROOT, 'AGENTS.md'),
    join(ROOT, 'CLAUDE.md'),
  ];

  let changed = 0;
  for (const file of targets) {
    if (!existsSync(file)) continue;
    const ext = extname(file).toLowerCase();
    if (!TEXT_EXT.has(ext) && !file.endsWith('.env.example')) continue;
    if (file.includes('sitemap-inventory.json')) continue;
    if (file.includes('phase01-manifest.json')) continue;
    const st = await stat(file);
    if (st.size > 3_000_000) continue;
    const text = await readFile(file, 'utf8');
    const next = transform(text);
    if (next !== text) {
      await writeFile(file, next, 'utf8');
      changed++;
    }
  }

  // Rename deploy unit files if present
  const deploy = join(ROOT, 'deploy');
  if (existsSync(deploy)) {
    for (const name of await readdir(deploy)) {
      if (name.includes('theuaegate')) {
        const next = name.replaceAll('theuaegate', 'theuaegate');
        const from = join(deploy, name);
        const to = join(deploy, next);
        const body = transform(await readFile(from, 'utf8'));
        await writeFile(to, body, 'utf8');
        if (from !== to) await rm(from, { force: true });
        changed++;
      }
    }
  }

  console.log(JSON.stringify({ changed }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
