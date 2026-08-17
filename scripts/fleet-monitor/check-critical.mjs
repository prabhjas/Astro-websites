#!/usr/bin/env node
/**
 * check-critical — T0 critical-route checks for every enrolled site.
 *
 *   node scripts/fleet-monitor/check-critical.mjs [all|id1,id2] [--cert] [--origin]
 *
 * Per site (canonical origin, learned during discovery):
 *   /  robots.txt  sitemap  guaranteed-404  /api/health/  up to 3 conversion pages
 *   non-canonical host → canonical redirect assertion
 *   content assertions on / (body floor, shrink vs learned baseline, title marker)
 *   --cert    TLS certificate days-remaining
 *   --origin  loopback probe of 127.0.0.1:<port> (host placement only)
 *
 * Every probe → one JSONL record with verdict pass|warn|fail|info, streak and wouldAlert.
 * Phase 1: evidence only. Nothing is sent anywhere.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, EVIDENCE_DIR, ensureEvidenceDirs, resolveSites, probe, slim, certInfo, pool, jitter, log, nowIso, appendCheck, loadState, saveState, siteState, siteThresholds, writeHeartbeat } from './lib.mjs';
import { canonicalOrigin } from './discover-urls.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const selector = args.find((a) => !a.startsWith('--'));
const DO_CERT = flags.has('--cert');
const dbg = process.env.FLEET_MONITOR_DEBUG ? (...a) => console.error('[dbg]', ...a) : () => {};
const DO_ORIGIN = flags.has('--origin') || CONFIG.origin.enabled || process.env.FLEET_MONITOR_ORIGIN === '1';

function urlsFor(siteId) {
  const f = join(EVIDENCE_DIR, 'urls', `${siteId}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
}

function conversionPages(corpus, origin) {
  if (!corpus?.urls?.length) return [];
  const hints = CONFIG.critical.conversionPathHints;
  const found = [];
  for (const h of hints) {
    const hit = corpus.urls.find((u) => { try { const p = new URL(u.loc).pathname.replace(/\/+$/, ''); return p === h || p.endsWith(h); } catch { return false; } });
    if (hit && !found.includes(hit.loc)) found.push(hit.loc);
    if (found.length >= 3) break;
  }
  return found.filter((u) => u.startsWith(origin));
}

/**
 * True only if a `User-agent: *` group contains `Disallow: /` and no `Allow: /`.
 * Groups are separated by user-agent lines (RFC 9309); named-bot blocks (e.g. Cloudflare-managed
 * AI-crawler denies) must not be mistaken for a wildcard block.
 */
function robotsBlocksAll(text) {
  const groups = []; let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim(); if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const key = m[1].toLowerCase(); const val = m[2].trim();
    if (key === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); }
    else if (cur && (key === 'disallow' || key === 'allow')) cur.rules.push([key, val]);
  }
  return groups.some((g) => g.agents.includes('*') && g.rules.some(([k, v]) => k === 'disallow' && v === '/') && !g.rules.some(([k, v]) => k === 'allow' && v === '/'));
}

function ttfbVerdict(ms, th) {
  if (ms == null) return null;
  if (ms > th.ttfbFailMs) return ['fail', `ttfb ${ms}ms > ${th.ttfbFailMs}`];
  if (ms > th.ttfbWarnMs) return ['warn', `ttfb ${ms}ms > ${th.ttfbWarnMs}`];
  return null;
}

/** Update fail streak in state and decide wouldAlert. Mutates st.streaks. */
function applyStreak(st, key, verdict, th, inPublishWindow) {
  st.streaks ??= {};
  if (verdict === 'fail') st.streaks[key] = (st.streaks[key] ?? 0) + 1; else st.streaks[key] = 0;
  const need = inPublishWindow ? th.consecutiveFailsInPublishWindow : th.consecutiveFails;
  return { streak: st.streaks[key], wouldAlert: st.streaks[key] >= need };
}

