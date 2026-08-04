import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync('src/legacy/homepage.cleaned.html', 'utf8');
const urls = new Set();
for (const m of html.matchAll(/(?:src|href)=["'](\/[^"'#?]+)/gi)) {
  urls.add(m[1].split('?')[0]);
}
for (const m of html.matchAll(/url\(["']?(\/[^"')]+)/gi)) {
  urls.add(m[1].split('?')[0]);
}

let missing = 0;
let present = 0;
const miss = [];
for (const u of urls) {
  if (!u.startsWith('/wp-') && !u.startsWith('/chrome') && !u.startsWith('/js')) continue;
  const p = join('public', ...u.split('/').filter(Boolean));
  if (existsSync(p)) present += 1;
  else {
    missing += 1;
    miss.push(u);
  }
}

const report = { refsChecked: present + missing, present, missing, miss };
console.log(JSON.stringify({ present, missing }, null, 2));
writeFileSync('.tmp-missing-assets.json', JSON.stringify(report, null, 2));
console.log(miss.slice(0, 50).join('\n'));
