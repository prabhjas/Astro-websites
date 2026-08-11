#!/usr/bin/env node
/**
 * Live vs local parity audit for izi.ae
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LOCAL = process.env.IZI_LOCAL || 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';

const pages = [
  '/',
  '/about-us/',
  '/contact-us/',
  '/blog/',
  '/vehicles/',
  '/car-listing/',
  '/car/toyota-yaris-2024/',
  '/faqs/',
  '/rent-a-car-uae/',
  '/suv/',
  '/sedan/',
  '/vehicles/toyota/',
  '/vehicles/bmw/',
  '/rent-a-car-uae/rent-a-car-dubai/',
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'izi-parity/0.1', Accept: 'text/html,*/*' },
    redirect: 'follow',
  });
  return { status: res.status, html: await res.text() };
}

function titleOf(html) {
  return ((html.match(/<title[^>]*>([^<]*)/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
}

function h1Of(html) {
  return ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function collectLocalPaths(html) {
  const urls = new Set();
  const patterns = [
    /(?:src|href|data-src|data-lazy-src|poster)=["']([^"']+)/gi,
    /url\(\s*["']?(\/[^"')\s]+)/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      let u = m[1].split('?')[0].split('#')[0];
      if (u.startsWith('//')) u = `https:${u}`;
      if (/^https?:\/\/(?:www\.)?izi\.ae\//i.test(u)) {
        u = u.replace(/^https?:\/\/(?:www\.)?izi\.ae/i, '');
      }
      if (!u.startsWith('/')) continue;
      if (u.startsWith('/api/') || u.startsWith('/runtime') || u === '/') continue;
      if (/\.(html?|php)$/i.test(u)) continue;
      urls.add(u);
    }
  }
  return [...urls];
}

function missingLocal(paths) {
  return paths.filter((u) => {
    const rel = u.replace(/^\//, '');
    return !existsSync(join(PUBLIC, ...rel.split('/')));
  });
}

async function headOk(base, path) {
  try {
    const r = await fetch(base + path, { method: 'HEAD' });
    if (r.ok) return true;
    const g = await fetch(base + path, { method: 'GET' });
    return g.ok;
  } catch {
    return false;
  }
}

async function main() {
  const report = { at: new Date().toISOString(), local: LOCAL, live: LIVE, pages: [], missingGlobal: new Set() };

  for (const path of pages) {
    const [local, live] = await Promise.all([
      fetchText(LOCAL + path),
      fetchText(`${LIVE}${path}?nowprocket=1`).catch(() => ({ status: 0, html: '' })),
    ]);

    const localPaths = collectLocalPaths(local.html);
    const miss = missingLocal(localPaths);
    miss.forEach((m) => report.missingGlobal.add(m));

    // Sample HEAD checks (first 30 unique paths)
    const sample = localPaths.filter((u) => u.startsWith('/wp-')).slice(0, 35);
    const broken = [];
    await Promise.all(
      sample.map(async (u) => {
        if (!(await headOk(LOCAL, u))) broken.push(u);
      }),
    );

    const row = {
      path,
      localStatus: local.status,
      liveStatus: live.status,
      titleMatch: titleOf(local.html) === titleOf(live.html),
      localTitle: titleOf(local.html).slice(0, 90),
      liveTitle: titleOf(live.html).slice(0, 90),
      h1Match: h1Of(local.html) === h1Of(live.html),
      localH1: h1Of(local.html),
      liveH1: h1Of(live.html),
      imgs: {
        local: (local.html.match(/<img\b/gi) || []).length,
        live: (live.html.match(/<img\b/gi) || []).length,
      },
      css: {
        local: (local.html.match(/<link[^>]+stylesheet/gi) || []).length,
        live: (live.html.match(/<link[^>]+stylesheet/gi) || []).length,
      },
      scripts: {
        local: (local.html.match(/<script[^>]+src=/gi) || []).length,
        live: (live.html.match(/<script[^>]+src=/gi) || []).length,
      },
      absRemoteWp: (local.html.match(/https?:\/\/(?:www\.)?izi\.ae\/wp-(?:content|includes)\//gi) || [])
        .length,
      htmlLen: { local: local.html.length, live: live.html.length },
      diskMissing: miss.length,
      diskMissingSample: miss.slice(0, 15),
      httpBrokenSample: broken.slice(0, 15),
      hasCf7: /wpcf7|wpcf7-form/i.test(local.html),
      hasOwl: /owl-carousel|owl\.carousel/i.test(local.html),
      hasSlick: /slick-/i.test(local.html),
      hasSwiper: /swiper/i.test(local.html),
      hasSelect2: /select2/i.test(local.html),
    };
    report.pages.push(row);
    const flag = !row.titleMatch || !row.h1Match || miss.length || broken.length || row.absRemoteWp
      ? 'DIFF'
      : 'OK';
    console.log(
      `${flag.padEnd(4)} ${path.padEnd(36)} title=${row.titleMatch} h1=${row.h1Match} miss=${miss.length} httpBroken=${broken.length} abs=${row.absRemoteWp} img L/V ${row.imgs.local}/${row.imgs.live}`,
    );
  }

  report.missingGlobal = [...report.missingGlobal].sort();
  console.log(`\nUnique disk-missing assets: ${report.missingGlobal.length}`);
  report.missingGlobal.slice(0, 40).forEach((u) => console.log('  ', u));

  const outDir = join(ROOT, 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'parity-audit.json'), JSON.stringify(report, null, 2));
  console.log('\nWrote docs/parity-audit.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
