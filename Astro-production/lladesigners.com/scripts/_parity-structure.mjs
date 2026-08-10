#!/usr/bin/env node
/**
 * Structural parity: live lladesigners.com vs local :5112
 */
const pages = [
  '/',
  '/about-us/',
  '/contact-us/',
  '/services/',
  '/portfolio/',
  '/our-blogs/',
  '/interior-design/',
  '/architecture-design-services/',
  '/lighting-design/',
  '/procurement/',
];

async function probe(base, path) {
  const res = await fetch(base + path, {
    redirect: 'follow',
    headers: { 'User-Agent': 'lla-parity/0.1' },
  });
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [])[1] || '';
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)/gi)].map((m) => m[1]);
  const css = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/gi)].map((m) => m[1]);
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map((m) => m[1]);
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]
    ?.replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  const hasForm = /wpcf7|contact-form|name=["']your-/i.test(html);
  const hasLogo = /Logo-new-1\.png|Logo-white/i.test(html);
  const absLiveLeft = (html.match(/https?:\/\/(?:www\.)?lladesigners\.com\/wp-content/gi) || []).length;
  const missingAssetHints = imgs.filter((s) => s.includes('undefined') || s.includes('null')).length;
  return {
    status: res.status,
    title: title.trim().slice(0, 80),
    h1,
    imgs: imgs.length,
    css: css.length,
    scripts: scripts.length,
    hasForm,
    hasLogo,
    absLiveLeft,
    missingAssetHints,
    len: html.length,
  };
}

async function checkAssets(base, path) {
  const res = await fetch(base + path, { headers: { 'User-Agent': 'lla-parity/0.1' } });
  const html = await res.text();
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)=["'](\/wp-content\/[^"'?#]+)/gi)) {
    urls.add(m[1].split('?')[0]);
  }
  const sample = [...urls].slice(0, 40);
  let ok = 0;
  let fail = [];
  await Promise.all(
    sample.map(async (u) => {
      try {
        const r = await fetch(base + u, { method: 'HEAD' });
        if (r.ok) ok++;
        else fail.push(`${r.status} ${u}`);
      } catch (e) {
        fail.push(`ERR ${u}`);
      }
    }),
  );
  return { sampled: sample.length, ok, fail: fail.slice(0, 10) };
}

const live = 'https://lladesigners.com';
const local = 'http://127.0.0.1:5112';

console.log('=== page parity ===');
for (const p of pages) {
  const L = await probe(live, p);
  const C = await probe(local, p);
  console.log(
    JSON.stringify({
      path: p,
      status: { live: L.status, local: C.status },
      titleMatch: L.title === C.title,
      h1Match: L.h1 === C.h1,
      liveTitle: L.title,
      localTitle: C.title,
      liveH1: L.h1,
      localH1: C.h1,
      imgs: { live: L.imgs, local: C.imgs },
      hasForm: { live: L.hasForm, local: C.hasForm },
      hasLogo: { live: L.hasLogo, local: C.hasLogo },
      absLiveLeftOnLocal: C.absLiveLeft,
      len: { live: L.len, local: C.len },
    }),
  );
}

console.log('\n=== homepage local asset sample ===');
console.log(JSON.stringify(await checkAssets(local, '/'), null, 2));
