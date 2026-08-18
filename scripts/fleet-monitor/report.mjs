#!/usr/bin/env node
/**
 * report — turn JSONL evidence into a Markdown fleet health report.
 *
 *   node scripts/fleet-monitor/report.mjs [--days 1|7] [--out path.md]
 *
 * Default window: 1 day (daily digest). --days 7 = the weekly baseline report for the CEO/owner.
 * Output: local/monitor-evidence/reports/report-<YYYY-MM-DD>-<Nd>.md (and prints the path).
 * Convert to PDF: python3 scripts/fleet-monitor/report-pdf.py <md> <pdf>
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, EVIDENCE_DIR, ensureEvidenceDirs, resolveSites, readChecks, readHeartbeats, loadState, todayUtc, nowIso, pct, percentile, siteThresholds, log } from './lib.mjs';

const args = process.argv.slice(2);
const days = Number(args[args.indexOf('--days') + 1] || 1) || 1;
const outArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const sinceMs = Date.now() - days * 86400000;

ensureEvidenceDirs();
const sites = resolveSites('all');
const checks = readChecks(sinceMs);
const beats = readHeartbeats(sinceMs);
const state = loadState();
const by = (type) => checks.filter((c) => c.type === type);
const bySite = (arr, id) => arr.filter((c) => c.site === id);
const fmt = (n, suffix = '') => (n == null ? '—' : `${n}${suffix}`);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const L = [];
const H = (s) => L.push(`\n${s}\n`);
const row = (...c) => L.push(`| ${c.map(esc).join(' | ')} |`);
const table = (head, rows) => { row(...head); L.push(`|${head.map(() => '---').join('|')}|`); rows.forEach((r) => row(...r)); };

// ---------------------------------------------------------------- 0. Header + monitor uptime
const critical = by('critical'); const conv = by('conversion'); const redir = by('redirect'); const certs = by('cert'); const sm = by('sitemap'); const smSum = by('sitemap-summary'); const disc = by('discover'); const crux = by('crux'); const origin = by('origin');
const cycles = beats.filter((b) => b.kind === 'critical').sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
const expectedGapMs = CONFIG.cadence.criticalMinutes * 60000;
let gaps = [];
for (let i = 1; i < cycles.length; i++) { const g = Date.parse(cycles[i].ts) - Date.parse(cycles[i - 1].ts); if (g > 2 * expectedGapMs) gaps.push({ from: cycles[i - 1].ts, to: cycles[i].ts, minutes: Math.round(g / 60000) }); }
const windowMs = Math.min(days * 86400000, cycles.length ? Date.now() - Date.parse(cycles[0].ts) : 0);
const expectedCycles = windowMs ? Math.floor(windowMs / expectedGapMs) : 0;
const monitorUptime = expectedCycles ? Math.min(100, Math.round((cycles.length / expectedCycles) * 1000) / 10) : null;

L.push(`# Fleet health report — ${days === 1 ? 'daily' : `${days}-day`} window`);
L.push('');
L.push(`**Generated:** ${nowIso()}  `);
L.push(`**Window:** last ${days} day(s) (since ${new Date(sinceMs).toISOString()})  `);
L.push(`**Sites enrolled:** ${sites.length} · **Checks recorded:** ${checks.length.toLocaleString()} · **Critical cycles:** ${cycles.length}${expectedCycles ? ` of ~${expectedCycles} expected` : ''}  `);
L.push(`**Monitor uptime (heartbeat):** ${monitorUptime == null ? 'n/a' : `${monitorUptime}%`}${gaps.length ? ` · **${gaps.length} gap(s) > ${2 * CONFIG.cadence.criticalMinutes} min**` : ' · no gaps'}  `);
L.push(`**Mode:** Phase 1 baseline — evidence only, no alerts sent. "Would alert" = the rule would have fired under proposed thresholds.`);

// ---------------------------------------------------------------- 1. Executive summary
const homeChecks = critical.filter((c) => c.route === '/');
const homeOk = homeChecks.filter((c) => c.status === 200).length;
const fails = checks.filter((c) => c.verdict === 'fail');
const would = checks.filter((c) => c.wouldAlert);
const s5xx = checks.filter((c) => c.status >= 500).length;
const errs = checks.filter((c) => c.error && !c.status).length;
H('## 1. Executive summary');
table(['Signal', 'Value'], [
  ['Homepage availability (fleet, all cycles)', `${fmt(pct(homeOk, homeChecks.length), '%')} (${homeOk}/${homeChecks.length} checks 200)`],
  ['Homepage TTFB p50 / p95 (fleet)', `${fmt(percentile(homeChecks.map((c) => c.ttfbMs).filter((x) => x != null), 50), 'ms')} / ${fmt(percentile(homeChecks.map((c) => c.ttfbMs).filter((x) => x != null), 95), 'ms')}`],
  ['5xx responses (any check)', String(s5xx)],
  ['Connection / TLS / DNS errors', String(errs)],
  ['Failed checks (any type)', `${fails.length} of ${checks.length}`],
  ['Would-alert events (streak rule)', String(would.length)],
  ['Sitemap URLs crawled', String(sm.length.toLocaleString())],
  ['Sitemap URLs that left 200 → 4xx/5xx', String(smSum.reduce((a, r) => a + (r.left200 ?? 0), 0))],
  ['Sites with cert issues', String(new Set(certs.filter((c) => c.verdict !== 'pass').map((c) => c.site)).size)],
  ['Registered domains served off-fleet (external host)', Object.entries(state.sites ?? {}).filter(([, v]) => v.hosting === 'external').map(([k, v]) => `${k} (${v.server ?? '?'})`).join(', ') || 'none'],
]);

// ---------------------------------------------------------------- 2. Fleet table
H('## 2. Fleet overview (per site)');
const fleetRows = sites.map((s) => {
  const hc = bySite(homeChecks, s.id); const ok = hc.filter((c) => c.status === 200).length;
  const tt = hc.map((c) => c.ttfbMs).filter((x) => x != null);
  const sf = bySite(fails, s.id).length; const sw = bySite(checks.filter((c) => c.verdict === 'warn'), s.id).length;
  const cert = bySite(certs, s.id).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))[0];
  const st = state.sites?.[s.id] ?? {};
  const latest = hc.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))[0];
  return [s.id, (st.canonicalOrigin ? new URL(st.canonicalOrigin).hostname : s.domain) + (st.hosting === 'external' ? ` (external: ${st.server ?? 'non-fleet'})` : ''), String(hc.length), fmt(pct(ok, hc.length), '%'), `${fmt(percentile(tt, 50))} / ${fmt(percentile(tt, 95))}`, String(sf), String(sw), cert ? (cert.daysRemaining == null ? `ERR ${cert.error}` : `${cert.daysRemaining}d${cert.verdict !== 'pass' ? ' ⚠' : ''}`) : '—', latest ? (latest.verdict === 'pass' ? '✅' : latest.verdict === 'warn' ? '⚠️ ' + latest.reason : '❌ ' + (latest.reason || latest.error)) : '—'];
});
table(['Site', 'Canonical host (hosting)', 'Home checks', 'Avail', 'TTFB p50/p95 ms', 'Fails', 'Warns', 'Cert', 'Latest home'], fleetRows);

// ---------------------------------------------------------------- 3. Owner attention (current state)
H('## 3. Needs attention now (latest state per site/route, non-pass)');
const latestByKey = new Map();
for (const c of [...critical, ...conv, ...redir, ...certs, ...origin].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))) latestByKey.set(`${c.site}|${c.type}|${c.route}`, c);
const attention = [...latestByKey.values()].filter((c) => c.verdict === 'fail' || c.verdict === 'warn').sort((a, b) => (a.verdict === b.verdict ? a.site.localeCompare(b.site) : a.verdict === 'fail' ? -1 : 1));
if (!attention.length) L.push('_Nothing outstanding — every critical route passed on its latest check._');
else table(['Sev', 'Site', 'Type', 'Route', 'Status', 'Reason', 'Streak', 'Since'], attention.map((c) => [c.verdict === 'fail' ? '❌ fail' : '⚠️ warn', c.site, c.type, c.route, c.error ? c.error : String(c.status), c.reason ?? '', String(c.streak ?? ''), c.ts.slice(0, 16).replace('T', ' ')]));

// ---------------------------------------------------------------- 4. Would-alert incidents
H('## 4. Would-alert incidents (streak rule under proposed thresholds)');
const incidents = [];
const streams = new Map();
for (const c of checks.filter((c) => ['critical', 'conversion', 'redirect', 'origin', 'cert'].includes(c.type)).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))) {
  const k = `${c.site}|${c.route}`; const cur = streams.get(k);
  if (c.verdict === 'fail') { if (cur) { cur.last = c.ts; cur.count++; cur.reasons.add(c.reason || c.error); cur.would ||= !!c.wouldAlert; } else streams.set(k, { site: c.site, route: c.route, first: c.ts, last: c.ts, count: 1, reasons: new Set([c.reason || c.error]), would: !!c.wouldAlert, publish: !!c.inPublishWindow }); }
  else if (cur) { incidents.push(cur); streams.delete(k); }
}
for (const cur of streams.values()) { cur.open = true; incidents.push(cur); }
const wouldInc = incidents.filter((i) => i.would);
if (!wouldInc.length) L.push('_No incident reached the consecutive-fail threshold._');
else table(['Site', 'Route', 'First fail', 'Last fail', 'Fails', 'Open?', 'Publish window?', 'Reasons'], wouldInc.map((i) => [i.site, i.route, i.first.slice(0, 16).replace('T', ' '), i.last.slice(0, 16).replace('T', ' '), String(i.count), i.open ? 'yes' : 'resolved', i.publish ? 'yes' : 'no', [...i.reasons].join('; ')]));
const blips = incidents.filter((i) => !i.would).length;
if (blips) L.push(`\n_${blips} single-cycle blip(s) did **not** reach the streak threshold and would have been suppressed._`);

// ---------------------------------------------------------------- 5. Sitemap corpus
H('## 5. Sitemap corpus (pages + posts)');
const smRows = sites.map((s) => {
  const d = bySite(disc, s.id).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))[0];
  const t = bySite(smSum, s.id).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))[0];
  if (!d && !t) return null;
  return [s.id, fmt(d?.urlCount ?? t?.total), d?.dropPct != null ? `${d.dropPct > 0 ? '−' : '+'}${Math.abs(d.dropPct)}%${d.warn ? ' ⚠' : ''}` : '—', t ? `${t.ok}/${t.s3xx}/${t.s4xx}/${t.s5xx}/${t.err}` : '—', fmt(t?.left200), t ? `${fmt(t.p50TtfbMs)} / ${fmt(t.p95TtfbMs)}` : '—', d?.notes?.length ? d.notes.join('; ') : ''];
}).filter(Boolean);
if (!smRows.length) L.push('_No sitemap crawl in window._');
else table(['Site', 'URLs', 'Δ count', 'ok/3xx/4xx/5xx/err', 'Left 200', 'TTFB p50/p95', 'Notes'], smRows);

const badUrls = sm.filter((c) => c.status >= 500 || c.error || (c.transition && c.previousStatus === 200 && c.status !== 200) || (c.status >= 400 && c.status < 500 && c.verdict !== 'info'));
if (badUrls.length) {
  H('### 5.1 Problem URLs (5xx / errors / left 200 / 4xx) — first 40 per site');
  const grouped = new Map();
  for (const c of badUrls) { if (!grouped.has(c.site)) grouped.set(c.site, []); grouped.get(c.site).push(c); }
  for (const [site, list] of grouped) {
    L.push(`\n**${site}** — ${list.length} problem URL(s)\n`);
    const uniq = new Map(); for (const c of list) uniq.set(c.url, c);
    table(['URL', 'Status', 'Transition', 'Reason'], [...uniq.values()].slice(0, 40).map((c) => [c.url, c.error ? c.error : String(c.status), c.transition ?? '', c.reason ?? '']));
    if (uniq.size > 40) L.push(`\n_…and ${uniq.size - 40} more (see checks JSONL)._`);
  }
}

// ---------------------------------------------------------------- 6. Latency detail + calibration
H('## 6. Latency (homepage TTFB) and threshold calibration');
const latRows = sites.map((s) => {
  const tt = bySite(homeChecks, s.id).map((c) => c.ttfbMs).filter((x) => x != null);
  if (!tt.length) return null;
  const th = siteThresholds(s.id); const p95 = percentile(tt, 95); const p50 = percentile(tt, 50);
  const suggestWarn = Math.max(1000, Math.ceil((p95 * 1.25) / 250) * 250);
  return [s.id, String(tt.length), fmt(p50), fmt(p95), fmt(Math.max(...tt)), `${th.ttfbWarnMs}/${th.ttfbFailMs}`, tt.filter((x) => x > th.ttfbWarnMs).length ? `${pct(tt.filter((x) => x > th.ttfbWarnMs).length, tt.length)}%` : '0%', suggestWarn > th.ttfbWarnMs ? `${suggestWarn}` : 'keep'];
}).filter(Boolean).sort((a, b) => Number(b[3]) - Number(a[3]));
table(['Site', 'Samples', 'p50', 'p95', 'max', 'warn/fail now', '% over warn', 'Suggested warn'], latRows);
L.push('\n_Suggested warn = p95 × 1.25 rounded up to 250 ms (min 1000). Apply per-site in `thresholds.json` after review._');

// ---------------------------------------------------------------- 7. Release events
const releases = [];
for (const [id, st] of Object.entries(state.sites ?? {})) for (const ev of st.commitHistory ?? []) if (Date.parse(ev.ts) >= sinceMs) releases.push([ev.ts.slice(0, 16).replace('T', ' '), id, ev.from, ev.to]);
H('## 7. Release events observed (x-astro-fleet-commit changed)');
if (!releases.length) L.push('_No commit header changes observed in window._');
else table(['When (UTC)', 'Site', 'From', 'To'], releases.sort());

// ---------------------------------------------------------------- 8. CrUX
if (crux.length) {
  H('## 8. Field Core Web Vitals (CrUX p75, phone / desktop)');
  const latest = new Map(); for (const c of crux.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))) latest.set(c.site, c);
  const flag = (v, ok) => (v == null ? '—' : `${v}${ok === false ? ' ❌' : ''}`);
  table(['Site', 'LCP ms (P/D)', 'INP ms (P/D)', 'CLS (P/D)', 'Data'], [...latest.values()].map((c) => [c.site, `${flag(c.phone.lcp, c.phone.pass?.lcp)} / ${flag(c.desktop.lcp, c.desktop.pass?.lcp)}`, `${flag(c.phone.inp, c.phone.pass?.inp)} / ${flag(c.desktop.inp, c.desktop.pass?.inp)}`, `${flag(c.phone.cls, c.phone.pass?.cls)} / ${flag(c.desktop.cls, c.desktop.pass?.cls)}`, c.phone.available ? 'yes' : 'insufficient traffic']));
  L.push('\n_Targets (AARON-RULES): LCP ≤ 2500 ms · INP ≤ 200 ms · CLS ≤ 0.1 (75th percentile)._');
} else { H('## 8. Field Core Web Vitals (CrUX)'); L.push('_Not collected — set `CRUX_API_KEY` to enable (free, read-only)._'); }

// ---------------------------------------------------------------- 9. Monitor self-check
H('## 9. Monitor self-check');
table(['Item', 'Value'], [
  ['Critical cycles recorded', String(cycles.length)],
  ['Expected cycles in window', String(expectedCycles)],
  ['Heartbeat uptime', monitorUptime == null ? 'n/a' : `${monitorUptime}%`],
  ['Gaps > 2× interval', gaps.length ? gaps.map((g) => `${g.from.slice(11, 16)}→${g.to.slice(11, 16)} (${g.minutes} min)`).join(', ') : 'none'],
  ['Avg cycle duration', cycles.length ? `${Math.round(cycles.reduce((a, c) => a + (c.durationMs ?? 0), 0) / cycles.length / 1000)}s` : '—'],
  ['Sitemap crawls', String(beats.filter((b) => b.kind === 'sitemap').length)],
  ['Origin probes', origin.length ? `${origin.length} (host placement)` : 'off (laptop placement — needs host cron for edge-vs-origin verdicts)'],
  ['Evidence dir', EVIDENCE_DIR],
]);
L.push('\n_Read this line first next time: if "Critical cycles recorded" is far below expected, the monitor was down — silence ≠ health._');

const outPath = outArg ?? join(EVIDENCE_DIR, 'reports', `report-${todayUtc()}-${days}d.md`);
writeFileSync(outPath, `${L.join('\n')}\n`);
log(`report written: ${outPath}`);
