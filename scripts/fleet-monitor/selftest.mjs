#!/usr/bin/env node
/**
 * selftest — proves the verdict rules against local mock sites (no network, no real fleet traffic).
 *
 *   node scripts/fleet-monitor/selftest.mjs
 *
 * Spins up mock HTTP "sites" on 127.0.0.1, each modelling one failure class, runs the real
 * discover / check-critical / check-sitemap / report scripts against them in an isolated evidence dir,
 * then asserts the recorded verdicts. Exit 0 = all assertions pass.
 *
 * Scenarios: healthy · 500 on home · soft-404 · robots blocks all · body shrink · slow TTFB ·
 * sitemap 200→404 transition · streak/wouldAlert on 2nd consecutive fail · publish-window detection.
 */
import http from 'node:http';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { MONITOR_DIR, ROOT } from './lib.mjs';

const EVID = mkdtempSync(join(tmpdir(), 'fleet-monitor-selftest-'));
const page = (title, size = 4000) => `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1><form action="/api/contact/"></form>${'x'.repeat(size)}</body></html>`;
const robotsOk = (o) => `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: ${o}/sitemap-index.xml\n`;
const smIndex = (o) => `<?xml version="1.0"?><sitemapindex xmlns="x"><sitemap><loc>${o}/page-sitemap.xml</loc></sitemap></sitemapindex>`;
const urlset = (o, n) => `<?xml version="1.0"?><urlset xmlns="x">${Array.from({ length: n }, (_, i) => `<url><loc>${o}/p${i}/</loc></url>`).join('')}</urlset>`;

// mutable knobs the test flips between runs
const knobs = { shrinkHome: false, p2Is404: false, commit: 'aaaa1111' };

function makeSite(id, behaviour) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const o = `http://127.0.0.1:${srv.address().port}`;
      const send = (status, body, type = 'text/html', extra = {}) => { res.writeHead(status, { 'content-type': type, 'x-astro-fleet-commit': knobs.commit, ...extra }); res.end(body); };
      const u = req.url;
      if (u === '/robots.txt') return send(200, behaviour.robotsBlock ? 'User-agent: *\nDisallow: /\n' : robotsOk(o), 'text/plain');
      if (u === '/sitemap-index.xml') return send(200, smIndex(o), 'application/xml');
      if (u === '/page-sitemap.xml') return send(200, urlset(o, 4), 'application/xml');
      if (u.startsWith('/__fleet_missing_')) return behaviour.soft404 ? send(301, '', 'text/html', { location: '/' }) : send(404, page('Not found', 500));
      if (u === '/api/health/') return send(200, '{"ok":true}', 'application/json');
      if (u === '/') {
        if (behaviour.home500) return send(500, 'boom');
        const body = page(`${id} — Home`, behaviour.shrink && knobs.shrinkHome ? 100 : 4000);
        if (behaviour.slowMs) return setTimeout(() => send(200, body), behaviour.slowMs);
        return send(200, body);
      }
      if (/^\/p\d+\/$/.test(u)) { if (u === '/p2/' && knobs.p2Is404 && behaviour.transition) return send(404, page('gone', 300)); return send(200, page(`${id} ${u}`)); }
      send(404, page('nf', 300));
    });
    srv.listen(0, '127.0.0.1', () => resolve({ id, srv, origin: `http://127.0.0.1:${srv.address().port}` }));
  });
}

