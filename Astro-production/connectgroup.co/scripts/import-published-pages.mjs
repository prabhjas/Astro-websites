#!/usr/bin/env node
/**
 * Import "Done" pages from the Connect Group Astro tracking spreadsheet
 * into src/data/published-pages.yml (allowlist for sitemap + live routes).
 *
 * Usage:
 *   node scripts/import-published-pages.mjs "c:/Users/DELL/Downloads/Connect group asrto.xlsx"
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'src/data/published-pages.yml');

const sheetPath = resolve(
  process.argv[2] || join(process.env.USERPROFILE || '', 'Downloads', 'Connect group asrto.xlsx'),
);

if (!existsSync(sheetPath)) {
  console.error('Spreadsheet not found:', sheetPath);
  process.exit(1);
}

const wb = XLSX.readFile(sheetPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

/** @type {Map<string, { slug: string, path: string, sourceUrl: string }>} */
const done = new Map();

for (let i = 1; i < rows.length; i++) {
  const url = String(rows[i][0] || '').trim();
  const status = String(rows[i][3] || '').trim(); // column D
  if (!url) continue;
  if (!/^done$/i.test(status)) continue;

  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    continue;
  }

  const slug =
    pathname === '/' || pathname === ''
      ? ''
      : pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const path = slug === '' ? '/' : `/${slug}/`;

  done.set(slug, {
    slug,
    path,
    sourceUrl: url.split('#')[0].split('?')[0],
  });
}

const pages = [...done.values()].sort((a, b) => a.slug.localeCompare(b.slug));

const yamlLines = [
  '# Auto-generated from Connect group asrto.xlsx (column D = Done).',
  `# Source: ${sheetPath.replace(/\\/g, '/')}`,
  `# Generated: ${new Date().toISOString()}`,
  '# Only these marketing pages are published (sitemap + public routes).',
  'pages:',
];

for (const p of pages) {
  yamlLines.push(`  - slug: ${p.slug === '' ? '""' : p.slug}`);
  yamlLines.push(`    path: ${p.path}`);
}

writeFileSync(OUT, yamlLines.join('\n') + '\n', 'utf8');

const pageFiles = readdirSync(join(ROOT, 'src/pages')).filter((f) => f.endsWith('.astro'));
const existing = new Set(
  pageFiles.map((f) => {
    const base = f.replace(/\.astro$/, '');
    return base === 'index' ? '' : base;
  }),
);

const missing = pages.filter((p) => !existing.has(p.slug));
const unpublishedExisting = [...existing]
  .filter((slug) => !['demo', 'status'].includes(slug) && !slug.startsWith('['))
  .filter((slug) => !done.has(slug))
  .sort();

console.log(`Wrote ${pages.length} Done pages → ${OUT}`);
console.log(`Missing Astro page files (${missing.length}):`);
for (const m of missing) console.log('  -', m.path);
console.log(`Existing Astro pages NOT marked Done (${unpublishedExisting.length}):`);
for (const s of unpublishedExisting) console.log('  -', s === '' ? '/' : `/${s}/`);
