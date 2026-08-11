/**
 * Structural parity: live emiratisationnafis.org vs local :5108
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = 'https://emiratisationnafis.org';
const LOCAL = process.env.QA_BASE || 'http://127.0.0.1:5108';

const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
const PAGES = [
  '/',
  ...inv.pages.filter((p) => p.slug !== 'homepage').map((p) => `/${p.slug}/`),
  ...inv.posts.slice(0, 12).map((p) => `/${p.slug}/`),
];

function text(html, re) {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function count(html, re) {
  return (html.match(re) || []).length;
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchHtml(base, path) {
  const res = await fetch(`${base}${path}`, {
    redirect: 'follow',
    headers: { 'user-agent': 'emiratisationnafis-parity/0.1' },
  });
  return { status: res.status, html: await res.text(), url: res.url };
}

function summarize(html) {
  return {
    title: text(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    h1: stripTags(text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)),
    sections: count(html, /data-elementor-type=["'](?:wp-page|wp-post)/gi) || count(html, /elementor-section/gi),
    images: count(html, /<img\b/gi),
    logo: /logo-emiratisation-GATE/i.test(html),
    form: /wpcf7|contact-form|astro-mirror-fixes|\/api\/contact/i.test(html),
    fixes: /astro-mirror-fixes\.js/i.test(html),
    gtmRuntime: /runtime-gtm\.js/i.test(html),
    hardcodedGtm: /GTM-[A-Z0-9]+/i.test(html),
    swiper: /swiper/i.test(html),
    elementor: /elementor/i.test(html),
    brokenAbs: count(html, /https?:\/\/(?:www\.)?emiratisationnafis\.org\/wp-content/gi),
    canonical: text(html, /rel=["']canonical["'][^>]*href=["']([^"']+)/i)
      || text(html, /href=["']([^"']+)["'][^>]*rel=["']canonical["']/i),
  };
}

function missingAssets(html) {
  const missing = [];
  const re = /(?:src|href)=["'](\/wp-content\/[^"'?#]+)/gi;
  for (const m of html.matchAll(re)) {
    const rel = m[1];
    const disk = join(ROOT, 'public', rel.replace(/^\//, ''));
    if (!existsSync(disk)) missing.push(rel);
  }
  return [...new Set(missing)];
}

const results = [];
let fail = 0;
for (const path of PAGES) {
  const live = await fetchHtml(LIVE, path);
  const local = await fetchHtml(LOCAL, path);
  const L = summarize(live.html);
  const C = summarize(local.html);
  const diffs = [];
  if (live.status !== local.status) diffs.push(`status ${live.status} vs ${local.status}`);
  if (L.title !== C.title) diffs.push(`title "${L.title}" vs "${C.title}"`);
  if (L.h1 && C.h1 && L.h1.slice(0, 100) !== C.h1.slice(0, 100)) diffs.push(`h1`);
  if (Math.abs(L.images - C.images) > 8) diffs.push(`images ${L.images}->${C.images}`);
  if (L.logo && !C.logo) diffs.push('missing logo');
  if (L.elementor && !C.elementor) diffs.push('missing elementor');
  if ((path === '/' || path.includes('contact') || path === '/about-us/') && !C.fixes) {
    diffs.push('missing astro-mirror-fixes');
  }
  if (!C.gtmRuntime) diffs.push('missing runtime-gtm');
  if (C.hardcodedGtm) diffs.push('hardcoded GTM left');
  if (C.brokenAbs > 0) diffs.push(`absolute wp-content urls ${C.brokenAbs}`);
  if (C.canonical && !/^https:\/\/emiratisationnafis\.org/.test(C.canonical) && C.canonical.startsWith('http')) {
    diffs.push(`canonical ${C.canonical}`);
  }
  const miss = local.status === 200 ? missingAssets(local.html) : [];
  if (miss.length) diffs.push(`missing assets ${miss.length}: ${miss.slice(0, 5).join(', ')}`);
  if (diffs.length) fail += 1;
  results.push({
    path,
    liveStatus: live.status,
    localStatus: local.status,
    live: L,
    local: C,
    missingAssets: miss,
    diffs,
  });
  console.log(
    path,
    diffs.length ? `DIFF ${diffs.join(' | ')}` : 'OK',
    `imgs ${L.images}/${C.images}`,
  );
}

writeFileSync(join(ROOT, '.tmp-parity.json'), JSON.stringify(results, null, 2));
console.log(`\n${fail}/${results.length} pages with diffs — wrote .tmp-parity.json`);
process.exit(fail ? 1 : 0);
