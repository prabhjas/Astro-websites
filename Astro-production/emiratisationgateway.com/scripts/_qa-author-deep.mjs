/**
 * Deep author layout comparison: profile section structure + CSS gaps.
 */
function section(html, startMarker, len = 4000) {
  const i = html.indexOf(startMarker);
  if (i < 0) return null;
  return html.slice(i, i + len);
}

function normalize(s) {
  return s
    .replace(/https:\/\/emiratisationgateway\.com/g, '')
    .replace(/GTM-[A-Z0-9]+/g, 'GTM')
    .replace(/\s+/g, ' ')
    .trim();
}

const path = '/author/binju-t-r/';
const L = await (await fetch('http://127.0.0.1:5106' + path)).text();
const R = await (await fetch('https://emiratisationgateway.com' + path)).text();

for (const marker of ['elementor-element-58abf12', 'main-auth', 'auth-box', 'ecs-posts', 'ast-pagination']) {
  const l = section(L, marker, 1200);
  const r = section(R, marker, 1200);
  console.log('\n===', marker, '===');
  console.log('L present', !!l, 'R present', !!r);
  if (l && r) {
    const ln = normalize(l).slice(0, 500);
    const rn = normalize(r).slice(0, 500);
    console.log('equal?', ln === rn);
    if (ln !== rn) {
      console.log('L:', ln.slice(0, 350));
      console.log('R:', rn.slice(0, 350));
    }
  }
}

// Check if author CSS from Elementor post CSS is missing locally
const lCss = [...L.matchAll(/elementor\/css\/post-(\d+)\.css/g)].map((m) => m[1]);
const rCss = [...R.matchAll(/elementor\/css\/post-(\d+)\.css/g)].map((m) => m[1]);
console.log('\nElementor CSS posts L', [...new Set(lCss)].sort());
console.log('Elementor CSS posts R', [...new Set(rCss)].sort());

// Check missing local CSS files
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com/public';
for (const id of [...new Set([...lCss, ...rCss])]) {
  const p = join(root, `wp-content/uploads/elementor/css/post-${id}.css`);
  console.log(`post-${id}.css`, existsSync(p) ? 'OK' : 'MISSING');
}

// Author directory cards
const Ld = await (await fetch('http://127.0.0.1:5106/author/')).text();
const Rd = await (await fetch('https://emiratisationgateway.com/author/')).text();
const card = (h) => {
  const i = h.indexOf('auth-box');
  return i < 0 ? null : normalize(h.slice(i, i + 2500)).slice(0, 800);
};
console.log('\nDIR L card', card(Ld));
console.log('\nDIR R card', card(Rd));
console.log('DIR equal?', card(Ld) === card(Rd));
