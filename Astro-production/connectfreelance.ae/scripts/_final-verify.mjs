/**
 * Final go-live verification for connectfreelance.ae local fleet.
 * Checks: colors, GTM, sitemap, redirects, external images, robots.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const LOCAL = 'http://127.0.0.1:5094';
const LIVE = 'https://connectfreelance.ae';
const ROOT = path.resolve('d:/Astro-websites/Astro-production/connectfreelance.ae');
const report = { ok: [], fail: [], warn: [] };
const note = (arr, msg) => arr.push(msg);

async function fetchText(url) {
  const r = await fetch(url, { redirect: 'manual' });
  return { status: r.status, headers: r.headers, body: await r.text(), loc: r.headers.get('location') };
}

// --- 1. Colors ---
async function checkColors() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${LOCAL}/payment/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  const pay = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.elementor-widget-text-editor p')].find((el) =>
      /Welcome to our secure payment/i.test(el.textContent || ''),
    );
    return p ? getComputedStyle(p).color : null;
  });
  if (pay === 'rgb(255, 255, 255)') note(report.ok, `Payment body text white (${pay})`);
  else note(report.fail, `Payment body text expected white, got ${pay}`);

  await page.goto(`${LOCAL}/contact-us/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  const emailColor = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="mailto:"]')].find((el) =>
      /contact@connectfreelance/i.test(el.textContent || el.getAttribute('href') || ''),
    );
    return a ? { color: getComputedStyle(a).color, text: a.textContent.trim() } : null;
  });
  if (emailColor && emailColor.color !== 'rgb(0, 0, 238)') {
    note(report.ok, `Contact email color not browser-blue (${emailColor.color})`);
  } else {
    note(report.fail, `Contact email still browser blue: ${JSON.stringify(emailColor)}`);
  }
  await browser.close();
}

// --- 2. GTM ---
async function checkGtm() {
  const runtime = await fetchText(`${LOCAL}/runtime-gtm.js`);
  if (runtime.status !== 200) note(report.fail, `runtime-gtm.js HTTP ${runtime.status}`);
  else note(report.ok, 'runtime-gtm.js 200');

  if (/GTM-AAAA|GTM-BBBB|GTM-NN6Z3Q5/.test(runtime.body)) {
    note(report.fail, 'runtime-gtm.js still contains placeholder/hardcoded GTM IDs');
  } else {
    note(report.ok, 'runtime-gtm.js has no placeholder/hardcoded GTM IDs');
  }
  if (/G-WG16DPP9YT/.test(runtime.body)) note(report.ok, 'runtime-gtm.js loads GA4 from env (G-WG16DPP9YT)');
  else note(report.warn, 'GA4 ID not found in runtime-gtm.js (check PUBLIC_GA4_ID)');

  for (const p of ['/payment/', '/category/business/', '/insights/', '/']) {
    const page = await fetchText(`${LOCAL}${p}`);
    const hardcoded = (page.body.match(/GTM-NN6Z3Q5|GTM-AAAA|GTM-BBBB/g) || []).length;
    const loader = page.body.includes('data-runtime-gtm="1"');
    if (hardcoded) note(report.fail, `${p} still has hardcoded GTM (${hardcoded})`);
    else note(report.ok, `${p} no hardcoded GTM`);
    if (loader) note(report.ok, `${p} has /runtime-gtm.js loader`);
    else note(report.fail, `${p} missing runtime-gtm loader`);
  }

  // on-disk shells
  const shell = fs.readFileSync(path.join(ROOT, 'src/legacy/category-shell/template.html'), 'utf8');
  if (/GTM-[A-Z0-9]+/.test(shell)) note(report.fail, 'category-shell still embeds GTM');
  else note(report.ok, 'category-shell GTM stripped on disk');
}

// --- 3. Sitemap ---
async function checkSitemap() {
  const idx = await fetchText(`${LOCAL}/sitemap_index.xml`);
  if (idx.status !== 200 || !idx.body.includes('page-sitemap.xml') || !idx.body.includes('post-sitemap.xml')) {
    note(report.fail, `sitemap_index bad: ${idx.status}`);
    return;
  }
  note(report.ok, 'sitemap_index.xml OK');

  const pages = await fetchText(`${LOCAL}/page-sitemap.xml`);
  const posts = await fetchText(`${LOCAL}/post-sitemap.xml`);
  const pageLocs = [...pages.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const postLocs = [...posts.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  note(report.ok, `page-sitemap: ${pageLocs.length} URLs`);
  note(report.ok, `post-sitemap: ${postLocs.length} URLs`);

  const badAbs = [...pageLocs, ...postLocs].filter((u) => !u.startsWith('https://connectfreelance.ae/'));
  if (badAbs.length) note(report.fail, `sitemap URLs not absolute canonical: ${badAbs.slice(0, 3)}`);
  else note(report.ok, 'all sitemap locs use https://connectfreelance.ae');

  // spot-check a few page URLs return 200 locally
  const samples = pageLocs
    .map((u) => u.replace('https://connectfreelance.ae', ''))
    .filter((p) => p && p !== '/')
    .slice(0, 8);
  for (const p of samples) {
    const r = await fetchText(`${LOCAL}${p}`);
    const code = r.status === 200 ? 200 : r.status;
    if (code === 200) note(report.ok, `sitemap page ${p} → 200`);
    else note(report.fail, `sitemap page ${p} → ${code}`);
  }
}

// --- 4. Redirects ---
async function checkRedirects() {
  const yml = fs.readFileSync(path.join(ROOT, 'src/data/redirects.yml'), 'utf8');
  const file = fs.readFileSync(path.join(ROOT, 'public/_redirects'), 'utf8');
  note(report.ok, `_redirects lines: ${file.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length}`);

  const pairs = [
    ['/about/', '/about-us/'],
    ['/contact/', '/contact-us/'],
    ['/blog/', '/insights/'],
    ['/services/', '/freelance-visa-services/'],
    ['/become-a-partner/', '/freelance-affiliate-partnership/'],
    ['/insurance/', '/car-insurance/'],
    ['/health-insurance/', '/health-insurance-for-uae-residence-visa/'],
  ];
  for (const [from, to] of pairs) {
    const r = await fetchText(`${LOCAL}${from}`);
    const loc = (r.loc || '').replace(/\/$/, '/') || '';
    const ok = r.status === 301 || r.status === 302 || r.status === 308;
    const destOk = loc.includes(to.replace(/\/$/, '')) || loc.endsWith(to) || loc === to;
    if (ok && destOk) note(report.ok, `redirect ${from} → ${loc} (${r.status})`);
    else note(report.fail, `redirect ${from} status=${r.status} loc=${loc} expected ${to}`);
  }

  // compare a few vs live
  for (const [from] of pairs.slice(0, 4)) {
    const live = await fetchText(`${LIVE}${from}`);
    const local = await fetchText(`${LOCAL}${from}`);
    const liveLoc = (live.loc || '').replace(LIVE, '') || '';
    const localLoc = (local.loc || '').replace(LOCAL, '') || '';
    if (liveLoc && localLoc && liveLoc.replace(/\/$/, '') === localLoc.replace(/\/$/, '')) {
      note(report.ok, `redirect parity live/local for ${from}`);
    } else if (!live.loc && live.status === 200) {
      note(report.warn, `live ${from} is 200 (no redirect) — local ${local.status} ${localLoc}`);
    } else {
      note(report.warn, `redirect diff ${from}: live=${live.status}:${liveLoc} local=${local.status}:${localLoc}`);
    }
  }
}

// --- 5. External images on key pages ---
async function checkImages() {
  const pages = ['/', '/payment/', '/contact-us/', '/insights/', '/about-us/'];
  for (const p of pages) {
    const { body } = await fetchText(`${LOCAL}${p}`);
    const $ = load(body);
    const external = [];
    $('img[src], img[data-src], img[data-lazy-src], source[srcset]').each((_, el) => {
      const attrs = ['src', 'data-src', 'data-lazy-src', 'srcset'];
      for (const a of attrs) {
        const v = $(el).attr(a) || '';
        for (const part of v.split(',')) {
          const url = part.trim().split(/\s+/)[0];
          if (/^https?:\/\//i.test(url) && !/connectfreelance\.ae|127\.0\.0\.1|localhost|data:|schema\.org|w3\.org/i.test(url)) {
            external.push(url);
          }
        }
      }
    });
    // also background urls in style attrs pointing at remote
    const bgExt = [...body.matchAll(/url\((['"]?)(https?:\/\/[^)'"]+)\1\)/gi)]
      .map((m) => m[2])
      .filter((u) => !/connectfreelance\.ae|fonts\.g|googletagmanager|google-analytics|facebook|linkedin|gstatic|googleapis/i.test(u));
    const all = [...new Set([...external, ...bgExt])];
    if (all.length) note(report.fail, `${p} external media: ${all.slice(0, 5).join(' | ')}`);
    else note(report.ok, `${p} no unexpected external images`);
  }
}

// --- 6. robots ---
async function checkRobots() {
  const local = await fetchText(`${LOCAL}/robots.txt`);
  const live = await fetchText(`${LIVE}/robots.txt`);
  if (local.status !== 200) note(report.fail, `robots.txt ${local.status}`);
  else note(report.ok, 'robots.txt 200');

  if (!/Sitemap:\s*https:\/\/connectfreelance\.ae\/sitemap_index\.xml/i.test(local.body)) {
    note(report.fail, 'robots.txt missing sitemap line');
  } else note(report.ok, 'robots.txt Sitemap → sitemap_index.xml');

  for (const d of ['/tag/', '/category/', '/wp-admin/', '/feed/', '/cdn-cgi/']) {
    if (!local.body.includes(`Disallow: ${d}`)) note(report.fail, `robots missing Disallow ${d}`);
    else note(report.ok, `robots Disallow ${d}`);
  }

  // live parity (order may differ)
  const liveRules = new Set([...live.body.matchAll(/Disallow:\s*(\S+)/g)].map((m) => m[1]));
  const localRules = new Set([...local.body.matchAll(/Disallow:\s*(\S+)/g)].map((m) => m[1]));
  for (const r of liveRules) {
    if (!localRules.has(r)) note(report.warn, `live Disallow ${r} not in local`);
  }
}

async function main() {
  console.log('=== FINAL VERIFY connectfreelance ===\n');
  await checkColors();
  await checkGtm();
  await checkSitemap();
  await checkRedirects();
  await checkImages();
  await checkRobots();

  console.log('\n--- PASS ---');
  for (const m of report.ok) console.log('✓', m);
  console.log('\n--- WARN ---');
  for (const m of report.warn) console.log('!', m);
  console.log('\n--- FAIL ---');
  for (const m of report.fail) console.log('✗', m);
  console.log(`\nSummary: ${report.ok.length} pass, ${report.warn.length} warn, ${report.fail.length} fail`);
  process.exit(report.fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
