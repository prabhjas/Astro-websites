/**
 * Merge redirection-log hit CSV into src/data/redirects.yml for emiratisationhub.com.
 * Usage:
 *   node scripts/_merge-redirect-log.mjs "<csv-path>"
 *
 * Hit-log unique source→target pairs win over common aliases on the same `from`.
 * External targets to other domains are skipped.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_DIR = join(ROOT, 'imports/redirects');
const YAML_PATH = join(ROOT, 'src/data/redirects.yml');
const ORIGIN = 'https://emiratisationhub.com';
const SITE_HOST = 'emiratisationhub.com';

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
    let toRaw = (parts[ti] || '').trim();
    if (/^https?:\/\//i.test(toRaw) && !toRaw.toLowerCase().includes(SITE_HOST)) {
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

function loadExistingYaml() {
  if (!existsSync(YAML_PATH)) return [];
  try {
    const data = parseYaml(readFileSync(YAML_PATH, 'utf8')) ?? {};
    return Array.isArray(data.redirects) ? data.redirects.filter((r) => r?.from && r?.to) : [];
  } catch {
    return [];
  }
}

const arg = process.argv[2];
if (!arg || !existsSync(arg)) {
  console.error('Usage: node scripts/_merge-redirect-log.mjs <csv-path>');
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 10);
const destCsv = join(IMPORT_DIR, `${stamp}-redirection-log.csv`);
copyFileSync(arg, destCsv);

const logStats = { ...parseHitLog(destCsv), file: destCsv };
writeFileSync(
  join(IMPORT_DIR, `${stamp}-redirection-log.unique.json`),
  `${JSON.stringify(logStats.unique, null, 2)}\n`,
);

// Merge: existing YAML + hit-log (log wins on duplicate `from`).
const byFrom = new Map();
for (const r of loadExistingYaml()) {
  byFrom.set(normalizePath(r.from), {
    from: normalizePath(r.from),
    to: normalizePath(r.to) || String(r.to),
    status: Number(r.status || 301),
  });
}
for (const r of logStats.unique) {
  byFrom.set(r.from, r);
}

const merged = [...byFrom.values()].sort((a, b) => a.from.localeCompare(b.from));

const linesOut = [
  `# Canonical interim redirects for ${SITE_HOST}`,
  `# Sources: existing aliases + imports/redirects/${stamp}-redirection-log.csv (unique source→target).`,
  '# Drop future Rank Math / Redirection exports under imports/redirects/',
  '# and merge per docs/CURSOR-IMPORT-REDIRECTS.md.',
  '# FLOW will own day-to-day edits via /api/internal/redirects/*.',
  '',
  'redirects:',
];

for (const rule of merged) {
  linesOut.push(`  - from: ${rule.from}`);
  linesOut.push(`    to: ${rule.to}`);
  linesOut.push(`    status: ${rule.status || 301}`);
}
linesOut.push('');

writeFileSync(YAML_PATH, linesOut.join('\n'), 'utf8');

console.log(
  JSON.stringify(
    {
      origin: ORIGIN,
      savedCsv: destCsv.replace(/\\/g, '/'),
      hitRows: logStats.rows,
      headerOnly: logStats.headerOnly,
      uniqueFromLog: logStats.unique.length,
      skipped: logStats.skipped,
      totalInYaml: merged.length,
    },
    null,
    2,
  ),
);

if (logStats.headerOnly) {
  console.warn(
    '\nWARNING: CSV has header only (no redirect hits). Re-export the Redirection log from WordPress with data, then re-run this script.',
  );
}
