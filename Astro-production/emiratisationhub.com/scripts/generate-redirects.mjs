#!/usr/bin/env node
/**
 * Generate host redirect files from src/data/redirects.yml
 *
 * Writes:
 *   public/_redirects     → Netlify / Cloudflare Pages
 *   public/_redirects.json → simple JSON copy for reference
 *
 * Also prints Astro `redirects` map for astro.config.mjs (loaded there directly).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src/data/redirects.yml');
const PUBLIC = join(ROOT, 'public');

const data = parse(await readFile(SRC, 'utf8')) ?? {};
const list = Array.isArray(data.redirects) ? data.redirects : [];

const lines = [
  '# Generated from src/data/redirects.yml — do not edit by hand',
  '# Run: npm run redirects:generate',
  '',
];

for (const row of list) {
  if (!row?.from || !row?.to) continue;
  const status = row.status ?? 301;
  lines.push(`${row.from}  ${row.to}  ${status}`);
}

await mkdir(PUBLIC, { recursive: true });
await writeFile(join(PUBLIC, '_redirects'), lines.join('\n') + '\n', 'utf8');
await writeFile(
  join(PUBLIC, '_redirects.json'),
  JSON.stringify(
    list.filter((r) => r?.from && r?.to).map((r) => ({
      from: r.from,
      to: r.to,
      status: r.status ?? 301,
    })),
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log(`Wrote public/_redirects (${list.filter((r) => r?.from && r?.to).length} rules)`);