async function checkSite(site, state) {
  const th = siteThresholds(site.id);
  const st = siteState(state, site.id);
  const ts = nowIso();
  const records = [];

  // canonical origin — reuse learned, else learn now
  let origin = st.canonicalOrigin;
  if (!origin) { const c = await canonicalOrigin(site.domain, site.origin); origin = c.origin; st.canonicalOrigin = origin; st.wwwCanonical = c.redirected; }
  const canonicalHost = new URL(origin).hostname;
  const otherHost = canonicalHost.startsWith('www.') ? canonicalHost.slice(4) : `www.${canonicalHost}`;
  const corpus = urlsFor(site.id);

  const emit = (r) => { records.push(r); appendCheck(r); };
  const base = (extra) => ({ ts, site: site.id, domain: site.domain, ...extra });

  dbg(site.id, '1. Homepage');
  // ---- 1. Homepage (with content assertions + publish-window detection)
  await jitter();
  const home = await probe(`${origin}/`);
  let verdict = 'pass'; const reasons = [];
  if (home.error) { verdict = 'fail'; reasons.push(home.error); }
  else if (home.status !== 200) { verdict = 'fail'; reasons.push(`status ${home.status}`); }
  else {
    if (home.bytes < th.minBodyBytes) { verdict = 'fail'; reasons.push(`body ${home.bytes}B < ${th.minBodyBytes}`); }
    if (st.homeBytesBaseline && home.bytes < st.homeBytesBaseline * th.bodyShrinkFailRatio) { verdict = 'fail'; reasons.push(`body shrank ${home.bytes}B vs baseline ${st.homeBytesBaseline}B`); }
    const marker = th.titleMarker ?? st.learnedTitle ?? null;
    if (marker && !(home.title ?? '').toLowerCase().includes(String(marker).toLowerCase().slice(0, 24))) { if (verdict === 'pass') verdict = 'warn'; reasons.push(`title changed: "${home.title}"`); }
    const tv = ttfbVerdict(home.ttfbMs, th); if (tv) { if (tv[0] === 'fail' || verdict === 'pass') verdict = verdict === 'fail' ? 'fail' : tv[0]; reasons.push(tv[1]); }
    // learn baselines on healthy responses
    if (!st.homeBytesBaseline || home.bytes > st.homeBytesBaseline) st.homeBytesBaseline = home.bytes;
    if (!st.learnedTitle && home.title) st.learnedTitle = home.title;
  }
  // publish window: commit header change
  if (home.commit && st.lastCommit && home.commit !== st.lastCommit) { st.lastCommitChangeTs = ts; st.commitHistory = [...(st.commitHistory ?? []).slice(-19), { ts, from: st.lastCommit, to: home.commit }]; }
  if (home.commit) st.lastCommit = home.commit;
  // hosting classification: fleet = Astro commit header seen (ever); external = answered but never a fleet build
  if (home.commit) st.hosting = 'fleet'; else if (!st.hosting && home.status) st.hosting = home.server && /cloudflare/i.test(home.server) ? 'fleet-unconfirmed' : 'external';
  if (home.server) st.server = home.server;
  const inPublishWindow = st.lastCommitChangeTs ? (Date.parse(ts) - Date.parse(st.lastCommitChangeTs)) < th.publishWindowMinutes * 60000 : false;
  emit(base({ type: 'critical', route: '/', ...slim(home), verdict, reason: reasons.join('; ') || null, inPublishWindow, ...applyStreak(st, '/', verdict, th, inPublishWindow) }));

  dbg(site.id, '2. robots.tx');
  // ---- 2. robots.txt
  await jitter();
  const robots = await probe(`${origin}/robots.txt`);
  verdict = 'pass'; let reason = null;
  if (robots.error || robots.status !== 200) { verdict = 'fail'; reason = robots.error || `status ${robots.status}`; }
  else if (robotsBlocksAll(robots.bodyText ?? '')) { verdict = 'fail'; reason = 'robots blocks all crawlers (User-agent: * / Disallow: /)'; }
  emit(base({ type: 'critical', route: '/robots.txt', ...slim(robots), verdict, reason, ...applyStreak(st, '/robots.txt', verdict, th, inPublishWindow) }));

  dbg(site.id, '3. sitemap');
  // ---- 3. sitemap (the one discovery found, else conventional)
  const smUrl = corpus?.sitemaps?.[0] ?? `${origin}/sitemap-index.xml`;
  await jitter();
  const sm = await probe(smUrl, { maxBytes: 512 * 1024 });
  verdict = (sm.status === 200 && !sm.error) ? 'pass' : 'fail';
  reason = verdict === 'fail' ? (sm.error || `status ${sm.status}`) : (/<(sitemapindex|urlset)/i.test(sm.bodyText ?? '') ? null : 'not sitemap xml');
  if (reason && verdict === 'pass') verdict = 'fail';
  emit(base({ type: 'critical', route: 'sitemap', ...slim(sm), verdict, reason, ...applyStreak(st, 'sitemap', verdict, th, inPublishWindow) }));

  dbg(site.id, '4. guarantee');
  // ---- 4. guaranteed 404
  await jitter();
  const miss = await probe(`${origin}/__fleet_missing_8c1e954e/`);
  verdict = miss.status === 404 ? 'pass' : (miss.error ? 'fail' : 'fail');
  reason = miss.status === 404 ? null : (miss.error || `soft-404: status ${miss.status}`);
  emit(base({ type: 'critical', route: '/__missing__', ...slim(miss), verdict, reason, ...applyStreak(st, '/__missing__', verdict, th, inPublishWindow) }));

  dbg(site.id, '5. /api/heal');
  // ---- 5. /api/health/ (optional per site)
  await jitter();
  const health = await probe(`${origin}/api/health/`, { maxBytes: 64 * 1024 });
  if (health.status === 200) { verdict = 'pass'; reason = null; }
  else if (health.status === 404 || health.status === 405) { verdict = 'info'; reason = 'health route absent'; }
  else { verdict = 'fail'; reason = health.error || `status ${health.status}`; }
  emit(base({ type: 'critical', route: '/api/health/', ...slim(health), verdict, reason, ...applyStreak(st, '/api/health/', verdict, th, inPublishWindow) }));

  dbg(site.id, '6. canonical');
  // ---- 6. canonical redirect pair (other host must 3xx → canonical) — skipped for explicit test origins
  if (!site.origin) {
  await jitter();
  const other = await probe(`https://${otherHost}/`, { maxBytes: 64 * 1024 });
  if (other.error) { verdict = other.error === 'ENOTFOUND' ? 'warn' : 'fail'; reason = `${otherHost}: ${other.error}`; }
  else if (other.status >= 300 && other.status < 400) {
    let target = null; try { target = new URL(other.location, `https://${otherHost}`).hostname; } catch {}
    if (target === canonicalHost) { verdict = 'pass'; reason = null; } else { verdict = 'fail'; reason = `${otherHost} → ${other.location} (expected ${canonicalHost})`; }
  } else if (other.status === 200) { verdict = 'warn'; reason = `${otherHost} serves 200 directly (duplicate host, no canonical redirect)`; }
  else { verdict = 'fail'; reason = `${otherHost} status ${other.status}`; }
  emit(base({ type: 'redirect', route: `https://${otherHost}/`, ...slim(other), verdict, reason, ...applyStreak(st, 'redirect', verdict, th, inPublishWindow) }));
  }

  dbg(site.id, '7. conversio');
  // ---- 7. conversion pages
  for (const cu of conversionPages(corpus, origin)) {
    await jitter();
    const c = await probe(cu);
    verdict = 'pass'; const rs = [];
    if (c.error || c.status !== 200) { verdict = 'fail'; rs.push(c.error || `status ${c.status}`); }
    else {
      if (!/<form[\s>]/i.test(c.bodyText ?? '')) { verdict = 'warn'; rs.push('no <form> in html'); }
      const tv = ttfbVerdict(c.ttfbMs, th); if (tv) { if (tv[0] === 'fail') verdict = 'fail'; else if (verdict === 'pass') verdict = 'warn'; rs.push(tv[1]); }
    }
    const route = new URL(cu).pathname;
    emit(base({ type: 'conversion', route, ...slim(c), verdict, reason: rs.join('; ') || null, ...applyStreak(st, route, verdict, th, inPublishWindow) }));
  }

  dbg(site.id, '8. TLS certi');
  // ---- 8. TLS certificate (daily)
  if (DO_CERT && origin.startsWith('https://')) {
    const ci = await certInfo(canonicalHost);
    if (ci.error && ci.daysRemaining == null) { verdict = 'fail'; reason = ci.error; }
    else if (ci.authorized === false) { verdict = 'fail'; reason = `cert not trusted: ${ci.error}`; }
    else if (ci.daysRemaining < th.certFailDays) { verdict = 'fail'; reason = `cert expires in ${ci.daysRemaining}d`; }
    else if (ci.daysRemaining < th.certWarnDays) { verdict = 'warn'; reason = `cert expires in ${ci.daysRemaining}d`; }
    else { verdict = 'pass'; reason = null; }
    emit(base({ type: 'cert', route: canonicalHost, url: `tls://${canonicalHost}:443`, status: ci.authorized ? 200 : 0, ok: verdict !== 'fail', ...ci, verdict, reason, ...applyStreak(st, 'cert', verdict, th, false) }));
  }

  dbg(site.id, '9. Origin pr');
  // ---- 9. Origin probe (host placement only)
  if (DO_ORIGIN && site.port) {
    const o = await probe(`http://${CONFIG.origin.host}:${site.port}/`, { host: canonicalHost, timeoutMs: 8000 });
    verdict = (o.status === 200 && !o.error) ? 'pass' : 'fail';
    reason = verdict === 'pass' ? null : (o.error || `status ${o.status}`);
    emit(base({ type: 'origin', route: `:${site.port}/`, ...slim(o), verdict, reason, ...applyStreak(st, 'origin', verdict, th, inPublishWindow) }));
  }

  st.lastCritical = ts;
  return records;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureEvidenceDirs();
  const sites = resolveSites(selector);
  const state = loadState();
  const startedAt = Date.now();
  log(`critical: ${sites.length} site(s)${DO_CERT ? ' +cert' : ''}${DO_ORIGIN ? ' +origin' : ''}`);
  const results = await pool(sites.map((s) => () => checkSite(s, state).then((recs) => {
    const fails = recs.filter((r) => r.verdict === 'fail'); const warns = recs.filter((r) => r.verdict === 'warn');
    const home = recs.find((r) => r.route === '/');
    log(`${s.id.padEnd(24)} ${String(home?.status ?? 'ERR').padStart(3)} ${String(home?.ttfbMs ?? '-').padStart(5)}ms  ${fails.length ? 'FAIL ' + fails.map((f) => `${f.route}:${f.reason}`).join(' | ') : warns.length ? 'warn ' + warns.map((w) => `${w.route}:${w.reason}`).join(' | ') : 'ok'}`);
    return recs;
  })), CONFIG.politeness.fleetConcurrency);
  saveState(state);
  const all = results.flat().filter(Boolean);
  const summary = { sites: sites.length, checks: all.length, fail: all.filter((r) => r.verdict === 'fail').length, warn: all.filter((r) => r.verdict === 'warn').length, wouldAlert: all.filter((r) => r.wouldAlert).length, durationMs: Date.now() - startedAt };
  writeHeartbeat('critical', summary);
  log(`critical done: ${JSON.stringify(summary)}`);
}
