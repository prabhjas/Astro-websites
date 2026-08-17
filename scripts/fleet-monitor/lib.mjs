/**
 * Shared helpers for the fleet monitor (Phase 1 — read-only baseline).
 *
 * Design rules (see docs/FLEET-MONITORING-ARCHITECTURE-PROPOSAL.md § 5):
 *   - Registry-driven: scripts/fleet-sites.json is the only site list
 *   - Identified traffic: fixed User-Agent on every request
 *   - Polite: global + per-site concurrency caps, jitter, timeouts
 *   - Evidence: append-only JSONL under local/monitor-evidence/ (git-ignored)
 *   - No secrets, no writes outside the evidence dir, GET/HEAD only
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import tls from 'node:tls';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MONITOR_DIR = dirname(fileURLToPath(import.meta.url));
export const USER_AGENT = 'astro-fleet-monitor/1.0 (+internal; Connect Group fleet health)';

export const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'scripts/fleet-sites.json'), 'utf8'));
export const CONFIG = JSON.parse(readFileSync(join(MONITOR_DIR, 'monitor.config.json'), 'utf8'));
export const THRESHOLDS = JSON.parse(readFileSync(join(MONITOR_DIR, 'thresholds.json'), 'utf8'));

export const EVIDENCE_DIR = process.env.FLEET_MONITOR_EVIDENCE_DIR
  ? process.env.FLEET_MONITOR_EVIDENCE_DIR
  : join(ROOT, CONFIG.evidenceDir);

export function ensureEvidenceDirs() {
  for (const sub of ['', 'checks', 'urls', 'reports', 'crux']) mkdirSync(join(EVIDENCE_DIR, sub), { recursive: true });
}

export function nowIso() { return new Date().toISOString(); }
export function todayUtc(d = new Date()) { return d.toISOString().slice(0, 10); }

// ---------------------------------------------------------------- thresholds

export function siteThresholds(siteId) {
  return { ...THRESHOLDS.defaults, ...(THRESHOLDS.sites?.[siteId] ?? {}) };
}

// ---------------------------------------------------------------- registry / enrollment

/**
 * Resolve the sites to monitor.
 *   selector: undefined | 'all' | 'id1,id2' | 'domain'
 * Enrollment: config.include (allow-list) > config.exclude > all registry sites.
 * Placeholder sites (no domain / status placeholder) are never enrolled.
 */
export function resolveSites(selector) {
  let sites = REGISTRY.sites.filter((s) => s.domain && s.status !== 'placeholder');
  if (Array.isArray(CONFIG.include) && CONFIG.include.length) sites = sites.filter((s) => CONFIG.include.includes(s.id));
  if (Array.isArray(CONFIG.exclude) && CONFIG.exclude.length) sites = sites.filter((s) => !CONFIG.exclude.includes(s.id));
  if (!selector || selector === 'all') return sites;
  const wanted = selector.split(',').map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const w of wanted) {
    const s = REGISTRY.sites.find((c) => c.id === w || c.domain === w || c.dir === w);
    if (!s) throw new Error(`Unknown site: ${w}`);
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------- state (learned facts)

const STATE_FILE = () => join(EVIDENCE_DIR, 'state.json');

export function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE(), 'utf8')); } catch { return { format: 'astro-fleet-monitor-state-v1', sites: {} }; }
}
export function saveState(state) {
  ensureEvidenceDirs();
  writeFileSync(STATE_FILE(), `${JSON.stringify(state, null, 2)}\n`);
}
export function siteState(state, siteId) {
  state.sites[siteId] ??= {};
  return state.sites[siteId];
}

// ---------------------------------------------------------------- evidence (JSONL)

export function appendCheck(record) {
  ensureEvidenceDirs();
  const file = join(EVIDENCE_DIR, 'checks', `checks-${todayUtc()}.jsonl`);
  appendFileSync(file, `${JSON.stringify(record)}\n`);
}

/** Read all check records whose timestamp >= sinceMs (default all). */
export function readChecks(sinceMs = 0) {
  const dir = join(EVIDENCE_DIR, 'checks');
  if (!existsSync(dir)) return [];
  const sinceDay = todayUtc(new Date(sinceMs));
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.jsonl')) continue;
    const day = name.slice('checks-'.length, -'.jsonl'.length);
    if (day < sinceDay) continue;
    for (const line of readFileSync(join(dir, name), 'utf8').split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (Date.parse(r.ts) >= sinceMs) out.push(r); } catch { /* skip corrupt line */ }
    }
  }
  return out;
}

