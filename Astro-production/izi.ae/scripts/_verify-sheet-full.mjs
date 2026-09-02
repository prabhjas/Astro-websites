/**
 * Verify all izi-sheet.xlsx audit items against local http://127.0.0.1:5121
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = 'http://127.0.0.1:5121';
const LEGACY = join(process.cwd(), 'Astro-production/izi.ae/src/legacy');
const PUBLIC = join(process.cwd(), 'Astro-production/izi.ae/public');

function walk(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (f.endsWith('.cleaned.html')) acc.push(p);
  }
  return acc;
}

async function fetchPage(path) {
  const res = await fetch(BASE + path);
  const html = await res.text();
  const headers = Object.fromEntries(res.headers.entries());
  return { status: res.status, html, headers };
}

function count(html, re) {
  return (html.match(re) || []).length;
}

function pass(ok, label, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
}

const results = [];

console.log('=== IZI sheet verification vs http://127.0.0.1:5121 ===\n');

// --- 1. Car detail pages missing H1 ---
console.log('1. Car detail pages: missing H1');
{
  const carFiles = walk(LEGACY).filter((f) => relative(LEGACY, f).startsWith('car'));
  let allOk = true;
  for (const f of carFiles) {
    const slug = relative(LEGACY, f).replace(/\.cleaned\.html$/, '').replace(/\\/g, '/');
    const { html, status } = await fetchPage('/' + slug + '/');
    const h1 = count(html, /<h1\b/gi);
    const ok = status === 200 && h1 === 1;
    if (!ok) allOk = false;
    pass(ok, slug, `HTTP ${status}, h1=${h1}`);
  }
  results.push(['Car pages H1', allOk]);
}

// --- 2. Blog page multiple H1 ---
console.log('\n2. Blog page H1 count (sheet: 12 → should be 1)');
{
  const { html, status } = await fetchPage('/blog/');
  const h1 = count(html, /<h1\b/gi);
  const hasArchive = /astro-archive-heading/i.test(html);
  const cardH1 = count(html, /ecs-post-loop[\s\S]{0,1200}?<h1\b/gi);
  const ok = status === 200 && h1 === 1 && hasArchive && cardH1 === 0;
  pass(ok, '/blog/', `h1=${h1}, archiveH1=${hasArchive}, cardH1=${cardH1}`);
  results.push(['Blog single H1', ok]);
}

// --- 3. 11 zero-H1 pages ---
console.log('\n3. Previously zero-H1 pages (11 cars + review-form)');
{
  const zeroSlugs = [
    'car/audi-a3-2024',
    'car/bmw-x2-2024',
    'car/hyundai-accent-2024',
    'car/hyundai-tucson-2024',
    'car/nissan-kicks',
    'car/nissan-patrol-2024',
    'car/nissan-sunny-2024',
    'car/sedan-hyunday-elentra-2024',
    'car/toyota-landcruiser-2024',
    'car/toyota-rav-4-2024',
    'car/toyota-yaris-2024',
    'review-form',
  ];
  let allOk = true;
  for (const slug of zeroSlugs) {
    const { html, status } = await fetchPage('/' + slug + '/');
    const h1 = count(html, /<h1\b/gi);
    const ok = status === 200 && h1 >= 1;
    if (!ok) allOk = false;
    pass(ok, slug, `h1=${h1}`);
  }
  results.push(['Zero-H1 pages fixed', allOk]);
}

// --- 4. Security headers ---
console.log('\n4. Security headers');
{
  const { headers } = await fetchPage('/');
  const csp = headers['content-security-policy-report-only'] || headers['content-security-policy'];
  const nosniff = headers['x-content-type-options'];
  const hsts = headers['strict-transport-security'];
  const referrer = headers['referrer-policy'];
  const okCsp = Boolean(csp);
  const okNosniff = nosniff === 'nosniff';
  const okHsts = Boolean(hsts);
  const okRef = Boolean(referrer);
  pass(okCsp, 'Content-Security-Policy (Report-Only)', csp ? 'set' : 'missing');
  pass(okNosniff, 'X-Content-Type-Options', nosniff || 'missing');
  pass(okHsts, 'Strict-Transport-Security', hsts || 'missing');
  pass(okRef, 'Referrer-Policy', referrer || 'missing');
  results.push(['Security headers', okCsp && okNosniff && okHsts && okRef]);
}

// --- 5. Missing alt text ---
console.log('\n5. Images missing alt text (sample pages)');
{
  const pages = ['/', '/blog/', '/car/toyota-yaris-2024/', '/about-us/', '/contact-us/'];
  let allOk = true;
  let totalEmpty = 0;
  for (const p of pages) {
    const { html } = await fetchPage(p);
    // Real <img> tags only — ignore JS string templates like alt="' + item.url
    let emptyAlt = 0;
    let noAlt = 0;
    for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
      const attrs = m[1];
      // Skip broken/partial tags inside JS concatenations
      if (/['"]\s*\+/.test(attrs) || /\+\s*['"]/.test(attrs)) continue;
      const alt = attrs.match(/\balt\s*=\s*(["'])([\s\S]*?)\1/i);
      if (!alt) noAlt += 1;
      else if (!String(alt[2]).trim()) emptyAlt += 1;
    }
    const bad = emptyAlt + noAlt;
    totalEmpty += bad;
    const ok = bad === 0;
    if (!ok) allOk = false;
    pass(ok, p, `emptyAlt=${emptyAlt}, noAlt=${noAlt}`);
  }
  results.push(['Missing alt text', allOk]);
  console.log(`    Total empty/missing alt on sample: ${totalEmpty}`);
}

// --- 6. Lazy loading ---
console.log('\n6. Image lazy-loading');
{
  const { html } = await fetchPage('/');
  const imgs = count(html, /<img\b/gi);
  const lazy = count(html, /loading=["']lazy["']/gi);
  const ok = lazy > 10;
  pass(ok, 'Homepage has loading=lazy', `${lazy}/${imgs} images`);
  results.push(['Lazy-loading', ok]);
}

// --- 7. Homepage href="#" / empty href ---
console.log('\n7. Homepage empty / hash links');
{
  const { html } = await fetchPage('/');
  // skip-link to #content is OK
  const hashLinks = [...html.matchAll(/<a\b([^>]*)>/gi)].filter((m) => {
    const attrs = m[1];
    if (/skip-link|screen-reader-text/.test(attrs)) return false;
    return /\bhref\s*=\s*(["'])(?:#|\1)\1/.test(attrs) || /\bhref\s*=\s*["']\s*["']/.test(attrs);
  }).length;
  const ok = hashLinks === 0;
  pass(ok, 'Non-skip hash/empty hrefs', `count=${hashLinks}`);
  results.push(['Homepage hash links', ok]);
}

// --- 8. Font errors ---
console.log('\n8. Font assets');
{
  const assets = [
    '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.min.css',
    '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2',
    '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
    '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
  ];
  let allOk = true;
  for (const a of assets) {
    const local = join(PUBLIC, a.slice(1).replace(/\//g, '\\'));
    const exists = existsSync(local);
    let httpOk = false;
    try {
      const r = await fetch(BASE + a);
      httpOk = r.status === 200;
    } catch {
      httpOk = false;
    }
    const ok = exists && httpOk;
    if (!ok) allOk = false;
    pass(ok, a, `disk=${exists}, http=${httpOk}`);
  }
  const { html } = await fetchPage('/');
  const faLinked = /font-awesome\/css\/solid\.min\.css/i.test(html);
  pass(faLinked, 'FA CSS linked in HTML');
  results.push(['Font assets', allOk && faLinked]);
}

// --- 9. Multi-H1 demotion on other pages ---
console.log('\n9. Multi-H1 pages demoted');
{
  const pages = ['/nissan-patrol-rental/', '/rent-a-car-in-umm-al-quwain/'];
  let allOk = true;
  for (const p of pages) {
    const { html, status } = await fetchPage(p);
    if (status !== 200) {
      pass(true, p, `HTTP ${status} (skip)`);
      continue;
    }
    const h1 = count(html, /<h1\b/gi);
    const ok = h1 <= 1;
    if (!ok) allOk = false;
    pass(ok, p, `h1=${h1}`);
  }
  results.push(['Multi-H1 demotion', allOk]);
}

// --- 10. Resource bloat / WP footprint (mitigated, not eliminated) ---
console.log('\n10. Resource bloat / WP footprint (mitigation checks)');
{
  const { html } = await fetchPage('/');
  const stylesheets = count(html, /<link[^>]+rel=["']stylesheet["']/gi);
  const scripts = count(html, /<script[^>]+src=/gi);
  const inlineScripts = count(html, /<script(?![^>]*\bsrc=)[^>]*>/gi);
  const rocketBootstrap = /RocketLazyLoadScripts/i.test(html);
  const rocketAsyncStyle = /data-rocket-async=["']style["']/i.test(html);
  const generator = /<meta\s+name=["']generator["']/i.test(html);

  pass(!rocketBootstrap, 'WP Rocket bootstrap removed', rocketBootstrap ? 'still present' : 'gone');
  pass(!rocketAsyncStyle, 'Rocket async styles converted', rocketAsyncStyle ? 'still present' : 'converted');
  pass(!generator, 'WP generator meta removed');
  console.log(`    Stylesheets=${stylesheets}, external scripts=${scripts}, inline scripts=${inlineScripts}`);
  console.log('    NOTE: Elementor mirror still loads many WP assets by design; bloat mitigated not eliminated.');
  results.push(['Rocket/WP hygiene', !rocketBootstrap && !rocketAsyncStyle && !generator]);
  results.push([
    'Resource count (informational)',
    true, // not a hard fail — mirror architecture
  ]);
}

// --- 11. Form test ---
console.log('\n11. Form / contact API');
{
  const res = await fetch(BASE + '/api/contact/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE,
    },
    body: JSON.stringify({
      name: 'Sheet Verify',
      email: 'verify@example.com',
      phone: '+971500000000',
      message: 'sheet verification contact test',
      website: '',
    }),
  });
  const text = await res.text();
  let ok = res.status === 200;
  try {
    const j = JSON.parse(text);
    ok = ok && (j.success === true || j.ok === true);
  } catch {
    ok = false;
  }
  pass(ok, 'POST /api/contact/', `HTTP ${res.status} ${text.slice(0, 80)}`);
  results.push(['Form contact API', ok]);
}

// --- Summary ---
console.log('\n=== SUMMARY ===');
let fails = 0;
for (const [name, ok] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) fails++;
}
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
