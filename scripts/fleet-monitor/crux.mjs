#!/usr/bin/env node
/**
 * crux — daily field Core Web Vitals per origin from the Chrome UX Report API (free).
 *
 *   CRUX_API_KEY=... node scripts/fleet-monitor/crux.mjs [all|id1,id2]
 *
 * Without CRUX_API_KEY the script logs a skip and exits 0 (Phase 1 optional).
 * Key: Google Cloud console → enable "Chrome UX Report API" → create API key (read-only, no billing).
 * Records p75 LCP / INP / CLS for PHONE and DESKTOP; targets per AARON-RULES: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVIDENCE_DIR, ensureEvidenceDirs, resolveSites, pool, log, nowIso, todayUtc, appendCheck, loadState, siteState, writeHeartbeat, USER_AGENT } from './lib.mjs';

const KEY = process.env.CRUX_API_KEY;
const TARGETS = { lcp: 2500, inp: 200, cls: 0.1 };

async function query(origin, formFactor) {
  const res = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ origin, formFactor }),
  });
  if (res.status === 404) return { origin, formFactor, available: false };
  if (!res.ok) return { origin, formFactor, available: false, error: `${res.status}` };
  const j = await res.json();
  const m = j.record?.metrics ?? {};
  const p = (k) => m[k]?.percentiles?.p75 ?? null;
  const out = { origin, formFactor, available: true, lcp: p('largest_contentful_paint'), inp: p('interaction_to_next_paint'), cls: p('cumulative_layout_shift') != null ? Number(p('cumulative_layout_shift')) : null, period: j.record?.collectionPeriod ?? null };
  out.pass = { lcp: out.lcp != null ? out.lcp <= TARGETS.lcp : null, inp: out.inp != null ? out.inp <= TARGETS.inp : null, cls: out.cls != null ? out.cls <= TARGETS.cls : null };
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureEvidenceDirs();
  if (!KEY) { log('crux: CRUX_API_KEY not set — skipping (optional in Phase 1)'); writeHeartbeat('crux', { skipped: true }); process.exit(0); }
  const sites = resolveSites(process.argv[2]);
  const state = loadState();
  const results = await pool(sites.map((s) => async () => {
    const origin = siteState(state, s.id).canonicalOrigin ?? `https://${s.domain}`;
    const [phone, desktop] = await Promise.all([query(origin, 'PHONE'), query(origin, 'DESKTOP')]);
    const rec = { ts: nowIso(), site: s.id, domain: s.domain, type: 'crux', url: origin, status: 200, ok: true, phone, desktop, verdict: phone.available && (phone.pass.lcp === false || phone.pass.inp === false || phone.pass.cls === false) ? 'warn' : 'info', reason: phone.available ? `phone LCP ${phone.lcp}ms INP ${phone.inp}ms CLS ${phone.cls}` : 'no CrUX data (low traffic)' };
    appendCheck(rec);
    log(`${s.id.padEnd(24)} ${rec.reason}`);
    return rec;
  }), 4);
  writeFileSync(join(EVIDENCE_DIR, 'crux', `crux-${todayUtc()}.json`), `${JSON.stringify(results.filter(Boolean), null, 1)}\n`);
  writeHeartbeat('crux', { sites: sites.length });
  log('crux done');
}
