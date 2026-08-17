#!/usr/bin/env node
/**
 * discover-urls — build the per-site URL corpus from robots.txt + sitemap recursion.
 *
 *   node scripts/fleet-monitor/discover-urls.mjs [all|id1,id2]
 *
 * Output: local/monitor-evidence/urls/<site>.json
 *   { ts, site, domain, canonicalOrigin, sitemaps:[...], urls:[{loc,lastmod,sitemap}], count, previousCount, dropPct }
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, EVIDENCE_DIR, ensureEvidenceDirs, resolveSites, probe, pool, jitter, log, nowIso, appendCheck, loadState, saveState, siteState, siteThresholds } from './lib.mjs';

function xmlLocs(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
function decode(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

/** Determine canonical origin (follow apex → www redirect once, if any). */
export async function canonicalOrigin(domain) {
  const apex = `https://${domain}`;
  const r = await probe(`${apex}/`);
  if (r.status >= 300 && r.status < 400 && r.location) {
    try { const u = new URL(r.location, apex); if (u.hostname.endsWith(domain)) return { origin: u.origin, redirected: true, first: r }; } catch {}
  }
  return { origin: apex, redirected: false, first: r };
}

export async function discoverSite(site) {
  const started = Date.now();
  const { origin, redirected } = await canonicalOrigin(site.domain);
  const seenSitemaps = new Set();
  const urls = new Map();
  const queue = [];
  const notes = [];

  // 1) robots.txt Sitemap: lines
  const robots = await probe(`${origin}/robots.txt`);
  if (robots.status === 200 && robots.bodyText) {
    for (const line of robots.bodyText.split('\n')) {
      const m = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (!m) continue;
      const raw = m[1].trim();
      if (/^https?:\/\//i.test(raw)) queue.push(raw);
      else { queue.push(new URL(raw, origin).href); notes.push(`robots.txt Sitemap is relative (${raw}) — non-standard, some crawlers ignore it`); }
    }
  } else notes.push(`robots.txt status ${robots.status || robots.error}`);
  // 2) conventional fallbacks
  if (!queue.length) queue.push(`${origin}/sitemap-index.xml`, `${origin}/sitemap.xml`);

  const max = CONFIG.politeness.sitemapMaxUrlsPerSite;
  while (queue.length && urls.size < max) {
    const smUrl = queue.shift();
    if (seenSitemaps.has(smUrl)) continue;
    seenSitemaps.add(smUrl);
    await jitter();
    const r = await probe(smUrl, { maxBytes: 20 * 1024 * 1024 });
    if (r.status !== 200 || !r.bodyText) { notes.push(`sitemap ${smUrl} → ${r.status || r.error}`); continue; }
    const xml = r.bodyText;
    if (/<sitemapindex/i.test(xml)) {
      for (const child of xmlLocs(xml, 'sitemap')) {
        const loc = xmlLocs(child, 'loc')[0];
        if (loc) queue.push(decode(loc));
      }
    } else if (/<urlset/i.test(xml)) {
      for (const entry of xmlLocs(xml, 'url')) {
        const loc = xmlLocs(entry, 'loc')[0];
        if (!loc) continue;
        const lastmod = xmlLocs(entry, 'lastmod')[0] ?? null;
        const l = decode(loc);
        if (!urls.has(l)) urls.set(l, { loc: l, lastmod: lastmod ? decode(lastmod) : null, sitemap: smUrl });
        if (urls.size >= max) { notes.push(`capped at ${max} urls`); break; }
      }
    } else notes.push(`sitemap ${smUrl} not xml (${r.contentType})`);
  }

  const file = join(EVIDENCE_DIR, 'urls', `${site.id}.json`);
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  const previousCount = previous?.count ?? null;
  const count = urls.size;
  const dropPct = previousCount ? Math.round(((previousCount - count) / previousCount) * 1000) / 10 : null;

  const out = { ts: nowIso(), site: site.id, domain: site.domain, canonicalOrigin: origin, wwwCanonical: redirected, sitemaps: [...seenSitemaps], urls: [...urls.values()], count, previousCount, dropPct, notes, durationMs: Date.now() - started };
  writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);

  // Evidence record for URL-count drift
  const th = siteThresholds(site.id);
  appendCheck({ ts: out.ts, site: site.id, domain: site.domain, type: 'discover', url: origin, status: 200, ok: count > 0, urlCount: count, previousCount, dropPct, sitemaps: seenSitemaps.size, warn: dropPct !== null && dropPct > th.sitemapDropWarnPct ? `url-count-drop ${dropPct}%` : null, notes });

  // Learn canonical origin into state
  const state = loadState();
  const st = siteState(state, site.id);
  st.canonicalOrigin = origin; st.wwwCanonical = redirected; st.lastDiscover = out.ts; st.urlCount = count;
  saveState(state);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureEvidenceDirs();
  const sites = resolveSites(process.argv[2]);
  log(`discover: ${sites.length} site(s)`);
  const results = await pool(sites.map((s) => () => discoverSite(s).then((r) => { log(`${s.id.padEnd(24)} ${String(r.count).padStart(5)} urls  ${r.sitemaps.length} sitemap(s)  ${r.wwwCanonical ? 'www' : 'apex'}${r.notes.length ? '  ' + r.notes.join('; ') : ''}`); return r; })), CONFIG.politeness.fleetConcurrency);
  const total = results.reduce((a, r) => a + (r?.count ?? 0), 0);
  log(`discover done: ${total} urls across ${sites.length} sites`);
}
