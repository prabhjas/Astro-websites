#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const BASE = process.env.CBC_BASE || 'http://127.0.0.1:5116';
const pages = process.argv.slice(2);
const paths = pages.length ? pages : ['/', '/about-us/', '/executive-office/', '/insights/', '/contact-us/'];

async function checkPage(path) {
  const res = await fetch(BASE + path);
  const html = await res.text();
  const assets = new Set();
  for (const m of html.matchAll(/\b(?:src|data-src|data-lazy-src|data-bg)=["']([^"']+)["']/gi)) {
    assets.add(m[1].split('?')[0]);
  }
  for (const m of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) assets.add(u.split('?')[0]);
    }
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    const u = m[1].split('?')[0];
    if (u.includes('/wp-content/') || /\.(png|jpe?g|webp|gif|svg|css)($)/i.test(u)) assets.add(u);
  }

  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const placeholderImgs = imgTags.filter((t) => /data:image\/svg\+xml/i.test(t) || /\bsrc=["']["']/i.test(t));
  const lazyOnly = imgTags.filter((t) => /data-lazy-src=/i.test(t) && !/\bsrc=["'][^"']+\.(png|jpe?g|webp|gif|svg)/i.test(t));

  const localAssets = [...assets].filter((u) => u.startsWith('/') || u.includes('connectbusinesscenter.com'));
  const results = [];
  for (const u of localAssets) {
    let pathOnly = u.replace(/^https?:\/\/(?:www\.)?connectbusinesscenter\.com/i, '');
    if (!pathOnly.startsWith('/')) continue;
    if (pathOnly.includes('*')) continue;
    try {
      const r = await fetch(BASE + pathOnly, { method: 'HEAD', redirect: 'manual' });
      if (r.status !== 200) results.push({ path: pathOnly, status: r.status });
    } catch (e) {
      results.push({ path: pathOnly, status: 'err', err: String(e.message || e) });
    }
  }

  return {
    page: path,
    status: res.status,
    imgTags: imgTags.length,
    placeholderImgs: placeholderImgs.length,
    lazyOnlyWithoutRealSrc: lazyOnly.length,
    assetRefs: localAssets.length,
    httpNot200: results.slice(0, 40),
    httpNot200Count: results.length,
    samplePlaceholders: placeholderImgs.slice(0, 3).map((t) => t.slice(0, 180)),
    sampleLazyOnly: lazyOnly.slice(0, 3).map((t) => t.slice(0, 180)),
  };
}

const out = [];
for (const p of paths) out.push(await checkPage(p));
console.log(JSON.stringify(out, null, 2));
writeFileSync(new URL('../source/served-asset-probe.json', import.meta.url), JSON.stringify(out, null, 2));
