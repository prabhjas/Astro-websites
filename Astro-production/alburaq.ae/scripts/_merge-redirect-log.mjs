/**
 * Merge redirection-log hit CSV into src/data/redirects.yml (unique source→target).
 * Usage: node scripts/_merge-redirect-log.mjs <csv-path>
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV_SRC = process.argv[2];
const IMPORT_DIR = join(ROOT, 'imports/redirects');
const YAML_PATH = join(ROOT, 'src/data/redirects.yml');
const STAMP = '2026-08-07';

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
  if (out.length > 1 && !out.endsWith('/')) out += '/';
  return out;
}

if (!CSV_SRC || !existsSync(CSV_SRC)) {
  console.error('Usage: node scripts/_merge-redirect-log.mjs <csv-path>');
  process.exit(1);
}

mkdirSync(IMPORT_DIR, { recursive: true });
const destCsv = join(IMPORT_DIR, `${STAMP}-redirection-log.csv`);
copyFileSync(CSV_SRC, destCsv);

const raw = readFileSync(destCsv, 'utf8');
const lines = raw.trim().split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0] || '').map((h) => h.trim().toLowerCase());
const si = header.findIndex((h) => ['source', 'from', 'url_from', 'match_url'].includes(h));
const ti = header.findIndex((h) => ['target', 'to', 'destination', 'url_to'].includes(h));
if (si < 0 || ti < 0) {
  console.error('Missing source/target columns', header);
  process.exit(1);
}

const map = new Map();
let skipped = 0;
for (const line of lines.slice(1)) {
  const parts = parseCsvLine(line);
  const from = normalizePath(parts[si]);
  const to = normalizePath(parts[ti]);
  if (!from || !to || from === to) {
    skipped++;
    continue;
  }
  map.set(from, to);
}

const unique = [...map.entries()].map(([from, to]) => ({ from, to, status: 301 }));
writeFileSync(join(IMPORT_DIR, `${STAMP}-redirection-log.unique.json`), JSON.stringify(unique, null, 2));

/** Baseline aliases for alburaq.ae (same pattern as peer FULL_CMS sites). */
const ALIASES = [
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
  { from: '/blogs/', to: '/blog/', status: 301 },
  { from: '/payroll/', to: '/payroll-outsourcing/', status: 301 },
  { from: '/sponsorship/', to: '/corporate-sponsorship/', status: 301 },
  { from: '/services/', to: '/what-we-do/', status: 301 },
];

const existing = new Map();
for (const rule of ALIASES) existing.set(rule.from, rule);

if (existsSync(YAML_PATH)) {
  const yaml = readFileSync(YAML_PATH, 'utf8');
  const blockRe = /- from:\s*(\S+)\s*\n\s*to:\s*(\S+)\s*\n\s*status:\s*(\d+)/g;
  let m;
  while ((m = blockRe.exec(yaml))) {
    // keep prior non-alias rules; aliases always re-emitted from ALIASES
    if (!ALIASES.some((a) => a.from === m[1])) {
      existing.set(m[1], { from: m[1], to: m[2], status: Number(m[3]) || 301 });
    }
  }
}

let added = 0;
let updated = 0;
for (const rule of unique) {
  const prev = existing.get(rule.from);
  if (!prev) {
    existing.set(rule.from, rule);
    added++;
  } else if (prev.to !== rule.to) {
    existing.set(rule.from, rule);
    updated++;
  }
}

const aliasKeys = new Set(ALIASES.map((a) => a.from));
const aliases = [];
const fromLog = [];
for (const rule of existing.values()) {
  if (aliasKeys.has(rule.from)) aliases.push(rule);
  else fromLog.push(rule);
}
// Prefer canonical alias targets
for (const a of ALIASES) {
  const i = aliases.findIndex((x) => x.from === a.from);
  if (i >= 0) aliases[i] = a;
  else aliases.push(a);
}
fromLog.sort((a, b) => a.from.localeCompare(b.from));

const linesOut = [
  '# Canonical interim redirects for alburaq.ae',
  `# Sources: common aliases + imports/redirects/${STAMP}-redirection-log.csv (unique source->target).`,
  '# Drop future Rank Math / Redirection rules exports under imports/redirects/',
  '# and merge per docs/CURSOR-IMPORT-REDIRECTS.md.',
  '# FLOW will own day-to-day edits via /api/internal/redirects/*.',
  '',
  'redirects:',
  '  # Common aliases -> real pages',
];

function emit(rule) {
  linesOut.push(`  - from: ${rule.from}`);
  linesOut.push(`    to: ${rule.to}`);
  linesOut.push(`    status: ${rule.status || 301}`);
}

for (const rule of aliases) emit(rule);
linesOut.push('');
linesOut.push('  # From redirection plugin hit log (unique pairs)');
if (!fromLog.length) {
  linesOut.push('  # (none - hit log had no unique source->target pairs)');
} else {
  for (const rule of fromLog) emit(rule);
}
linesOut.push('');

writeFileSync(YAML_PATH, linesOut.join('\n'));
console.log(
  JSON.stringify(
    {
      source: basename(CSV_SRC),
      csvRows: Math.max(0, lines.length - 1),
      uniqueFromLog: unique.length,
      skipped,
      added,
      updated,
      aliasCount: aliases.length,
      totalRules: aliases.length + fromLog.length,
      yaml: YAML_PATH,
    },
    null,
    2,
  ),
);
