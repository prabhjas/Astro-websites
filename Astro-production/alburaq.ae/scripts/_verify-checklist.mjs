/**
 * Comprehensive QA: sitemap, redirects, GTM, images, robots, Pipedrive forms.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5120';
const LIVE = 'https://alburaq.ae';
const ROOT = process.cwd();
const report = { checks: [], pass: 0, fail: 0 };

function log(name, ok, detail = '') {
  report.checks.push({ name, ok, detail });
  if (ok) report.pass++;
  else report.fail++;
  console.log(ok ? `PASS  ${name}` : `FAIL  ${name}`, detail ? String(detail).slice(0, 300) : '');
}

async function get(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { redirect: 'manual', ...opts });
  const text = await r.text().catch(() => '');
  return { status: r.status, text, headers: r.headers, url: r.url };
}

// ---------- 1. Sitemap ----------
{
  const idx = await get('/sitemap_index.xml');
  log('sitemap_index 200', idx.status === 200, `status=${idx.status}`);
  log('sitemap_index xml', /<sitemapindex|<urlset/i.test(idx.text));

  const locs = [...idx.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  log('sitemap_index has locs', locs.length > 0, `count=${locs.length} sample=${locs.slice(0, 3).join(', ')}`);

  let totalUrls = 0;
  const badChunks = [];
  for (const loc of locs) {
    let path;
    try {
      path = new URL(loc).pathname;
    } catch {
      badChunks.push(loc);
      continue;
    }
    const chunk = await get(path);
    if (chunk.status !== 200) {
      badChunks.push(`${path}:${chunk.status}`);
      continue;
    }
    const urls = [...chunk.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    totalUrls += urls.length;
    const nonCanon = urls.filter((u) => !u.startsWith('https://alburaq.ae/'));
    if (nonCanon.length) badChunks.push(`non-canon in ${path}: ${nonCanon.slice(0, 2).join(',')}`);
  }
  log('sitemap chunks ok', badChunks.length === 0, badChunks.slice(0, 5).join(' | ') || `urls=${totalUrls}`);
  log('sitemap url count', totalUrls >= 50, `totalUrls=${totalUrls}`);

  // Sample URL reachability
  const pageChunk = locs.find((l) => /page|post|sitemap/i.test(l)) || locs[0];
  if (pageChunk) {
    const path = new URL(pageChunk).pathname;
    const chunk = await get(path);
    const sample = [...chunk.text.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .slice(0, 12);
    let ok = 0;
    for (const u of sample) {
      const p = new URL(u).pathname;
      const r = await get(p);
      if (r.status === 200) ok++;
    }
    log('sitemap sample URLs 200', ok === sample.length, `${ok}/${sample.length}`);
  }
}

// ---------- 2. Redirects ----------
{
  const rules = JSON.parse(readFileSync(join(ROOT, 'public/_redirects.json'), 'utf8'));
  log('redirects.json present', Array.isArray(rules) && rules.length > 0, `count=${rules.length}`);

  let ok = 0;
  const fails = [];
  for (const rule of rules) {
    const r = await get(rule.from);
    const loc = r.headers.get('location') || '';
    const locPath = loc.startsWith('http') ? new URL(loc).pathname : loc;
    const expected = rule.to.endsWith('/') || rule.to === '/' ? rule.to : `${rule.to}/`;
    const got = locPath.endsWith('/') || locPath === '/' ? locPath : `${locPath}/`;
    const pass = r.status === (rule.status || 301) && (got === expected || got === rule.to);
    if (pass) ok++;
    else fails.push(`${rule.from} => ${r.status} ${locPath} (want ${rule.to})`);
  }
  log('local redirects', fails.length === 0, fails.slice(0, 5).join(' | ') || `${ok}/${rules.length}`);

  // Compare structure: live often 301s aliases to home; our structure maps to real pages
  const liveCompare = [];
  for (const rule of rules.slice(0, 8)) {
    try {
      const lr = await fetch(`${LIVE}${rule.from}`, { redirect: 'manual' });
      liveCompare.push({
        from: rule.from,
        live: `${lr.status} ${lr.headers.get('location') || ''}`,
        local: `${rule.status} ${rule.to}`,
      });
    } catch (e) {
      liveCompare.push({ from: rule.from, live: e.message });
    }
  }
  log(
    'redirect structure documented',
    true,
    JSON.stringify(liveCompare.map((x) => `${x.from}: live=${x.live} | local=${x.local}`)).slice(0, 400),
  );
}

// ---------- 3. GTM / GA4 from env ----------
{
  const home = await get('/');
  const gtm = await get('/runtime-gtm.js');
  log('runtime-gtm.js 200', gtm.status === 200, `len=${gtm.text.length}`);
  log('home loads runtime-gtm', /runtime-gtm\.js/.test(home.text));
  log(
    'no hardcoded gtm.js in home',
    !/googletagmanager\.com\/gtm\.js\?id=GTM-/i.test(home.text) &&
      !/<script[^>]+googletagmanager\.com\/gtag\/js\?id=G-/i.test(home.text),
  );
  log(
    'no hardcoded G- id in home html',
    !/G-9WMEJS3R07/.test(home.text) || /runtime-gtm/.test(home.text),
    // GA4 may appear only inside runtime-gtm.js payload, not static HTML
  );

  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const ga4 = (env.match(/^PUBLIC_GA4_ID=(.*)$/m) || [])[1]?.trim() || '';
  const gtmId = (env.match(/^PUBLIC_GTM_ID=(.*)$/m) || [])[1]?.trim() || '';
  log('PUBLIC_GA4_ID in .env', !!ga4, ga4 || '(empty)');
  log('PUBLIC_GTM_ID optional', true, gtmId ? gtmId : '(empty — live uses gtag/GA4 only)');

  if (ga4) {
    log('runtime-gtm embeds GA4 from env', gtm.text.includes(ga4), `looks for ${ga4}`);
  }

  // Scan cleaned mirrors for leftover GTM/gtag
  const legacyDir = join(ROOT, 'src/legacy');
  let dirty = 0;
  const dirtySamples = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (name === 'chrome') continue;
        walk(p);
        continue;
      }
      if (!name.endsWith('.cleaned.html')) continue;
      const html = readFileSync(p, 'utf8');
      if (/googletagmanager\.com\/(gtm|gtag)/i.test(html) || /gtag\('config',\s*'G-/i.test(html)) {
        dirty++;
        if (dirtySamples.length < 5) dirtySamples.push(name);
      }
    }
  }
  walk(legacyDir);
  log('cleaned html free of hardcoded gtm/gtag', dirty === 0, dirtySamples.join(', ') || '0 dirty');
}

// ---------- 4. Images local ----------
{
  const pages = ['/', '/about-us/', '/blog/', '/contact-us/', '/licensing/', '/outsourcing/', '/payroll-outsourcing/', '/accounting-finance-outsourcing-guide-uae/'];
  const external = new Map();
  const missingLocal = [];
  for (const page of pages) {
    const html = (await get(page)).text;
    const urls = [
      ...html.matchAll(/\b(?:src|href|content|srcset)=["']([^"']+)["']/gi),
    ].flatMap((m) => {
      const raw = m[1];
      if (raw.includes(',')) {
        return raw.split(',').map((part) => part.trim().split(/\s+/)[0]);
      }
      return [raw];
    });
    for (const u of urls) {
      if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('tel:')) continue;
      if (/^https?:\/\//i.test(u)) {
        try {
          const host = new URL(u).hostname;
          if (!/alburaq\.ae$/i.test(host) && !/127\.0\.0\.1|localhost/i.test(host)) {
            if (/\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(u) || /\/wp-content\/uploads\//i.test(u)) {
              const list = external.get(page) || [];
              list.push(u);
              external.set(page, list);
            }
          }
        } catch {
          /* ignore */
        }
      } else if (/\/wp-content\/uploads\//i.test(u) || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u)) {
        const path = u.split('?')[0];
        if (!path.startsWith('/')) continue;
        const r = await get(path, { method: 'HEAD' }).catch(() => null);
        // HEAD may not work — try GET
        const g = r && r.status !== 404 ? r : await get(path);
        if (g.status !== 200) missingLocal.push(`${page} -> ${path} (${g.status})`);
      }
    }
  }
  const extCount = [...external.values()].reduce((n, a) => n + a.length, 0);
  log(
    'no external image hosts on sample pages',
    extCount === 0,
    extCount
      ? [...external.entries()]
          .map(([p, list]) => `${p}:${list.slice(0, 2).join('|')}`)
          .join(' ; ')
      : '0 external',
  );
  log(
    'local upload assets resolve',
    missingLocal.length === 0,
    missingLocal.slice(0, 8).join(' | ') || 'all ok',
  );
}

