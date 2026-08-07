import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const legacy = join(ROOT, 'src/legacy');
const missing = new Map();

for (const f of readdirSync(legacy).filter((x) => x.endsWith('.cleaned.html'))) {
  const html = readFileSync(join(legacy, f), 'utf8');
  for (const m of html.matchAll(/(?:src|href|srcset)=["']([^"']+)["']/gi)) {
    const vals = m[1].split(',').map((s) => s.trim().split(/\s+/)[0]);
    for (let v of vals) {
      if (!v.startsWith('/wp-content/') && !v.startsWith('/wp-includes/')) continue;
      v = v.split('?')[0].split('#')[0];
      const disk = join(ROOT, 'public', v.slice(1));
      if (!existsSync(disk)) {
        if (!missing.has(v)) missing.set(v, new Set());
        missing.get(v).add(f);
      }
    }
  }
  // url(...) in inline styles / CSS links already separate
  for (const m of html.matchAll(/url\(\s*['"]?(\/wp-content\/[^'")\s]+)['"]?\s*\)/gi)) {
    const v = m[1].split('?')[0].split('#')[0];
    const disk = join(ROOT, 'public', v.slice(1));
    if (!existsSync(disk)) {
      if (!missing.has(v)) missing.set(v, new Set());
      missing.get(v).add(f);
    }
  }
}

const list = [...missing.entries()].map(([path, files]) => ({
  path,
  files: [...files],
}));
writeFileSync(join(ROOT, '.tmp-missing-assets.json'), JSON.stringify(list, null, 2));
console.log('missing assets:', list.length);
for (const row of list.slice(0, 50)) {
  console.log(row.path, '←', row.files.slice(0, 3).join(','));
}
