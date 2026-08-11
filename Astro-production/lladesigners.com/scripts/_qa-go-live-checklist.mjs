import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';
const ROOT = process.cwd();

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'LLA-QA/1.0' } });
  const text = res.status < 400 ? await res.text() : '';
  return { status: res.status, headers: Object.fromEntries(res.headers), text, location: res.headers.get('location') };
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function pathOnly(url) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url;
  }
}

const report = { sitemap: {}, redirects: {}, gtm: {}, images: {}, robots: {}, forms: {} };

// --- 1. Sitemap ---
const index = await fetchText(`${LOCAL}/sitemap_index.xml`);
const childLocs = extractLocs(index.text);
report.sitemap.indexStatus = index.status;
report.sitemap.childSitemaps = childLocs.map(pathOnly);
report.sitemap.children = {};
let allUrls = [];
for (const loc of childLocs) {
  const path = pathOnly(loc);
  const child = await fetchText(`${LOCAL}${path}`);
  const urls = extractLocs(child.text);
  report.sitemap.children[path] = { status: child.status, count: urls.length, sample: urls.slice(0, 3).map(pathOnly) };
  allUrls.push(...urls.map(pathOnly));
}
report.sitemap.totalUrls = allUrls.length;
report.sitemap.uniqueUrls = new Set(allUrls).size;
report.sitemap.hasHomepage = allUrls.includes('/') || allUrls.some((u) => u === 'https://lladesigners.com/' || u.endsWith('lladesigners.com/'));
report.sitemap.absoluteOriginOk = allUrls.every((u) => u.startsWith('https://lladesigners.com/') || u === 'https://lladesigners.com' || u.startsWith('/'));

// Spot-check a few sitemap URLs return 200 locally
const spot = [...new Set(allUrls.map(pathOnly))].filter((p) => p.startsWith('/')).slice(0, 12);
const spotResults = [];
for (const p of spot) {
  const r = await fetchText(`${LOCAL}${p}`);
  spotResults.push({ path: p, status: r.status, loc: r.location });
}
report.sitemap.spotCheck = spotResults;

// --- 2. Redirects ---
const yml = parseYaml(readFileSync(join(ROOT, 'src/data/redirects.yml'), 'utf8'));
const rules = Array.isArray(yml.redirects) ? yml.redirects : [];
report.redirects.totalRules = rules.length;
const redirectSamples = rules.filter((r) => r.from && !String(r.from).includes('?')).slice(0, 15);
const redirectResults = [];
for (const rule of redirectSamples) {
  const local = await fetchText(`${LOCAL}${rule.from}`);
  let live = { status: 0, location: null };
  try {
    live = await fetchText(`${LIVE}${rule.from}`);
  } catch (e) {
    live = { status: 0, location: String(e.message).slice(0, 80) };
  }
  redirectResults.push({
    from: rule.from,
    expectedTo: rule.to,
    localStatus: local.status,
    localTo: local.location,
    liveStatus: live.status,
    liveTo: live.location,
    localOk: local.status >= 300 && local.status < 400 && String(local.location || '').replace(LOCAL, '') === rule.to,
  });
}
report.redirects.samples = redirectResults;
report.redirects.localPass = redirectResults.filter((r) => r.localOk).length;
report.redirects.localFail = redirectResults.filter((r) => !r.localOk).length;

// --- 3/5. GTM + robots ---
const robots = await fetchText(`${LOCAL}/robots.txt`);
report.robots = { status: robots.status, body: robots.text.slice(0, 500) };
const runtimeGtm = await fetchText(`${LOCAL}/runtime-gtm.js`);
report.gtm.runtimeStatus = runtimeGtm.status;
report.gtm.runtimeSnippet = runtimeGtm.text.slice(0, 400);
report.gtm.runtimeHasEnvId = /GTM-MJGDXCJQ|GTM-[A-Z0-9]+/.test(runtimeGtm.text);
report.gtm.runtimeIdMatch = (runtimeGtm.text.match(/GTM-[A-Z0-9]+/g) || []).slice(0, 5);