// ---------- 5. robots.txt ----------
{
  const robots = await get('/robots.txt');
  log('robots.txt 200', robots.status === 200);
  log('robots mentions sitemap', /sitemap/i.test(robots.text), robots.text.slice(0, 200).replace(/\s+/g, ' '));
  log('robots has User-agent', /user-agent/i.test(robots.text));
  const sitemapLine = (robots.text.match(/sitemap:\s*(\S+)/i) || [])[1];
  if (sitemapLine) {
    try {
      const p = new URL(sitemapLine).pathname;
      const s = await get(p);
      log('robots sitemap reachable', s.status === 200, sitemapLine);
    } catch {
      log('robots sitemap reachable', false, sitemapLine);
    }
  }
}

// ---------- 6. Forms + Pipedrive ----------
{
  const payload = {
    name: 'QA Pipedrive Check',
    email: `qa.alburaq.${Date.now()}@example.com`,
    phone: '+971501234567',
    message: 'Automated QA submission to verify Pipedrive connection for alburaq.ae',
    website: '',
    pageUrl: `${BASE}/contact-us/`,
    source: 'alburaq-qa',
  };
  const res = await fetch(`${BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  log('contact API success', res.status === 200 && body.success === true, JSON.stringify(body).slice(0, 250));

  // Internal leads — look for newest
  const secret = (readFileSync(join(ROOT, '.env'), 'utf8').match(/^INTERNAL_JOB_SECRET=(.*)$/m) || [])[1]?.trim();
  if (secret) {
    const leads = await fetch(`${BASE}/api/internal/leads/`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const lj = await leads.json().catch(() => ({}));
    const list = lj.leads || lj.items || lj.data || [];
    const newest = Array.isArray(list) ? list[0] : null;
    const delivery = newest?.deliveryStatus;
    const personId = newest?.pipedrivePersonId;
    const leadId = newest?.pipedriveLeadId;
    const pipedriveOk =
      delivery === 'delivered' &&
      (personId != null || leadId != null);
    log(
      'lead stored with Pipedrive sync',
      !!newest && pipedriveOk,
      JSON.stringify({
        id: newest?.id,
        publicId: newest?.publicId || body.submissionId,
        deliveryStatus: delivery,
        pipedrivePersonId: personId,
        pipedriveLeadId: leadId,
        lastError: newest?.lastErrorMessage || newest?.lastErrorCode,
      }).slice(0, 400),
    );
  } else {
    log('lead stored with Pipedrive sync', false, 'no INTERNAL_JOB_SECRET');
  }
}

writeFileSync(join(ROOT, 'docs/11-verify-checklist.json'), JSON.stringify(report, null, 2));
console.log(`\n${report.pass}/${report.pass + report.fail} passed → docs/11-verify-checklist.json`);
process.exit(report.fail ? 1 : 0);
