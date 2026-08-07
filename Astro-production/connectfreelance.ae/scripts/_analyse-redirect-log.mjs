import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseRankMathRedirectImport } from '../../../../packages/site-cms/src/runtime-redirects/store.ts';

const ROOT = path.resolve('d:/Astro-websites/Astro-production/connectfreelance.ae');
const AUG5 = 'c:/Users/Tabish/Downloads/redirection-log-August 5, 2026.csv';
const AUG3 = 'c:/Users/Tabish/Downloads/redirection-log-August 3, 2026.csv';
const AUG4 = 'c:/Users/Tabish/Downloads/redirection-log-August 4, 2026.csv';

function analyseLog(file, label) {
  const raw = fs.readFileSync(file, 'utf8');
  console.log('\n===', label, '===');
  console.log('bytes', raw.length, 'lines', raw.trim().split(/\n/).length);
  const parsed = parseRankMathRedirectImport(raw);
  console.log('parser rules', parsed.length);
  if (parsed.length) {
    console.log(parsed.slice(0, 15).map((r) => `${r.from} -> ${r.to}`).join('\n'));
  }
  // also unique hit pairs ignoring ip
  const lines = raw.trim().split(/\r?\n/).slice(1);
  const map = new Map();
  for (const line of lines) {
    const m = line.match(/^"?(.*?)"?,"?(.*?)"?,"?(.*?)"?,/);
    if (!m) continue;
    let source = m[2];
    let target = m[3];
    try {
      if (/^https?:/i.test(source)) source = new URL(source).pathname;
      if (/^https?:/i.test(target)) {
        const u = new URL(target);
        target = u.origin.includes('connectfreelance.ae')
          ? u.pathname + u.search
          : target; // keep absolute external
      }
    } catch {}
    if (!source.startsWith('/')) continue;
    const key = source.replace(/\/$/, '') || '/';
    map.set(key, { from: key === '/' ? '/' : key + '/', to: target });
  }
  console.log('unique hit sources', map.size);
  const hosts = {};
  for (const r of map.values()) {
    if (/^https?:/i.test(r.to)) {
      const h = new URL(r.to).hostname;
      hosts[h] = (hosts[h] || 0) + 1;
    }
  }
  console.log('external target hosts', hosts);
  return { parsed, hits: [...map.values()] };
}

const yml = parseYaml(fs.readFileSync(path.join(ROOT, 'src/data/redirects.yml'), 'utf8'));
const existing = yml.redirects || [];
console.log('existing yaml rules', existing.length);
const froms = existing.map((r) => r.from);
const dupExact = froms.filter((f, i) => froms.indexOf(f) !== i);
console.log('exact duplicate froms', dupExact);

// slash twin pairs
const twins = [];
for (const r of existing) {
  if (r.from.endsWith('/') && r.from !== '/') {
    const bare = r.from.slice(0, -1);
    const twin = existing.find((x) => x.from === bare);
    if (twin) twins.push([r.from, bare, r.to, twin.to]);
  }
}
console.log('slash/bare twin pairs', twins.length);

analyseLog(AUG5, 'Aug 5 (user file)');
analyseLog(AUG4, 'Aug 4');
const a3 = analyseLog(AUG3, 'Aug 3');

// How many Aug3 hit targets are on connectfreelance domain paths that exist?
const cfHits = a3.hits.filter((h) => !/^https?:/i.test(h.to) || /connectfreelance\.ae/i.test(h.to));
console.log('\nAug3 path-only or CF absolute hits', cfHits.length);
console.log(cfHits.slice(0, 20).map((h) => `${h.from} -> ${h.to}`).join('\n'));
