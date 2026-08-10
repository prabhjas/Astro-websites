const pages = ['/', '/blog/', '/author/nakul/', '/what-is-emiratisation/'];
for (const p of pages) {
  const html = await (await fetch('http://127.0.0.1:5107' + p)).text();
  const nav = [...html.matchAll(/<(a)\b[^>]*\bhref=(["'])(https:\/\/(?:www\.)?emiratisationhub\.com[^"']*)\2/gi)].map(
    (m) => m[3],
  );
  console.log(p, 'anchor abs:', [...new Set(nav)]);
}

// Missing images on homepage vs live (sample)
const home = await (await fetch('http://127.0.0.1:5107/')).text();
const imgs = [...home.matchAll(/\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]).filter((s) => s.startsWith('/'));
let missing = 0;
for (const src of [...new Set(imgs)]) {
  const res = await fetch('http://127.0.0.1:5107' + src, { method: 'HEAD' });
  if (!res.ok) {
    missing++;
    if (missing <= 15) console.log('missing', res.status, src);
  }
}
console.log('unique img srcs', new Set(imgs).size, 'missing', missing);

// Author profile posts
const a = await (await fetch('http://127.0.0.1:5107/author/nakul/')).text();
console.log('nakul post cards', (a.match(/emiratisationhub-author-post|elementor-post\b|e-loop-item/g) || []).length);
console.log('nakul has name', a.includes('Nakul'));