const home = await fetchText(`${LOCAL}/`);
report.gtm.homeHasRuntimeLoader = /runtime-gtm\.js/.test(home.text);
report.gtm.homeHardcodedGtmScript = /googletagmanager\.com\/gtm\.js\?id=GTM-/.test(home.text);
report.gtm.homeHardcodedGtmIds = [...home.text.matchAll(/GTM-[A-Z0-9]+/g)].map((m) => m[0]);

// Scan cleaned HTML for hardcoded GTM container IDs (not dns-prefetch)
const { readdirSync } = await import('node:fs');
const legacyDir = join(ROOT, 'src/legacy');
const hardcodedFiles = [];
for (const f of readdirSync(legacyDir)) {
  if (!f.endsWith('.cleaned.html')) continue;
  const html = readFileSync(join(legacyDir, f), 'utf8');
  if (/googletagmanager\.com\/gtm\.js\?id=GTM-|GTM-[A-Z0-9]{6,}/.test(html) && /gtm\.js|gtag\/js|ns\.html\?id=GTM-/.test(html)) {
    hardcodedFiles.push(f);
  }
}
report.gtm.legacyHardcodedGtmFiles = hardcodedFiles.slice(0, 30);
report.gtm.legacyHardcodedCount = hardcodedFiles.length;

// --- 4. External images on key pages ---
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const imagePages = ['/', '/interior-design/', '/contact-us/', '/our-blogs/', '/importance-of-lighting-in-interior-design/'];
report.images.pages = {};
for (const path of imagePages) {
  const failed = [];
  const external = [];
  page.removeAllListeners('response');
  page.on('response', (r) => {
    const u = r.url();
    if (!/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(u) && !u.includes('/wp-content/uploads/')) return;
    if (r.status() >= 400) failed.push({ status: r.status(), url: u.replace(LOCAL, '').slice(0, 120) });
    if (/^https?:\/\//i.test(u) && !u.startsWith(LOCAL) && !u.startsWith('data:')) {
      try {
        const host = new URL(u).hostname;
        if (host !== '127.0.0.1' && host !== 'localhost') external.push(u.slice(0, 160));
      } catch {}
    }
  });
  await page.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const domExternal = await page.evaluate(() => {
    return [...document.querySelectorAll('img')].map((img) => img.currentSrc || img.src || img.getAttribute('data-lazy-src') || '').filter((s) => /^https?:\/\//i.test(s) && !/127\.0\.0\.1|localhost/.test(s));
  });
  report.images.pages[path] = {
    failed: [...new Set(failed.map((f) => JSON.stringify(f)))].slice(0, 10).map((s) => JSON.parse(s)),
    networkExternal: [...new Set(external)].slice(0, 15),
    domExternal: [...new Set(domExternal)].slice(0, 15),
  };
}

// --- 6. Forms + Pipedrive ---
await page.goto(`${LOCAL}/contact-us/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);
const formReady = await page.evaluate(() => {
  const form = document.querySelector('form.wpcf7-form');
  return {
    hasForm: !!form,
    fullName: !!form?.querySelector('[name="full-name"], [name="first-name"]'),
    email: !!form?.querySelector('[name="your-email"]'),
    phone: !!form?.querySelector('.wpcf7-phonetext'),
    message: !!form?.querySelector('[name="your-message"]'),
  };
});
report.forms.contactFields = formReady;

const submissionId = `qa-${Date.now()}`;
const apiRes = await fetch(`${LOCAL}/api/contact/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    name: 'QA Verify User',
    email: 'qa.verify.lla@example.com',
    phone: '+971501234567',
    message: 'Automated QA form submit check for Pipedrive wiring.',
    formName: 'contact-form',
    pageUrl: `${LOCAL}/contact-us/`,
    submissionId,
  }),
});
const apiBody = await apiRes.json().catch(() => ({}));
report.forms.apiSubmit = { status: apiRes.status, body: apiBody };

await browser.close();
writeFileSync(join(ROOT, 'scripts/_qa-go-live-checklist.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
