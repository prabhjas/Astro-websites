import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const VER = '20260806-flag2';
const root = process.cwd();
const jsSrc = join(root, 'public/js/astro-mirror-fixes.js');
const js = readFileSync(jsSrc, 'utf8');

if (!js.includes('separateDialCode needs display:table')) {
  console.error('CSS fix missing from public JS');
  process.exit(1);
}

copyFileSync(jsSrc, join(root, 'dist/client/js/astro-mirror-fixes.js'));

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
console.log({ bumped: n, ver: VER, hasTableFix: true });
