import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'd:/Astro-websites/Astro-production/izi.ae/src/legacy';
const hosts = new Map();

function walk(d) {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name);
    if (n.isDirectory()) walk(p);
    else if (n.name.endsWith('.cleaned.html')) {
      const t = readFileSync(p, 'utf8');
      for (const m of t.matchAll(/https?:\/\/(redo\.ae|i\.ytimg\.com|car\.bloggerplex\.top)[^"'\s>]*/gi)) {
        const u = m[0];
        hosts.set(u, (hosts.get(u) || 0) + 1);
      }
    }
  }
}
walk(ROOT);
const arr = [...hosts.entries()].sort((a, b) => b[1] - a[1]);
console.log('unique', arr.length);
for (const [u, c] of arr.slice(0, 50)) console.log(c, u);
