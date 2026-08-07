import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const legacyDir =
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/src/legacy';
let files = 0;
let hits = 0;
for (const f of readdirSync(legacyDir)) {
  if (!f.endsWith('.cleaned.html')) continue;
  const p = join(legacyDir, f);
  let s = readFileSync(p, 'utf8');
  const n = (s.match(/class="elementor-accordion-title" tabindex="0"/g) || []).length;
  if (!n) continue;
  s = s.replace(
    /class="elementor-accordion-title" tabindex="0"/g,
    'class="elementor-accordion-title" tabindex="-1"',
  );
  writeFileSync(p, s);
  files += 1;
  hits += n;
}
console.log(JSON.stringify({ files, hits }));
