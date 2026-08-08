import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(ROOT, 'public/wp-content/uploads/2024/10/iconoir_arrow-left.svg');

const urls = [
  'https://emiratisationhub.com/wp-content/uploads/2024/10/iconoir_arrow-left.svg',
];

for (const u of urls) {
  const res = await fetch(u, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/svg+xml,*/*' },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const t = buf.slice(0, 120).toString('utf8');
  console.log(res.status, buf.length, t.slice(0, 80).replace(/\n/g, ' '));
  if (res.ok && (t.includes('<svg') || t.includes('<?xml')) && !/html/i.test(t.slice(0, 30))) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    console.log('saved real svg');
    process.exit(0);
  }
}

const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="34" viewBox="0 0 24 24" fill="none" stroke="#23369b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
`;
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, fallback);
console.log('wrote fallback arrow svg');
