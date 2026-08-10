import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const VER = '20260806-flag1';
const root = 'd:/Astro-websites/Astro-production/emiratisationgate.org';
let n = 0;

function bump(file) {
  let s = readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/\/js\/astro-mirror-fixes\.js(?:\?v=[^"']*)?/g, `/js/astro-mirror-fixes.js?v=${VER}`);
  if (s !== before) {
    writeFileSync(file, s);
    n += 1;
  }
}

function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (/\.(cleaned\.html|html|astro|js|ts)$/.test(name.name)) bump(p);
  }
}

walk(join(root, 'src'));
copyFileSync(join(root, 'public/js/astro-mirror-fixes.js'), join(root, 'dist/client/js/astro-mirror-fixes.js'));
const js = readFileSync(join(root, 'public/js/astro-mirror-fixes.js'), 'utf8');
console.log({
  bumped: n,
  ver: VER,
  hasSiblingFix: js.includes('sibling of the phone input'),
  stillBroadRemove: js.includes(".wpcf7 .flag-container, .wpcf7 .intl-tel-input"),
});