// async spawn — the mock servers live in this process, so the event loop must keep running
function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(MONITOR_DIR, script), ...args], { cwd: ROOT, env: { ...process.env, FLEET_MONITOR_EVIDENCE_DIR: EVID, FLEET_MONITOR_TEST_SITES: JSON.stringify(SITES.map((s) => ({ id: s.id, domain: `${s.id}.test`, port: 0, origin: s.origin }))) } });
    let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
    child.on('exit', (code) => (code === 0 ? resolve(out) : (console.error(out), reject(new Error(`${script} exited ${code}`)))));
  });
}
function checks() {
  const dir = join(EVID, 'checks');
  return readdirSync(dir).flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
}
let pass = 0, fail = 0;
function expect(name, cond, detail = '') { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${detail}`); } }
const last = (all, site, type, route) => all.filter((c) => c.site === site && c.type === type && (route == null || c.route === route)).at(-1);

const SITES = await Promise.all([
  makeSite('healthy', {}),
  makeSite('down500', { home500: true }),
  makeSite('soft404', { soft404: true }),
  makeSite('robotsblock', { robotsBlock: true }),
  makeSite('shrink', { shrink: true }),
  makeSite('slow', { slowMs: 1700 }),
  makeSite('transition', { transition: true }),
]);
console.log(`selftest: ${SITES.length} mock sites, evidence → ${EVID}\n`);

try {
  // ---- run 1: discover + critical + sitemap
  await run('discover-urls.mjs');
  await run('check-critical.mjs');
  await run('check-sitemap.mjs');
  let all = checks();
  console.log('run 1');
  expect('healthy: home pass', last(all, 'healthy', 'critical', '/')?.verdict === 'pass');
  expect('healthy: robots pass (named-bot Disallow not mistaken for wildcard)', last(all, 'healthy', 'critical', '/robots.txt')?.verdict === 'pass');
  expect('healthy: sitemap pass', last(all, 'healthy', 'critical', 'sitemap')?.verdict === 'pass');
  expect('healthy: guaranteed-404 pass', last(all, 'healthy', 'critical', '/__missing__')?.verdict === 'pass');
  expect('healthy: health pass', last(all, 'healthy', 'critical', '/api/health/')?.verdict === 'pass');
  expect('discover: 4 urls found via robots→index→urlset', last(all, 'healthy', 'discover')?.urlCount === 4, JSON.stringify(last(all, 'healthy', 'discover')));
  expect('down500: home fail status 500, streak 1, no alert yet', (() => { const c = last(all, 'down500', 'critical', '/'); return c?.verdict === 'fail' && c.status === 500 && c.streak === 1 && c.wouldAlert === false; })());
  expect('soft404: missing route 301 → fail soft-404', /soft-404/.test(last(all, 'soft404', 'critical', '/__missing__')?.reason ?? ''));
  expect('robotsblock: fail', /blocks all/.test(last(all, 'robotsblock', 'critical', '/robots.txt')?.reason ?? ''));
  expect('slow: TTFB > 1500 → warn', last(all, 'slow', 'critical', '/')?.verdict === 'warn' && /ttfb/.test(last(all, 'slow', 'critical', '/').reason));
  expect('sitemap crawl: all 4 urls 200 on transition site', last(all, 'transition', 'sitemap-summary')?.ok === 4);

  // ---- run 2: flip knobs — shrink home, p2 → 404, new commit (publish window)
  knobs.shrinkHome = true; knobs.p2Is404 = true; knobs.commit = 'bbbb2222';
  await run('check-critical.mjs');
  await run('check-sitemap.mjs');
  all = checks();
  console.log('run 2');
  expect('down500: 2nd fail inside publish window → streak 2 but NOT alerting (threshold raised to 3)', (() => { const c = last(all, 'down500', 'critical', '/'); return c?.streak === 2 && c.wouldAlert === false && c.inPublishWindow === true; })(), JSON.stringify(last(all, 'down500', 'critical', '/')));
  expect('shrink: body shrank vs learned baseline → fail', /shrank/.test(last(all, 'shrink', 'critical', '/')?.reason ?? ''));
  expect('publish window: commit change detected → inPublishWindow true', last(all, 'healthy', 'critical', '/')?.inPublishWindow === true);
  const t = last(all, 'transition', 'sitemap-summary');
  expect('sitemap: 200→404 transition counted as left200', t?.left200 === 1, JSON.stringify(t));
  const p2 = all.filter((c) => c.site === 'transition' && c.type === 'sitemap' && c.route === '/p2/').at(-1);
  expect('sitemap: per-URL transition string "200→404" + verdict fail (was 200)', p2?.transition === '200→404' && p2.verdict === 'fail', JSON.stringify(p2));
  const state = JSON.parse(readFileSync(join(EVID, 'state.json'), 'utf8'));
  expect('state: commitHistory records the release', state.sites.healthy.commitHistory?.length === 1 && state.sites.healthy.commitHistory[0].to === 'bbbb2222');
  expect('state: hosting classified as fleet (commit header seen)', state.sites.healthy.hosting === 'fleet');

  // ---- run 3: recovery resets streak
  knobs.shrinkHome = false;
  await run('check-critical.mjs', ['shrink,down500']);
  all = checks();
  console.log('run 3');
  expect('shrink: recovered → pass, streak reset to 0', (() => { const c = last(all, 'shrink', 'critical', '/'); return c?.verdict === 'pass' && c.streak === 0; })());
  expect('down500: 3rd consecutive fail → wouldAlert even inside publish window', (() => { const c = last(all, 'down500', 'critical', '/'); return c?.streak === 3 && c.wouldAlert === true; })(), JSON.stringify(last(all, 'down500', 'critical', '/')));

  // ---- report + status generate without error
  const out = await run('report.mjs', ['--days', '1', '--out', join(EVID, 'report.md')]);
  const md = readFileSync(join(EVID, 'report.md'), 'utf8');
  console.log('report');
  expect('report written', /report written/.test(out));
  expect('report lists would-alert incident for down500', /down500 \| \/ \|/.test(md));
  expect('report lists problem URL /p2/', /\/p2\//.test(md));
  expect('report shows publish-window column', /Publish window\?/.test(md));
  const heartbeat = readFileSync(join(EVID, 'heartbeat.jsonl'), 'utf8').split('\n').filter(Boolean).length;
  expect('heartbeat written per step (≥ 5)', heartbeat >= 5, `got ${heartbeat}`);
} finally {
  for (const s of SITES) s.srv.close();
}
console.log(`\nselftest: ${pass} passed, ${fail} failed  (evidence kept at ${EVID})`);
if (fail) process.exit(1);
