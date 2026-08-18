#!/usr/bin/env node
/**
 * check-sitemap — T1 polite crawl of every sitemap URL (pages + posts) per site.
 *
 *   node scripts/fleet-monitor/check-sitemap.mjs [all|id1,id2] [--rediscover]
 *
 * Reads local/monitor-evidence/urls/<site>.json (runs discovery if missing or --rediscover).
 * Records one JSONL line per URL: status, ttfb, bytes, cf-cache, verdict, transition
 * (previous status → current, e.g. 200→404). Per-URL last-known status is kept in
 * urls/<site>.status.json so "left 200" is detectable across days.
 *
 * Politeness: fleetConcurrency sites in parallel, siteConcurrency requests per site, jitter,
 * body reads capped (we need status/size, not full pages).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, EVIDENCE_DIR, ensureEvidenceDirs, resolveSites, probe, pool, jitter, log, nowIso, appendCheck, loadState, saveState, siteState, siteThresholds, writeHeartbeat } from './lib.mjs';
import { discoverSite } from './discover-urls.mjs';

const args = process.argv.slice(2);
const REDISCOVER = args.includes('--rediscover');
const selector = args.find((a) => !a.startsWith('--'));

function statusFile(id) { return join(EVIDENCE_DIR, 'urls', `${id}.status.json`); }

async function crawlSite(site, state) {
  const th = siteThresholds(site.id);
  const st = siteState(state, site.id);
  const corpusFile = join(EVIDENCE_DIR, 'urls', `${site.id}.json`);
  let corpus = (!REDISCOVER && existsSync(corpusFile)) ? JSON.parse(readFileSync(corpusFile, 'utf8')) : await discoverSite(site);
  const prev = existsSync(statusFile(site.id)) ? JSON.parse(readFileSync(statusFile(site.id), 'utf8')) : {};
  const next = {};
  const started = Date.now();
  const tally = { total: corpus.urls.length, ok: 0, s3xx: 0, s4xx: 0, s5xx: 0, err: 0, left200: 0, slow: 0 };
  const ttfbs = [];

  const tasks = corpus.urls.map((u) => async () => {
    await jitter();
    const r = await probe(u.loc, { maxBytes: 256 * 1024 });
    const previous = prev[u.loc] ?? null;
    let verdict = 'pass'; let reason = null;
    if (r.error) { verdict = 'fail'; reason = r.error; tally.err++; }
    else if (r.status >= 500) { verdict = 'fail'; reason = `status ${r.status}`; tally.s5xx++; }
    else if (r.status >= 400) { verdict = previous === 200 ? 'fail' : 'warn'; reason = `status ${r.status}${previous === 200 ? ' (was 200)' : ''}`; tally.s4xx++; }
    else if (r.status >= 300) { verdict = 'info'; reason = `redirect → ${r.location}`; tally.s3xx++; }
    else { tally.ok++; if (r.ttfbMs > th.ttfbFailMs) { verdict = 'warn'; reason = `ttfb ${r.ttfbMs}ms`; tally.slow++; } }
    if (previous === 200 && r.status !== 200 && !r.error) tally.left200++;
    if (r.ttfbMs != null) ttfbs.push(r.ttfbMs);
    next[u.loc] = r.status || 0;
    const { bodyText, title, ...slimRec } = r;
    appendCheck({ ts: nowIso(), site: site.id, domain: site.domain, type: 'sitemap', route: safePath(u.loc), ...slimRec, previousStatus: previous, transition: previous !== null && previous !== r.status ? `${previous}→${r.status || r.error}` : null, verdict, reason });
  });

  await pool(tasks, CONFIG.politeness.siteConcurrency);
  // carry forward URLs that vanished from the sitemap (keep last status for transition detection)
  writeFileSync(statusFile(site.id), `${JSON.stringify({ ...prev, ...next })}\n`);
  st.lastSitemapCrawl = nowIso();
  st.lastSitemapTally = tally;
  ttfbs.sort((a, b) => a - b);
  const p50 = ttfbs[Math.floor(ttfbs.length * 0.5)] ?? null; const p95 = ttfbs[Math.floor(ttfbs.length * 0.95)] ?? null;
  appendCheck({ ts: nowIso(), site: site.id, domain: site.domain, type: 'sitemap-summary', url: corpus.canonicalOrigin, status: 200, ok: tally.s5xx === 0 && tally.err === 0, ...tally, p50TtfbMs: p50, p95TtfbMs: p95, durationMs: Date.now() - started, verdict: tally.s5xx || tally.err ? 'fail' : tally.left200 ? 'warn' : 'pass', reason: null });
  return { site: site.id, ...tally, p50, p95, durationMs: Date.now() - started };
}

function safePath(loc) { try { const u = new URL(loc); return u.pathname + u.search; } catch { return loc; } }

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureEvidenceDirs();
  const sites = resolveSites(selector);
  const state = loadState();
  const startedAt = Date.now();
  log(`sitemap crawl: ${sites.length} site(s)`);
  const results = await pool(sites.map((s) => () => crawlSite(s, state).then((r) => {
    log(`${s.id.padEnd(24)} ${String(r.total).padStart(5)} urls  ok=${r.ok} 3xx=${r.s3xx} 4xx=${r.s4xx} 5xx=${r.s5xx} err=${r.err} left200=${r.left200}  p50=${r.p50}ms p95=${r.p95}ms  ${Math.round(r.durationMs / 1000)}s`);
    saveState(state);
    return r;
  })), CONFIG.politeness.fleetConcurrency);
  saveState(state);
  const ok = results.filter(Boolean);
  const summary = { sites: sites.length, urls: ok.reduce((a, r) => a + r.total, 0), s5xx: ok.reduce((a, r) => a + r.s5xx, 0), s4xx: ok.reduce((a, r) => a + r.s4xx, 0), err: ok.reduce((a, r) => a + r.err, 0), left200: ok.reduce((a, r) => a + r.left200, 0), durationMs: Date.now() - startedAt };
  writeHeartbeat('sitemap', summary);
  log(`sitemap done: ${JSON.stringify(summary)}`);
}
