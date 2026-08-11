#!/usr/bin/env node
/**
 * Merge a Redirection plugin JSON export into src/data/redirects.yml
 * Follows docs/CURSOR-IMPORT-REDIRECTS.md (merge mode).
 *
 * Usage:
 *   node scripts/import-redirection-export.mjs [path-to-export.json]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { parseRankMathRedirectImport } from '../../../packages/site-cms/src/runtime-redirects/store.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const YML_PATH = join(ROOT, 'src/data/redirects.yml');
const IMPORTS_DIR = join(ROOT, 'imports/redirects');
const ORIGIN = 'https://lladesigners.com';

const inputArg = process.argv[2];
const defaultImport = join(IMPORTS_DIR, '2026-08-10-redirection-export.json');
const sourcePath = inputArg
  ? inputArg.startsWith('/') || /^[A-Za-z]:/.test(inputArg)
    ? inputArg
    : join(ROOT, inputArg)
  : defaultImport;

if (!existsSync(sourcePath)) {
  console.error('Missing export file:', sourcePath);
  process.exit(1);
}

mkdirSync(IMPORTS_DIR, { recursive: true });
const stagedName = `2026-08-10-redirection-export.json`;
const stagedPath = join(IMPORTS_DIR, stagedName);
if (sourcePath !== stagedPath) {
  copyFileSync(sourcePath, stagedPath);
}

const raw = readFileSync(stagedPath, 'utf8');
const parsedJson = JSON.parse(raw);
const rawCount = Array.isArray(parsedJson.redirects) ? parsedJson.redirects.length : 0;
const disabledCount = Array.isArray(parsedJson.redirects)
  ? parsedJson.redirects.filter((r) => r && r.enabled === false).length
  : 0;

const parsed = parseRankMathRedirectImport(raw);

function splitPathQuery(value) {
  const raw = String(value || '').trim();
  const q = raw.indexOf('?');
  if (q === -1) return { path: raw, query: '' };
  return { path: raw.slice(0, q), query: raw.slice(q + 1) };
}

function withTrailingSlash(path) {
  if (!path) return '/';
  if (path.endsWith('/')) return path;
  if (/\.[a-z0-9]+$/i.test(path)) return path;
  return `${path}/`;
}

function normaliseTo(to) {
  let out = String(to || '').trim();
  out = out.replace(/^https?:\/\/(?:www\.)?lladesigners\.com/i, '');
  if (!out) out = '/';
  if (!out.startsWith('/') && !/^https?:\/\//i.test(out)) out = `/${out}`;
  if (/^https?:\/\//i.test(out)) return out;
  const { path, query } = splitPathQuery(out);
  const fixed = withTrailingSlash(path || '/');
  return query ? `${fixed}?${query}` : fixed;
}

function normaliseFrom(from) {
  let out = String(from || '').trim().replace(/^https?:\/\/[^/]+/i, '');
  if (!out.startsWith('/')) out = `/${out}`;
  // parseRankMathRedirectImport appends "/" even after query strings — undo that.
  if (out.includes('?') && out.endsWith('/')) out = out.slice(0, -1);
  const { path, query } = splitPathQuery(out);
  const fixed = withTrailingSlash(path || '/');
  return query ? `${fixed}?${query}` : fixed;
}

const importedMap = new Map();
let skippedSelf = 0;
let skippedBad = 0;
for (const rule of parsed) {
  const from = normaliseFrom(rule.from);
  const to = normaliseTo(rule.to);
  if (!from || !to) {
    skippedBad += 1;
    continue;
  }
  if (from === to) {
    skippedSelf += 1;
    continue;
  }
  importedMap.set(from, { from, to, status: rule.status || 301 });
}
const imported = [...importedMap.values()];

let existing = [];
if (existsSync(YML_PATH)) {
  const yaml = await import('yaml');
  const doc = yaml.parse(readFileSync(YML_PATH, 'utf8')) || {};
  existing = Array.isArray(doc.redirects) ? doc.redirects : [];
}

const existingMap = new Map(
  existing
    .filter((r) => r?.from && r?.to)
    .map((r) => [normaliseFrom(r.from), { from: normaliseFrom(r.from), to: normaliseTo(r.to), status: r.status ?? 301 }]),
);
const before = existingMap.size;
let added = 0;
let overwritten = 0;
for (const r of imported) {
  if (existingMap.has(r.from)) overwritten += 1;
  else added += 1;
  existingMap.set(r.from, r);
}
const merged = [...existingMap.values()].sort((a, b) => a.from.localeCompare(b.from));

const header = `# Canonical redirects for lladesigners.com
# Sources: Redirection plugin export imports/redirects/${stagedName}
# Merge per docs/CURSOR-IMPORT-REDIRECTS.md. FLOW will own day-to-day edits via /api/internal/redirects/*.
`;
writeFileSync(YML_PATH, header + stringify({ redirects: merged }, { lineWidth: 0 }), 'utf8');

const report = {
  mode: 'merge',
  source: stagedName,
  origin: ORIGIN,
  rawRedirectRows: rawCount,
  disabledSkipped: disabledCount,
  parsedByCms: parsed.length,
  uniqueImported: imported.length,
  skippedSelfRedirects: skippedSelf,
  skippedBad: skippedBad + Math.max(0, parsed.length - imported.length - skippedSelf),
  existingBefore: before,
  added,
  overwritten,
  totalAfter: merged.length,
  sample: merged.slice(0, 8),
};
mkdirSync(join(ROOT, '.tmp-qa'), { recursive: true });
writeFileSync(join(ROOT, '.tmp-qa/redirect-import-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
