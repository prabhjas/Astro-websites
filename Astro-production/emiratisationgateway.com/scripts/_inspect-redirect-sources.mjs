import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base =
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/.tmp-xlsx/out/xl';
if (!existsSync(base)) {
  console.error('xlsx not extracted at', base);
  process.exit(1);
}

const ssXml = readFileSync(join(base, 'sharedStrings.xml'), 'utf8');
const ss = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => {
  const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]);
  return texts.join('');
});
console.log('sharedStrings', ss.length);

const sheet = readFileSync(join(base, 'worksheets/sheet1.xml'), 'utf8');
const rows = [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];

function cellVal(cXml) {
  const t = (cXml.match(/\st="([^"]+)"/) || [])[1];
  const v = (cXml.match(/<v>([^<]*)<\/v>/) || [])[1];
  if (v == null) return '';
  if (t === 's') return ss[Number(v)] || '';
  return v;
}

const parsed = [];
for (const r of rows) {
  const cells = [...r[1].matchAll(/<c[\s\S]*?(?:\/>|>([\s\S]*?)<\/c>)/g)].map((m) =>
    cellVal(m[0]),
  );
  parsed.push(cells);
}
console.log('rows', parsed.length);
for (const r of parsed.slice(0, 30)) console.log(JSON.stringify(r));

writeFileSync(
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/.tmp-emiratisation-redirects.json',
  JSON.stringify(parsed, null, 2),
);
