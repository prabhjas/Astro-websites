/**
 * Go-live checklist verifier for izi.ae (fleet port 5121).
 * Covers: sitemap, redirects, GTM-from-env, local images, robots, forms/Pipedrive.
 */
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.IZI_BASE || 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';
const OUT = join(ROOT, '.tmp-qa', 'go-live');
mkdirSync(OUT, { recursive: true });

const rows = [];
function add(section, name, pass, detail = '') {
  rows.push({ section, name, pass: !!pass, detail: String(detail).slice(0, 300) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${section}] ${name}${detail ? ' — ' + String(detail).slice(0, 180) : ''}`);
}

async function fetchText(url, init = {}) {
  const res = await fetch(url, { redirect: 'manual', ...init });
  const body = await res.text();
  return { status: res.status, body, location: res.headers.get('location') || '', headers: res.headers };
}

function pathsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    try {
      return new URL(m[1]).pathname;
    } catch {
      return m[1];
    }
  });
}

function walkFiles(dir, pred, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(p, pred, acc);
    else if (pred(p, name)) acc.push(p);
  }
  return acc;
}

// ---------- 1) Sitemap ----------
async function checkSitemap() {
  const localIndex = await fetchText(`${BASE}/sitemap_index.xml`);
  add('sitemap', 'local index 200', localIndex.status === 200, `HTTP ${localIndex.status}`);
  add(
    'sitemap',
    'index lists child sitemaps',
    /page-sitemap\.xml/.test(localIndex.body) &&
      /post-sitemap\.xml/.test(localIndex.body) &&
      /car-sitemap\.xml/.test(localIndex.body),
    pathsFromSitemap(localIndex.body).join(', '),
  );
  add('sitemap', 'canonical host in locs', /https:\/\/izi\.ae\//.test(localIndex.body) && !/127\.0\.0\.1/.test(localIndex.body));

  const liveIndex = await fetchText(`${LIVE}/sitemap_index.xml`);
  const childNames = ['page-sitemap.xml', 'post-sitemap.xml', 'car-sitemap.xml'];
  const summary = {};
  for (const name of childNames) {
    const local = await fetchText(`${BASE}/${name}`);
    let livePaths = [];
    try {
      const live = await fetchText(`${LIVE}/${name}`);
      if (live.status === 200) livePaths = pathsFromSitemap(live.body);
    } catch {
      /* car sitemap may 404 on live if Rank Math structure differs */
    }
    const localPaths = local.status === 200 ? pathsFromSitemap(local.body) : [];
    const liveSet = new Set(livePaths);
    const localSet = new Set(localPaths);
    const onlyLive = livePaths.filter((p) => !localSet.has(p));
    const onlyLocal = localPaths.filter((p) => !liveSet.has(p));
    summary[name] = {
      localStatus: local.status,
      local: localPaths.length,
      live: livePaths.length,
      onlyLive: onlyLive.slice(0, 15),
      onlyLocal: onlyLocal.slice(0, 15),
    };
    add(
      'sitemap',
      `${name} OK`,
      local.status === 200 && localPaths.length > 0,
      `local=${localPaths.length} live=${livePaths.length}`,
    );
    // Sample URL reachability (first 8 local paths)
    let bad = 0;
    for (const p of localPaths.slice(0, 8)) {
      const r = await fetchText(`${BASE}${p}`);
      if (r.status !== 200) bad += 1;
    }
    add('sitemap', `${name} sample URLs 200`, bad === 0, `checked=${Math.min(8, localPaths.length)} bad=${bad}`);
    if (onlyLive.length) {
      add('sitemap', `${name} coverage vs live`, onlyLive.length === 0, `missing locally: ${onlyLive.slice(0, 8).join(', ')}`);
    } else if (livePaths.length) {
      add('sitemap', `${name} coverage vs live`, true, 'all live URLs present locally');
    }
  }

  // Local inventory cross-check
  const invPath = join(ROOT, 'src/data/sitemap-inventory.json');
  if (existsSync(invPath)) {
    const inv = JSON.parse(readFileSync(invPath, 'utf8'));
    const pages = (inv.pages || []).length;
    const posts = (inv.posts || []).length;
    const cars = (inv.cars || []).length;
    add('sitemap', 'inventory present', pages + posts + cars > 0, `pages=${pages} posts=${posts} cars=${cars}`);
  }
  writeFileSync(join(OUT, 'sitemap-summary.json'), JSON.stringify(summary, null, 2));
}

// ---------- 2) Redirects ----------
async function checkRedirects() {
  const yml = parseYaml(readFileSync(join(ROOT, 'src/data/redirects.yml'), 'utf8')) || {};
  const rules = Array.isArray(yml.redirects) ? yml.redirects : [];
  add('redirects', 'yaml rules loaded', rules.length > 0, `count=${rules.length}`);

  // Detect bad HR import contamination
  const badImportCandidates = [
    join(ROOT, 'imports/redirects/2026-08-05-redirection-log.unique.json'),
    join(ROOT, 'imports/redirects/2026-08-05-redirection-log.unique.NOT-IZI.json.bak'),
  ];
  const badImport = badImportCandidates.find((p) => existsSync(p));
  if (badImport) {
    const raw = readFileSync(badImport, 'utf8');
    const looksHr = /payroll|hr-software|saudi/i.test(raw);
    const quarantined = /\.bak$/i.test(badImport) || /NOT-IZI/i.test(badImport);
    add(
      'redirects',
      'wrong-site redirect import quarantined',
      !looksHr || quarantined,
      looksHr
        ? quarantined
          ? `quarantined: ${badImport.split(/[/\\]/).pop()} (HR/payroll — do not merge)`
          : 'WARNING: unique.json looks like another site (HR/payroll) — quarantine before merge'
        : 'ok',
    );
  }

  let localOk = 0;
  let liveMatch = 0;
  let liveDiff = [];
  for (const rule of rules) {
    const from = rule.from;
    const expectTo = String(rule.to || '');
    const local = await fetchText(`${BASE}${from}`);
    const localLoc = local.location || '';
    const localPass =
      (local.status === 301 || local.status === 302 || local.status === 308) &&
      (localLoc.endsWith(expectTo) || localLoc.includes(expectTo) || new URL(localLoc, BASE).pathname === expectTo);
    if (localPass) localOk += 1;
    else liveDiff.push({ from, expectTo, localStatus: local.status, localLoc });

    // Compare behaviour on live when possible
    try {
      const live = await fetchText(`${LIVE}${from}`);
      if (live.status >= 300 && live.status < 400) {
        const livePath = new URL(live.location, LIVE).pathname;
        if (livePath === expectTo || livePath === expectTo.replace(/\/$/, '') + '/' || live.location.includes(expectTo)) {
          liveMatch += 1;
        } else {
          liveDiff.push({ from, expectTo, liveStatus: live.status, liveLoc: live.location });
        }
      } else if (live.status === 200 && expectTo) {
        // Live may already serve canonical without redirect
        liveDiff.push({ from, note: 'live-200-no-redirect', expectTo });
      }
    } catch (e) {
      liveDiff.push({ from, liveErr: e.message });
    }
  }
  add('redirects', 'local rules fire', localOk === rules.length, `${localOk}/${rules.length}`);
  add(
    'redirects',
    'live overlap note',
    true,
    `liveExactMatches≈${liveMatch}/${rules.length}; diffs logged`,
  );
  writeFileSync(join(OUT, 'redirect-diff.json'), JSON.stringify({ localOk, liveMatch, liveDiff }, null, 2));

  // public/_redirects regenerated parity
  const pub = readFileSync(join(ROOT, 'public/_redirects'), 'utf8');
  const pubCount = pub.split('\n').filter((l) => /^\//.test(l.trim())).length;
  add('redirects', '_redirects file parity', pubCount === rules.length, `yml=${rules.length} public=${pubCount}`);
}

// ---------- 3) GTM dynamic ----------
async function checkGtm() {
  const home = await fetchText(`${BASE}/`);
  add('gtm', 'runtime loader injected', /data-runtime-gtm="1"|runtime-gtm\.js/.test(home.body));
  add(
    'gtm',
    'no hardcoded GTM container in HTML',
    !/GTM-[A-Z0-9]{4,}/.test(home.body) && !/googletagmanager\.com\/ns\.html\?id=GTM-/.test(home.body),
  );
  add(
    'gtm',
    'no hardcoded gtag id in HTML',
    !/gtag\/js\?id=G-/.test(home.body) && !/gtag\(\s*['"]config['"]\s*,\s*['"]G-/.test(home.body),
  );

  // cleaned mirrors
  const cleaned = walkFiles(join(ROOT, 'src/legacy'), (p) => p.endsWith('.cleaned.html'));
  let hardGtm = 0;
  let hardGa = 0;
  for (const f of cleaned) {
    const t = readFileSync(f, 'utf8');
    if (/GTM-[A-Z0-9]{4,}/.test(t) || /googletagmanager\.com\/gtm\.js\?id=GTM-/.test(t)) hardGtm += 1;
    if (/googletagmanager\.com\/gtag\/js\?id=G-/.test(t)) hardGa += 1;
  }
  add('gtm', 'cleaned.html free of GTM-XXX', hardGtm === 0, `filesWithGtm=${hardGtm}/${cleaned.length}`);
  add('gtm', 'cleaned.html free of gtag ids', hardGa === 0, `filesWithGtag=${hardGa}/${cleaned.length}`);

  const rt = await fetchText(`${BASE}/runtime-gtm.js`);
  add('gtm', 'runtime-gtm.js 200', rt.status === 200);
  const ids = [...rt.body.matchAll(/\b(G-[A-Z0-9]+|GTM-[A-Z0-9]+)\b/g)].map((m) => m[1]);
  const uniq = [...new Set(ids)];
  const envGa4 = (process.env.PUBLIC_GA4_ID || '').trim();
  const envGtm = (process.env.PUBLIC_GTM_ID || '').trim();
  // Load .env manually for verification of expectation
  let fileGa4 = '';
  let fileGtm = '';
  try {
    const envTxt = readFileSync(join(ROOT, '.env'), 'utf8');
    fileGa4 = (envTxt.match(/^PUBLIC_GA4_ID=(.*)$/m)?.[1] || '').trim();
    fileGtm = (envTxt.match(/^PUBLIC_GTM_ID=(.*)$/m)?.[1] || '').trim();
  } catch {
    /* */
  }
  add(
    'gtm',
    'runtime IDs from .env only',
    (fileGa4 ? uniq.includes(fileGa4) : true) &&
      (fileGtm ? uniq.includes(fileGtm) : !uniq.some((id) => id.startsWith('GTM-'))) &&
      !uniq.includes('GTM-AAAA') &&
      !uniq.includes('GTM-TXNVDFBM'),
    `runtime=${uniq.join(',') || '(none)'} env GA4=${fileGa4 || '(blank)'} GTM=${fileGtm || '(blank)'}`,
  );
  add('gtm', 'recreateScript present', /recreateScript/.test(rt.body));
}

// ---------- 4) Local images ----------
async function checkImages() {
  const pages = ['/', '/blog/', '/about-us/', '/contact-us/', '/vehicles/', '/faqs/', '/filter-screen/'];
  // add a couple posts from inventory
  try {
    const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
    for (const p of (inv.posts || []).slice(0, 3)) {
      try {
        pages.push(new URL(p.url).pathname);
      } catch {
        /* */
      }
    }
    for (const p of (inv.cars || []).slice(0, 2)) {
      try {
        pages.push(new URL(p.url).pathname);
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }

  const externalHosts = new Map();
  let checkedPages = 0;
  let totalImg = 0;
  let missingLocal = [];
  const allowHost = (host) =>
    /^(?:.*\.)?izi\.ae$/i.test(host) ||
    host === '127.0.0.1' ||
    // YouTube lazyload template + thumbs (WP Rocket embeds)
    /^(?:i\.)?ytimg\.com$/i.test(host) ||
    /^(?:www\.)?youtube\.com$/i.test(host) ||
    // Non-image script CDNs sometimes appear in src= of <script>
    /^(?:code\.jquery\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|static\.cloudflareinsights\.com)$/i.test(host);

  for (const path of pages) {
    const r = await fetchText(`${BASE}${path}`);
    if (r.status !== 200) continue;
    checkedPages += 1;
    const srcs = [
      ...r.body.matchAll(/\bsrc=["']([^"']+)["']/gi),
      ...r.body.matchAll(/\bdata-src=["']([^"']+)["']/gi),
      ...r.body.matchAll(/\bsrcset=["']([^"']+)["']/gi),
    ].flatMap((m) =>
      m[1]
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean),
    );
    for (const src of srcs) {
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;
      totalImg += 1;
      if (src.startsWith('//')) {
        const host = src.slice(2).split('/')[0];
        if (!allowHost(host)) externalHosts.set(host, (externalHosts.get(host) || 0) + 1);
        continue;
      }
      if (/^https?:\/\//i.test(src)) {
        try {
          const u = new URL(src);
          if (!allowHost(u.hostname)) {
            externalHosts.set(u.hostname, (externalHosts.get(u.hostname) || 0) + 1);
          } else if (/izi\.ae$/i.test(u.hostname) && /\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?|$)/i.test(u.pathname)) {
            externalHosts.set('absolute-izi.ae-images-in-html', (externalHosts.get('absolute-izi.ae-images-in-html') || 0) + 1);
          }
        } catch {
          /* */
        }
        continue;
      }
      // root-relative — verify file exists under public/ when under /wp-content/
      if (src.startsWith('/wp-content/') || src.startsWith('/wp-includes/')) {
        const clean = src.split('?')[0];
        const file = join(ROOT, 'public', clean.replace(/^\//, ''));
        if (!existsSync(file)) missingLocal.push({ path, src: clean });
      }
    }
  }

  // Also scan cleaned html for remote http(s) image hosts excluding analytics
  const cleaned = walkFiles(join(ROOT, 'src/legacy'), (p) => p.endsWith('.cleaned.html'));
  const cleanedExternal = new Map();
  for (const f of cleaned) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?[^"']*)?)["']/gi)) {
      try {
        const u = new URL(m[1]);
        if (/^(?:i\.)?ytimg\.com$/i.test(u.hostname)) continue; // WP Rocket YouTube template
        if (!/izi\.ae$/i.test(u.hostname)) cleanedExternal.set(u.hostname, (cleanedExternal.get(u.hostname) || 0) + 1);
      } catch {
        /* */
      }
    }
  }

  add('images', `scanned pages`, checkedPages > 0, `pages=${checkedPages} imgRefs≈${totalImg}`);
  add(
    'images',
    'no third-party content-image hosts in HTML samples',
    ![...externalHosts.keys()].some((h) => !/^absolute-izi\.ae-images-in-html$/i.test(h)),
    JSON.stringify(Object.fromEntries(externalHosts)),
  );
  // Prefer: missing /wp-content files = 0 for content images
  const missingUnique = [...new Set(missingLocal.map((m) => m.src))];
  add(
    'images',
    'sampled /wp-content assets exist locally',
    missingUnique.length === 0,
    missingUnique.length ? `missing ${missingUnique.length}: ${missingUnique.slice(0, 8).join(', ')}` : 'ok',
  );
  add(
    'images',
    'cleaned mirrors no remote image CDN',
    cleanedExternal.size === 0,
    cleanedExternal.size ? JSON.stringify(Object.fromEntries(cleanedExternal)) : 'ok',
  );
  writeFileSync(
    join(OUT, 'images.json'),
    JSON.stringify({ externalHosts: Object.fromEntries(externalHosts), missingUnique: missingUnique.slice(0, 100), cleanedExternal: Object.fromEntries(cleanedExternal) }, null, 2),
  );
}

// ---------- 5) robots + runtime-gtm ----------
async function checkRobots() {
  const local = await fetchText(`${BASE}/robots.txt`);
  const live = await fetchText(`${LIVE}/robots.txt`);
  add('robots', 'local 200', local.status === 200);
  add('robots', 'points to izi sitemap', /Sitemap:\s*https:\/\/izi\.ae\/sitemap_index\.xml/i.test(local.body));
  add('robots', 'no peer domains', !/pittant|lladesigners|connectgroup/i.test(local.body));
  // Compare disallow core against live
  const liveDisallows = [...live.body.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1]);
  const localDisallows = [...local.body.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1]);
  const missing = liveDisallows.filter((d) => !localDisallows.includes(d));
  add('robots', 'live Disallow rules covered', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'match');

  const rt = await fetchText(`${BASE}/runtime-gtm.js`);
  add('robots', 'runtime-gtm.js served (gtm file)', rt.status === 200 && /recreateScript|dataLayer/.test(rt.body));
}

// ---------- 6) Forms / Pipedrive ----------
async function checkForms() {
  // empty should fail
  const empty = await fetchText(`${BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify({}),
  });
  add('forms', 'empty payload rejected', empty.status >= 400, `HTTP ${empty.status}`);

  await new Promise((r) => setTimeout(r, 300));
  const stamp = Date.now();
  const payload = {
    name: 'GoLive Verify',
    email: `golive-${stamp}@example.com`,
    phone: '+971500000099',
    message: 'Go-live Pipedrive verification from local fleet',
    website: '',
    gclid: 'golive-gclid',
    campaignid: '99',
    device: 'c',
  };
  const okRes = await fetchText(`${BASE}/api/contact/?gclid=golive-gclid&campaignid=99&device=c`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify(payload),
  });
  let parsed = {};
  try {
    parsed = JSON.parse(okRes.body);
  } catch {
    /* */
  }
  add('forms', 'contact submit success', okRes.status === 200 && parsed.success === true, `HTTP ${okRes.status} ${okRes.body.slice(0, 120)}`);

  // lead store file should include pipedrive evidence
  const leadsRoot = join(ROOT, '.data/leads');
  function walk(d, acc = []) {
    if (!existsSync(d)) return acc;
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p, acc);
      else if (n.endsWith('.json')) acc.push(p);
    }
    return acc;
  }
  const files = walk(leadsRoot).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  let hit = null;
  for (const f of files.slice(0, 40)) {
    const t = readFileSync(f, 'utf8');
    if (t.includes(payload.email) || t.includes('golive-gclid')) {
      hit = { file: f, t };
      break;
    }
  }
  add('forms', 'lead stored locally', !!hit, hit ? hit.file.replace(ROOT, '') : 'not found');
  if (hit) {
    let lead = {};
    try {
      lead = JSON.parse(hit.t);
    } catch {
      /* */
    }
    const blob = hit.t;
    const pipedriveOk =
      /"deliveryStatus"\s*:\s*"delivered"/i.test(blob) ||
      (!!lead.pipedriveLeadId && !!lead.pipedrivePersonId) ||
      lead?.pipedrive?.ok === true ||
      lead?.integrations?.pipedrive?.ok === true ||
      lead?.crm?.pipedrive?.ok === true;
    add(
      'forms',
      'pipedrive connected in lead',
      pipedriveOk,
      `delivery=${lead.deliveryStatus} person=${lead.pipedrivePersonId || '-'} lead=${lead.pipedriveLeadId || '-'}`,
    );
    writeFileSync(join(OUT, 'lead-sample.json'), JSON.stringify(lead, null, 2).slice(0, 8000));
  } else {
    add('forms', 'pipedrive connected in lead', false, 'no lead file');
  }

  // CF7 forms present on contact page
  const contact = await fetchText(`${BASE}/contact-us/`);
  add('forms', 'contact page has form', /wpcf7-form|data-contact-form|name=["']your-email|name=["']email/i.test(contact.body));
}

async function main() {
  console.log(`BASE=${BASE}`);
  await checkSitemap();
  await checkRedirects();
  await checkGtm();
  await checkImages();
  await checkRobots();
  await checkForms();

  const passed = rows.filter((r) => r.pass).length;
  const failed = rows.filter((r) => !r.pass).length;
  writeFileSync(join(OUT, 'report.json'), JSON.stringify({ base: BASE, passed, failed, rows }, null, 2));
  console.log(`\nDONE  pass=${passed} fail=${failed}  report=${join(OUT, 'report.json')}`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
