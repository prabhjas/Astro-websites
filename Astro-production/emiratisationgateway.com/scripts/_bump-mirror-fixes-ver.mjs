import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const VER = '20260806-faq2';
const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';
let n = 0;

function bump(file) {
  let s = readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(
    /\/js\/astro-mirror-fixes\.js(?:\?v=[^"']*)?/g,
    `/js/astro-mirror-fixes.js?v=${VER}`,
  );
  if (s !== before) {
    writeFileSync(file, s);
    n += 1;
  }
}

const legacy = join(root, 'src/legacy');
for (const f of readdirSync(legacy)) {
  if (f.endsWith('.cleaned.html')) bump(join(legacy, f));
}
bump(join(root, 'src/pages/blog.astro'));

// nested author mirrors if any
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name.endsWith('.cleaned.html') || name.name.endsWith('.html')) bump(p);
  }
}
try {
  walk(join(legacy, 'author'));
} catch {}
try {
  walk(join(legacy, 'author-shell'));
} catch {}
try {
  walk(join(legacy, 'category-shell'));
} catch {}

console.log('bumped files', n, 'ver', VER);
