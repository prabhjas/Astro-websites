#!/usr/bin/env node
const base = process.argv[2] || 'http://127.0.0.1:5112/';
const html = await (await fetch(base)).text();
const abs = [...html.matchAll(/https?:\/\/(?:www\.)?lladesigners\.com[^"'\\s)<]*/gi)].map((m) => m[0]);
console.log('count', abs.length);
console.log([...new Set(abs)].join('\n'));

// Check a few critical CSS/JS on local
const assets = [
  '/wp-content/uploads/2024/01/Logo-new-1.png',
  '/wp-content/uploads/2024/01/Logo-white-1.png',
  '/wp-content/uploads/2024/03/New-banner.jpg',
  '/js/astro-mirror-fixes.js',
  '/runtime-gtm.js',
];
for (const a of assets) {
  const r = await fetch(new URL(a, 'http://127.0.0.1:5112').href);
  console.log(r.status, a, r.headers.get('content-type'));
}

// Sample post
const post = await fetch('http://127.0.0.1:5112/importance-of-lighting-in-interior-design/');
const ph = await post.text();
const title = (ph.match(/<title[^>]*>([^<]+)/i) || [])[1];
console.log('post', post.status, title?.trim());

// Portfolio deep: data-src / background images
const port = await (await fetch('http://127.0.0.1:5112/portfolio/')).text();
const bg = (port.match(/background-image|data-src|data-bg|swiper/gi) || []).length;
const livePort = await (await fetch('https://lladesigners.com/portfolio/')).text();
const liveBg = (livePort.match(/background-image|data-src|data-bg|swiper/gi) || []).length;
console.log('portfolio markers local/live', bg, liveBg);
