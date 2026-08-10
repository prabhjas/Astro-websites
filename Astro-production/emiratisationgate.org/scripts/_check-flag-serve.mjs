import { readFileSync } from 'node:fs';

const texts = {
  legacy: readFileSync('src/lib/legacy-page.js', 'utf8'),
  blog: readFileSync('src/pages/blog.astro', 'utf8'),
  mirror: readFileSync('public/js/astro-mirror-fixes.js', 'utf8'),
  dist: readFileSync('dist/client/js/astro-mirror-fixes.js', 'utf8'),
};

for (const [k, s] of Object.entries(texts)) {
  const m = s.match(/astro-mirror-fixes\.js\?v=[^\s"']+/g);
  console.log(k, {
    versions: [...new Set(m || [])],
    siblingFix: s.includes('sibling of the phone'),
    badCss: s.includes(':not(.intl-tel-input .flag-container)'),
  });
}

const home = await fetch('http://127.0.0.1:5105/').then((r) => r.text());
const vm = home.match(/astro-mirror-fixes\.js[^"'<\s]*/);
console.log('served home', vm && vm[0]);

const js = await fetch('http://127.0.0.1:5105/js/astro-mirror-fixes.js?v=20260806-flag1').then(async (r) => ({
  status: r.status,
  sibling: (await r.text()).includes('sibling of the phone'),
}));
console.log('flag1 asset', js);

const geo = await fetch('http://127.0.0.1:5105/api/geo/country/').then(async (r) => ({
  status: r.status,
  body: await r.text(),
}));
console.log('geo', geo);