export function writeHeartbeat(kind, extra = {}) {
  ensureEvidenceDirs();
  const file = join(EVIDENCE_DIR, 'heartbeat.jsonl');
  appendFileSync(file, `${JSON.stringify({ ts: nowIso(), kind, ...extra })}\n`);
}
export function readHeartbeats(sinceMs = 0) {
  const file = join(EVIDENCE_DIR, 'heartbeat.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((h) => Date.parse(h.ts) >= sinceMs);
}

// ---------------------------------------------------------------- concurrency / politeness

export function jitter() {
  const [lo, hi] = CONFIG.politeness.jitterMs;
  return sleep(lo + Math.random() * (hi - lo));
}

/** Simple promise pool: run tasks (thunks) with at most `limit` in flight. */
export async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try { results[i] = await tasks[i](); } catch (e) { results[i] = { error: String(e?.message ?? e) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ---------------------------------------------------------------- HTTP probe

/**
 * Timed GET. Never follows redirects (we record them). Reads body up to maxBytes.
 * Returns a flat record suitable for JSONL.
 */
export async function probe(url, { timeoutMs = CONFIG.politeness.timeoutMs, maxBytes = 2 * 1024 * 1024, host } = {}) {
  const started = performance.now();
  const rec = { url, status: 0, ok: false, ttfbMs: null, totalMs: null, bytes: 0, location: null, contentType: null, cfCache: null, commit: null, error: null, title: null };
  const headers = { 'user-agent': USER_AGENT, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' };
  if (host) headers.host = host; // origin probes: loopback with Host header
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers });
    rec.ttfbMs = Math.round(performance.now() - started);
    rec.status = res.status;
    rec.location = res.headers.get('location');
    rec.contentType = res.headers.get('content-type');
    rec.cfCache = res.headers.get('cf-cache-status');
    rec.commit = res.headers.get('x-astro-fleet-commit');
    rec.server = res.headers.get('server');
    // Read body (bounded)
    const reader = res.body?.getReader();
    const chunks = []; let total = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total <= maxBytes) chunks.push(value);
        if (total > maxBytes) { try { await reader.cancel(); } catch {} break; }
      }
    }
    rec.bytes = total;
    rec.totalMs = Math.round(performance.now() - started);
    if (rec.contentType?.includes('text/html')) {
      const text = Buffer.concat(chunks).toString('utf8');
      const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (m) rec.title = m[1].replace(/\s+/g, ' ').trim().slice(0, 200);
      rec.bodyText = text;
    } else {
      rec.bodyText = Buffer.concat(chunks).toString('utf8');
    }
    rec.ok = res.status >= 200 && res.status < 400;
  } catch (e) {
    rec.totalMs = Math.round(performance.now() - started);
    rec.error = e?.cause?.code || e?.name || String(e);
  }
  return rec;
}

/** Strip the (potentially large) body before persisting. */
export function slim(rec) {
  const { bodyText, ...rest } = rec;
  return rest;
}

// ---------------------------------------------------------------- TLS certificate

export function certInfo(hostname, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const out = { host: hostname, validTo: null, daysRemaining: null, authorized: null, issuer: null, error: null };
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(out); } };
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate();
      out.authorized = socket.authorized;
      if (!socket.authorized) out.error = socket.authorizationError ? String(socket.authorizationError) : 'not-authorized';
      if (cert?.valid_to) {
        out.validTo = new Date(cert.valid_to).toISOString();
        out.daysRemaining = Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86400000);
        out.issuer = cert.issuer?.O ?? cert.issuer?.CN ?? null;
      }
      socket.end(); finish();
    });
    socket.on('timeout', () => { out.error = 'timeout'; socket.destroy(); finish(); });
    socket.on('error', (e) => { out.error = e.code || e.message; finish(); });
  });
}

// ---------------------------------------------------------------- misc

export function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : null; }
export function percentile(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
export function log(...a) { console.log(`[${nowIso()}]`, ...a); }
