#!/usr/bin/env node
/**
 * Run Lighthouse against local fleet sites (changed sites only — not a daily 42-site cron).
 *
 * Prerequisites:
 *   node scripts/fleet-local.mjs up <site-id>   # site must be serving
 *
 * Usage:
 *   node scripts/fleet-lighthouse.mjs --site connecthr --paths /,/blogs/
 *   node scripts/fleet-lighthouse.mjs --site connecthr,connectgroup --paths /
 *   node scripts/fleet-lighthouse.mjs --site connecthr --paths / --min-score 95
 *
 * Output: local/lighthouse-evidence/<site-id>/<timestamp>-<path-slug>.json + summary table
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'scripts/fleet-sites.json'), 'utf8'));
const EVIDENCE_DIR = join(ROOT, 'local/lighthouse-evidence');
const LIGHTHOUSE_VERSION = '13.4.1';

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { site: '', paths: ['/'], minScore: 95, formFactor: 'mobile' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site' && argv[i + 1]) opts.site = argv[++i];
    else if (a === '--paths' && argv[i + 1]) opts.paths = argv[++i].split(',').map((p) => p.trim()).filter(Boolean);
    else if (a === '--min-score' && argv[i + 1]) opts.minScore = Number(argv[++i]);
    else if (a === '--desktop') opts.formFactor = 'desktop';
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/fleet-lighthouse.mjs --site <id> [--paths /,/blogs/] [--min-score 95] [--desktop]`);
      process.exit(0);
    }
  }
  if (!opts.site) die('Missing --site <site-id> (see scripts/fleet-sites.json)');
  return opts;
}

function resolveSites(selector) {
  const ids = selector.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.map((id) => {
    const site = REGISTRY.sites.find((s) => s.id === id || s.dir === id || s.domain === id);
    if (!site) die(`Unknown site: ${id}`);
    return site;
  });
}

function pathSlug(p) {
  return p === '/' ? 'home' : p.replace(/^\/+|\/+$/g, '').replace(/\//g, '_') || 'root';
}

function runLighthouse(url, outFile, formFactor) {
  const args = [
    `lighthouse@${LIGHTHOUSE_VERSION}`,
    url,
    '--output=json',
    `--output-path=${outFile}`,
    '--quiet',
    '--chrome-flags=--headless --no-sandbox --disable-gpu',
    `--form-factor=${formFactor}`,
    '--only-categories=performance',
  ];
  const r = spawnSync('npx', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    die(`Lighthouse failed for ${url}`);
  }
}

function extractScores(json) {
  const perf = json.categories?.performance?.score;
  const audits = json.audits || {};
  return {
    performance: perf != null ? Math.round(perf * 100) : null,
    lcp: audits['largest-contentful-paint']?.displayValue ?? '—',
    cls: audits['cumulative-layout-shift']?.displayValue ?? '—',
    inp: audits['interaction-to-next-paint']?.displayValue ?? audits['experimental-interaction-to-next-paint']?.displayValue ?? '—',
    fcp: audits['first-contentful-paint']?.displayValue ?? '—',
    tbt: audits['total-blocking-time']?.displayValue ?? '—',
  };
}

const opts = parseArgs(process.argv);
const sites = resolveSites(opts.site);
mkdirSync(EVIDENCE_DIR, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const rows = [];
let failed = 0;

for (const site of sites) {
  const siteDir = join(EVIDENCE_DIR, site.id);
  mkdirSync(siteDir, { recursive: true });

  for (const p of opts.paths) {
    const pathNorm = p.startsWith('/') ? p : `/${p}`;
    const url = `http://127.0.0.1:${site.port}${pathNorm}`;
    const outFile = join(siteDir, `${ts}-${pathSlug(pathNorm)}.json`);

    console.log(`\n→ ${site.domain}${pathNorm} (${url})`);
    runLighthouse(url, outFile, opts.formFactor);

    const json = JSON.parse(readFileSync(outFile, 'utf8'));
    const scores = extractScores(json);
    const pass = scores.performance != null && scores.performance >= opts.minScore;
    if (!pass) failed++;

    rows.push({
      site: site.id,
      domain: site.domain,
      path: pathNorm,
      ...scores,
      pass: pass ? 'PASS' : 'FAIL',
      file: outFile.replace(ROOT + '/', ''),
    });

    console.log(`  Performance: ${scores.performance} | LCP ${scores.lcp} | CLS ${scores.cls} | ${pass ? 'PASS' : 'FAIL'} (min ${opts.minScore})`);
  }
}

console.log('\n--- Summary ---');
console.table(rows.map(({ site, path, performance, lcp, cls, pass }) => ({ site, path, performance, lcp, cls, pass })));

if (failed > 0) {
  die(`\n${failed} URL(s) below min score ${opts.minScore}. See ${EVIDENCE_DIR.replace(ROOT + '/', '')}/`, 2);
}

console.log(`\nAll ${rows.length} URL(s) ≥ ${opts.minScore}. Evidence in local/lighthouse-evidence/`);
