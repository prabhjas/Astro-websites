#!/usr/bin/env node
const BASE = 'http://127.0.0.1:5121';
const html = await (await fetch(`${BASE}/`)).text();
const css = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/gi)].map((m) => m[1]);
const js = [...html.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map((m) => m[1]);
const all = [...css, ...js].map((u) => (u.startsWith('http') ? u : BASE + u));
const fail = [];
for (const u of all) {
  try {
    const r = await fetch(u);
    if (!r.ok) fail.push(`${r.status} ${u}`);
  } catch {
    fail.push(`ERR ${u}`);
  }
}
console.log('stylesheet+script checks', all.length, 'fails', fail.length);
fail.forEach((f) => console.log(f));

const live = await (await fetch('https://izi.ae/?nowprocket=1')).text();
const markers = [
  'owl-carousel',
  'slick',
  'select2',
  'intlTelInput',
  'elementorFrontendConfig',
  'wpcf7',
  'swiper',
  'datetimepicker',
  'countrySelect',
];
for (const m of markers) {
  console.log(m, html.includes(m) ? 'local' : 'NO', live.includes(m) ? 'live' : 'NO-live');
}

// Check CDN css used by live but maybe not local
const liveCdns = [...live.matchAll(/https?:\/\/(?:code\.jquery|cdnjs|cdn\.jsdelivr)[^"']+/gi)].map((m) => m[0]);
const localCdns = [...html.matchAll(/https?:\/\/(?:code\.jquery|cdnjs|cdn\.jsdelivr)[^"']+/gi)].map((m) => m[0]);
console.log('\nlive CDN refs', [...new Set(liveCdns)].length);
console.log('local CDN refs', [...new Set(localCdns)].length);
[...new Set(liveCdns)].forEach((u) => console.log(' LIVE', u));
[...new Set(localCdns)].forEach((u) => console.log(' LOCAL', u));
