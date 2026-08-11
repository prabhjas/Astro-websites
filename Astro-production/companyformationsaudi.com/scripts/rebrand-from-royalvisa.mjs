#!/usr/bin/env node
import { readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXT = new Set([
  '.ts', '.js', '.mjs', '.cjs', '.astro', '.md', '.json', '.yml', '.yaml', '.txt', '.service', '.example',
]);

function transform(text) {
  return text
    .replaceAll('', '')
    .replaceAll('', '')
    .replaceAll('', '')
    .replaceAll('', '')
    .replaceAll('www.companyformationsaudi.com', 'www.companyformationsaudi.com')
    .replaceAll('companyformationsaudi.com', 'companyformationsaudi.com')
    .replaceAll('Company Formation Saudi', 'Company Formation Saudi')
    .replaceAll('companyformationsaudi-astro', 'companyformationsaudi-astro')
    .replaceAll("siteId: 'companyformationsaudi'", "siteId: 'companyformationsaudi'")
    .replaceAll('siteId: "companyformationsaudi"', 'siteId: "companyformationsaudi"')
    .replaceAll('WEBSITE_ID=5114', 'WEBSITE_ID=5114')
    .replaceAll('PORT=5114', 'PORT=5114')
    .replaceAll('port 5114', 'port 5114')
    .replaceAll(':5114', ':5114')
    .replaceAll('(companyformationsaudi = 5114)', '(companyformationsaudi = 5114)')
    .replaceAll('companyformationsaudi.service', 'companyformationsaudi.service')
    .replaceAll('companyformationsaudi', 'companyformationsaudi')
    .replaceAll('5114', '5114');
}

async function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.data', 'dist', '.astro', 'wordpress-exports'].includes(ent.name)) continue;
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
    // Do not rewrite peer copy leftovers under content/blog — we delete those.
    if (file.includes(`${join('src', 'content', 'blog')}`) || file.includes(`${join('src', 'content', 'authors')}`)) {
      continue;
    }
    const st = await stat(file);
    if (st.size > 3_000_000) continue;
    const text = await readFile(file, 'utf8');
    const next = transform(text);
    if (next !== text) {
      await writeFile(file, next, 'utf8');
      changed++;
    }
  }

  // Remove companyformationsaudi blog JSON content (wrong domain).
  for (const dir of [join(ROOT, 'src/content/blog'), join(ROOT, 'src/content/authors')]) {
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
      console.log('removed', dir);
    }
  }

  // Clear prepared legacy mirrors from peer
  const legacy = join(ROOT, 'src/legacy');
  if (existsSync(legacy)) {
    for (const ent of await readdir(legacy, { withFileTypes: true })) {
      if (ent.isFile() && ent.name.endsWith('.cleaned.html')) {
        await rm(join(legacy, ent.name), { force: true });
      }
      if (ent.isFile() && ent.name.endsWith('.assets.json')) {
        await rm(join(legacy, ent.name), { force: true });
      }
    }
  }

  console.log('rebranded_files=' + changed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
