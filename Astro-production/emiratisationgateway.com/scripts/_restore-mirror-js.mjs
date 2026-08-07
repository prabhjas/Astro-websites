import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';
const destDir = join(root, 'dist/client/js');
mkdirSync(destDir, { recursive: true });

const pubJs = join(root, 'public/js');
for (const f of readdirSync(pubJs, { withFileTypes: true })) {
  if (!f.isFile()) continue;
  copyFileSync(join(pubJs, f.name), join(destDir, f.name));
  console.log('copied', f.name, statSync(join(destDir, f.name)).size);
}

for (const u of [
  'http://127.0.0.1:5106/js/astro-mirror-fixes.js',
  'http://127.0.0.1:5106/js/astro-mirror-fixes.js?v=20260806-faq2',
  'http://127.0.0.1:5106/js/cf-email-decode.js',
  'http://127.0.0.1:5106/wp-content/uploads/2023/10/logo-Emiratization-Gateway_normal-227x50.png',
]) {
  const r = await fetch(u);
  const t = await r.arrayBuffer();
  const head = Buffer.from(t.slice(0, 40)).toString('utf8');
  console.log(r.status, t.byteLength, head.slice(0, 30).replace(/\n/g, ' '), u.split('.com')[0] || u);
}

const html = await (await fetch('http://127.0.0.1:5106/')).text();
console.log('homepage script', (html.match(/astro-mirror-fixes\.js[^"']*/) || [])[0]);
console.log('tab -1', (html.match(/elementor-accordion-title" tabindex="-1"/g) || []).length);
const js = await (await fetch('http://127.0.0.1:5106/js/astro-mirror-fixes.js?v=20260806-faq2')).text();
console.log({
  kill: js.includes('Kill dotted'),
  blur: js.includes('Drop browser focus ring'),
  tab: js.includes("setAttribute('tabindex', '-1')"),
});
