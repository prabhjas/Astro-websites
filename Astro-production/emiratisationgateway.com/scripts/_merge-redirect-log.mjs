/**
 * Merge redirection-log hit CSV (and/or explicit rules) into src/data/redirects.yml.
 * Usage:
 *   node scripts/_merge-redirect-log.mjs <csv-path>
 *   node scripts/_merge-redirect-log.mjs --from-xlsx
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_DIR = join(ROOT, 'imports/redirects');
const YAML_PATH = join(ROOT, 'src/data/redirects.yml');
const ORIGIN = 'https://emiratisationgateway.com';

mkdirSync(IMPORT_DIR, { recursive: true });

function parseCsvLine(line) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function normalizePath(p) {
  let out = String(p || '').trim();
  if (!out) return '';
  try {
    if (/^https?:\/\//i.test(out)) out = new URL(out).pathname;
  } catch {
    /* keep */
  }
  if (!out.startsWith('/')) out = `/${out}`;
  out = out.split('#')[0].split('?')[0];
  // keep extensionless trailing slash; keep files as-is
  if (out.length > 1 && !out.includes('.') && !out.endsWith('/')) out += '/';
  return out;
}

function parseHitLog(csvPath) {
  const raw = readFileSync(csvPath, 'utf8');
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return { rows: 0, unique: [], skipped: 0, headerOnly: true };
  }
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const si = header.findIndex((h) => ['source', 'from', 'url_from', 'match_url'].includes(h));
  const ti = header.findIndex((h) => ['target', 'to', 'destination', 'url_to'].includes(h));
  if (si < 0 || ti < 0) throw new Error(`Missing source/target columns: ${header.join(',')}`);

  const map = new Map();
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const parts = parseCsvLine(line);
    const from = normalizePath(parts[si]);
    let toRaw = parts[ti] || '';
    // skip external absolute targets to other domains
    if (/^https?:\/\//i.test(toRaw) && !toRaw.includes('emiratisationgateway.com')) {
      skipped++;
      continue;
    }
    const to = normalizePath(toRaw);
    if (!from || !to || from === to) {
      skipped++;
      continue;
    }
    map.set(from, to);
  }
  const unique = [...map.entries()].map(([from, to]) => ({ from, to, status: 301 }));
  return { rows: lines.length - 1, unique, skipped, headerOnly: false };
}

/** Emiratisation Redirection pages.xlsx (already extracted JSON cells). */
function rulesFromEmiratisationXlsxJson() {
  const jsonPath = join(ROOT, '.tmp-emiratisation-redirects.json');
  if (!existsSync(jsonPath)) return [];
  const rows = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const out = [];
  for (const row of rows.slice(1)) {
    const from = normalizePath(row[0]);
    const to = normalizePath(row[2] || row[1]);
    if (!from || !to || from === to) continue;
    out.push({ from, to, status: 301 });
  }
  return out;
}

const COMMON_ALIASES = [
  { from: '/about/', to: '/about-us/', status: 301 },
  { from: '/aboutus/', to: '/about-us/', status: 301 },
  { from: '/contact/', to: '/contact-us/', status: 301 },
  { from: '/contactus/', to: '/contact-us/', status: 301 },
  { from: '/get-in-touch/', to: '/contact-us/', status: 301 },
  { from: '/home/', to: '/', status: 301 },
  { from: '/home-new/', to: '/', status: 301 },
  { from: '/index.php', to: '/', status: 301 },
  { from: '/feed/', to: '/', status: 301 },
  { from: '/sample-page/', to: '/', status: 301 },
  { from: '/insights/', to: '/blog/', status: 301 },
  { from: '/blog', to: '/blog/', status: 301 },
  { from: '/services/', to: '/emiratisation-services/', status: 301 },
  { from: '/emiratisation/', to: '/emiratisation-services/', status: 301 },
  { from: '/recruitment/', to: '/emiratisation-recruitment/', status: 301 },
  { from: '/outsourcing/', to: '/staff-outsourcing/', status: 301 },
  { from: '/nafis/', to: '/nafis-benefits/', status: 301 },
  { from: '/careers/', to: '/career-opportunities/', status: 301 },
  { from: '/jobs/', to: '/uae-national-jobs/', status: 301 },
];

const arg = process.argv[2];
const stamp = '2026-08-06';
let logStats = { rows: 0, unique: [], skipped: 0, headerOnly: true, file: null };

if (arg && arg !== '--from-xlsx' && existsSync(arg)) {
  const destCsv = join(IMPORT_DIR, `${stamp}-redirection-log.csv`);
  copyFileSync(arg, destCsv);
  logStats = { ...parseHitLog(destCsv), file: destCsv };
  writeFileSync(
    join(IMPORT_DIR, `${stamp}-redirection-log.unique.json`),
    JSON.stringify(logStats.unique, null, 2) + '\n',
  );
}

// Always include Emiratisation spreadsheet rules when available
const xlsxRules = rulesFromEmiratisationXlsxJson();
if (xlsxRules.length) {
  writeFileSync(
    join(IMPORT_DIR, `${stamp}-emiratisation-redirection-pages.json`),
    JSON.stringify(xlsxRules, null, 2) + '\n',
  );
  // also write CSV for audit
  const csvLines = ['from,to,status'];
  for (const r of xlsxRules) csvLines.push(`${r.from},${r.to},${r.status}`);
  writeFileSync(join(IMPORT_DIR, `${stamp}-emiratisation-redirection-pages.csv`), csvLines.join('\n') + '\n');
}

const existing = new Map();
for (const r of COMMON_ALIASES) existing.set(r.from, r);
for (const r of xlsxRules) existing.set(r.from, r);
for (const r of logStats.unique) existing.set(r.from, r);

const aliasKeys = new Set(COMMON_ALIASES.map((r) => r.from));
const aliases = [];
const fromImport = [];
for (const rule of existing.values()) {
  if (aliasKeys.has(rule.from)) aliases.push(rule);
  else fromImport.push(rule);
}
fromImport.sort((a, b) => a.from.localeCompare(b.from));

const linesOut = [
  '# Canonical interim redirects for emiratisationgateway.com',
  `# Sources: common aliases + Emiratisation Redirection pages.xlsx + ${stamp} hit log (if non-empty).`,
  '# Drop future Rank Math / Redirection rules exports under imports/redirects/',
  '# and merge per docs/CURSOR-IMPORT-REDIRECTS.md.',
  '# FLOW will own day-to-day edits via /api/internal/redirects/*.',
  '',
  'redirects:',
  '  # Common aliases → real pages',
];

function emit(rule) {
  linesOut.push(`  - from: ${rule.from}`);
  linesOut.push(`    to: ${rule.to}`);
  linesOut.push(`    status: ${rule.status || 301}`);
}

for (const rule of aliases) emit(rule);
linesOut.push('');
linesOut.push('  # From Emiratisation redirection spreadsheet + hit log (unique pairs)');
for (const rule of fromImport) emit(rule);
linesOut.push('');

writeFileSync(YAML_PATH, linesOut.join('\n'));
console.log(
  JSON.stringify(
    {
      origin: ORIGIN,
      hitLogFile: logStats.file,
      hitLogRows: logStats.rows,
      hitLogUnique: logStats.unique.length,
      hitLogSkipped: logStats.skipped,
      hitLogHeaderOnly: logStats.headerOnly,
      xlsxRules: xlsxRules.length,
      aliasRules: aliases.length,
      totalRules: existing.size,
      yaml: YAML_PATH,
    },
    null,
    2,
  ),
);
