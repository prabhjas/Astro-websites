import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/legacy');
const files = readdirSync(dir).filter((f) => f.endsWith('.cleaned.html'));

function scrub(html) {
  let out = html;
  out = out.replace(
    /<\/select>\s*<span class="select2 select2-container[\s\S]*?<span class="dropdown-wrapper"[^>]*><\/span><\/span>/gi,
    '</select>',
  );
  out = out.replace(/\sselect2-hidden-accessible/gi, '');
  out = out.replace(/\sdata-select2-id="[^"]*"/gi, '');
  out = out.replace(/(<select\b[^>]*\bclass="[^"]*\bselect2\b[^"]*"[^>]*)\stabindex="-1"/gi, '$1');
  out = out.replace(/(<select\b[^>]*\bclass="[^"]*\bselect2\b[^"]*"[^>]*)\saria-hidden="true"/gi, '$1');
  return out;
}

for (const f of files) {
  const p = join(dir, f);
  const before = readFileSync(p, 'utf8');
  const countBefore = (before.match(/select2 select2-container/g) || []).length;
  if (!countBefore && !before.includes('select2-hidden-accessible')) continue;
  const after = scrub(before);
  const countAfter = (after.match(/select2 select2-container/g) || []).length;
  writeFileSync(p, after);
  console.log(f, { countBefore, countAfter });
}
