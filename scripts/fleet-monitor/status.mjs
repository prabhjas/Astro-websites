#!/usr/bin/env node
/**
 * status — "what is the monitor doing right now?"
 *
 *   node scripts/fleet-monitor/status.mjs            # one-shot terminal status
 *   node scripts/fleet-monitor/status.mjs --watch    # refresh every 30s (Ctrl-C to stop)
 *   node scripts/fleet-monitor/status.mjs --html     # also write local/monitor-evidence/dashboard.html (auto-refreshes)
 *
 * Reads only the evidence dir (heartbeat.jsonl, checks/*.jsonl, state.json) + process list.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, EVIDENCE_DIR, resolveSites, readChecks, readHeartbeats, loadState, percentile, pct } from './lib.mjs';

const WATCH = process.argv.includes('--watch');
const HTML = process.argv.includes('--html');

function processes() {
  try { return execSync("ps -axo pid,etime,command | grep 'fleet-monitor/' | grep -v grep | grep -v status.mjs", { encoding: 'utf8' }).trim().split('\n').filter(Boolean); } catch { return []; }
}
function ago(ts) { if (!ts) return '—'; const s = Math.round((Date.now() - Date.parse(ts)) / 1000); return s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)}m ago` : `${(s / 3600).toFixed(1)}h ago`; }
function dirSize(d) { if (!existsSync(d)) return 0; return readdirSync(d).reduce((a, f) => a + statSync(join(d, f)).size, 0); }
function human(b) { return b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} kB`; }

function snapshot() {
  const sites = resolveSites('all');
  const state = loadState();
  const beats = readHeartbeats(Date.now() - 7 * 86400000);
  const last = (kind) => beats.filter((b) => b.kind === kind).at(-1);
  const today = readChecks(Date.now() - 86400000);
  const cyclesToday = beats.filter((b) => b.kind === 'critical' && Date.parse(b.ts) > Date.now() - 86400000);
  const procs = processes();
  const daemon = procs.find((p) => p.includes('run.mjs daemon'));
  const lc = last('critical');
  const homeToday = today.filter((c) => c.type === 'critical' && c.route === '/');
  const latestHome = new Map(); for (const c of homeToday) latestHome.set(c.site, c);
  const latestAny = new Map();
  for (const c of today.filter((c) => ['critical', 'conversion', 'redirect', 'cert', 'origin'].includes(c.type))) latestAny.set(`${c.site}|${c.route}`, c);
  const open = [...latestAny.values()].filter((c) => c.verdict === 'fail' || c.verdict === 'warn');
  const stale = lc ? (Date.now() - Date.parse(lc.ts)) > 2 * CONFIG.cadence.criticalMinutes * 60000 : true;
  return { sites, state, beats, last, today, cyclesToday, procs, daemon, lc, latestHome, open, stale, homeToday };
}

function render(s) {
  const L = [];
  const g = (ok) => (ok ? '🟢' : '🔴');
  L.push(`astro-fleet-monitor status — ${new Date().toISOString()}`);
  L.push('');
  L.push(`${g(!!s.daemon)} Daemon        ${s.daemon ? s.daemon.trim().replace(/\s+/g, ' ').slice(0, 90) : 'NOT RUNNING (start: node scripts/fleet-monitor/run.mjs daemon)'}`);
  L.push(`${g(!s.stale)} Last critical  ${s.lc ? `${ago(s.lc.ts)} · ${s.lc.sites} sites · ${s.lc.checks} checks · fail=${s.lc.fail} warn=${s.lc.warn} wouldAlert=${s.lc.wouldAlert} · ${Math.round(s.lc.durationMs / 1000)}s` : 'never'}${s.stale ? '   ⚠ STALE (> 2× interval) — heartbeat would alert' : ''}`);
  L.push(`   Cycles 24h    ${s.cyclesToday.length} of ~${Math.floor(1440 / CONFIG.cadence.criticalMinutes)} expected (${pct(s.cyclesToday.length, Math.floor(1440 / CONFIG.cadence.criticalMinutes)) ?? 0}%)`);
  const ls = s.last('sitemap'); const ld = s.last('crux'); const lds = s.last('daemon-start');
  L.push(`   Last sitemap  ${ls ? `${ago(ls.ts)} · ${ls.urls} urls · 5xx=${ls.s5xx} 4xx=${ls.s4xx} err=${ls.err} left200=${ls.left200} · ${Math.round(ls.durationMs / 60000)} min` : 'not yet'}`);
  L.push(`   Last CrUX     ${ld ? (ld.skipped ? `${ago(ld.ts)} · skipped (no CRUX_API_KEY)` : `${ago(ld.ts)} · ${ld.sites} sites`) : 'not yet'}`);
  L.push(`   Daemon start  ${lds ? `${ago(lds.ts)} (pid ${lds.pid})` : '—'}`);
  const running = s.procs.filter((p) => !p.includes('run.mjs daemon'));
  if (running.length) L.push(`   In flight     ${running.map((p) => p.trim().split(/\s+/).slice(2).join(' ').replace(/.*fleet-monitor\//, '')).join(' | ')}`);
  L.push('');
  const okSites = [...s.latestHome.values()].filter((c) => c.verdict === 'pass').length;
  const tt = s.homeToday.map((c) => c.ttfbMs).filter((x) => x != null);
  L.push(`Fleet now       ${okSites}/${s.latestHome.size} sites green on last home check · TTFB p50 ${percentile(tt, 50) ?? '—'}ms p95 ${percentile(tt, 95) ?? '—'}ms (24h) · ${s.today.length.toLocaleString()} checks in 24h`);
  L.push('');
  if (!s.open.length) L.push('Open issues     none 🎉');
  else {
    L.push(`Open issues     ${s.open.length} (latest state, non-pass)`);
    for (const c of s.open.sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === 'fail' ? -1 : 1)).slice(0, 25)) {
      L.push(`  ${c.verdict === 'fail' ? '❌' : '⚠️ '} ${c.site.padEnd(22)} ${String(c.route).slice(0, 34).padEnd(34)} ${String(c.error || c.status).padEnd(18)} ${(c.reason || '').slice(0, 60)}${c.wouldAlert ? '  ← would alert' : ''}`);
    }
    if (s.open.length > 25) L.push(`  … ${s.open.length - 25} more`);
  }
  L.push('');
  const st = s.state.sites ?? {};
  const external = Object.entries(st).filter(([, v]) => v.hosting === 'external').map(([k]) => k);
  const releases = Object.entries(st).flatMap(([k, v]) => (v.commitHistory ?? []).map((e) => ({ site: k, ...e }))).filter((e) => Date.parse(e.ts) > Date.now() - 86400000);
  L.push(`Releases 24h    ${releases.length ? releases.map((r) => `${r.site}@${r.ts.slice(11, 16)}`).join(', ') : 'none observed'}`);
  L.push(`External hosts  ${external.length ? external.join(', ') : 'none'}`);
  L.push(`Evidence        checks ${human(dirSize(join(EVIDENCE_DIR, 'checks')))} · urls ${human(dirSize(join(EVIDENCE_DIR, 'urls')))} · reports ${existsSync(join(EVIDENCE_DIR, 'reports')) ? readdirSync(join(EVIDENCE_DIR, 'reports')).filter((f) => f.endsWith('.md')).length : 0} · ${EVIDENCE_DIR}`);
  L.push(`Logs            tail -f ${join(EVIDENCE_DIR, 'daemon-logs', 'stdout.log')}`);
  return L.join('\n');
}

function html(s, text) {
  const rows = s.sites.map((site) => { const c = s.latestHome.get(site.id); const st = s.state.sites?.[site.id] ?? {}; const cls = !c ? 'na' : c.verdict === 'pass' ? 'ok' : c.verdict === 'warn' ? 'warn' : 'fail'; return `<div class="tile ${cls}" title="${c ? `${c.status || c.error} · ${c.ttfbMs ?? '-'}ms · ${c.reason || 'ok'}` : 'no data'}"><b>${site.id}</b><span>${c ? (c.error || c.status) : '—'} · ${c?.ttfbMs ?? '—'}ms</span>${st.hosting === 'external' ? '<em>external</em>' : ''}</div>`; }).join('');
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="60"><title>astro-fleet-monitor</title>
<style>body{font:14px/1.4 -apple-system,system-ui,sans-serif;margin:24px;background:#0f1419;color:#e6e6e6}pre{background:#161b22;padding:16px;border-radius:8px;overflow:auto;font-size:12.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:16px 0}.tile{padding:8px 10px;border-radius:6px;background:#1c2530;border-left:5px solid #444}.tile b{display:block}.tile span{font-size:12px;opacity:.8}.tile em{font-size:11px;opacity:.7}
.ok{border-color:#2ea043}.warn{border-color:#d29922}.fail{border-color:#f85149;background:#2a1a1a}.na{border-color:#555}h1{font-size:18px}small{opacity:.6}</style>
<h1>astro-fleet-monitor <small>auto-refresh 60s · ${new Date().toISOString()}</small></h1><div class="grid">${rows}</div><pre>${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre>`;
}

async function main() {
  do {
    const s = snapshot(); const text = render(s);
    if (WATCH) process.stdout.write('\x1Bc');
    console.log(text);
    if (HTML) { const f = join(EVIDENCE_DIR, 'dashboard.html'); writeFileSync(f, html(s, text)); console.log(`\ndashboard: open ${f}`); }
    if (WATCH) await new Promise((r) => setTimeout(r, 30000));
  } while (WATCH);
}
main();
