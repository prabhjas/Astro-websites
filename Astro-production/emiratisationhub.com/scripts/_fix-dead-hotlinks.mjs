#!/usr/bin/env node
import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const full = join(ROOT, 'public/wp-content/uploads/2023/10/Benefits-of-Emiratisation-for-Businesses.jpg');
const as1024 = join(ROOT, 'public/wp-content/uploads/2023/10/Benefits-of-Emiratisation-for-Businesses-1024x576.jpg');
copyFileSync(full, as1024);

const replacements = [
  [
    '/wp-content/uploads/_external/connectgroup.co/baad2f5acc-emiratisation-3-1024x576.jpg',
    '/wp-content/uploads/2023/10/Benefits-of-Emiratisation-for-Businesses-1024x576.jpg',
  ],
  [
    '/wp-content/uploads/_external/connectgroup.co/9e79fb90db-emirati-sation-1024x576.jpg',
    '/wp-content/uploads/2023/10/Benefits-of-Emiratisation-for-Businesses-1024x576.jpg',
  ],
  [
    '/wp-content/uploads/_external/emiratisationnafis.org/497c19fe89-UAE-Probation-Period-1024x576.jpg',
    '/wp-content/uploads/2024/04/Probation-period-UAE-1024x576.jpg',
  ],
  [
    '/wp-content/uploads/_external/emiratisationnafis.org/39daeb5ea5-UAE-Period-of-Probation-1024x576.jpg',
    '/wp-content/uploads/2024/04/Probation-period-UAE-1024x576.jpg',
  ],
];

for (const rel of [
  'src/legacy/emiratisation-in-private-sector.cleaned.html',
  'src/legacy/what-is-probation-period-in-uae.cleaned.html',
]) {
  const file = join(ROOT, rel);
  let h = readFileSync(file, 'utf8');
  for (const [from, to] of replacements) h = h.split(from).join(to);
  writeFileSync(file, h);
  console.log(rel, 'externalLeft', (h.match(/_external\//g) || []).length);
}

function walk(d, acc = []) {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const extDir = join(ROOT, 'public/wp-content/uploads/_external');
if (existsSync(extDir)) {
  for (const p of walk(extDir)) {
    const b = readFileSync(p);
    if (b[0] === 0x3c) {
      rmSync(p);
      console.log('removed fake', p);
    }
  }
}

const check = [
  as1024,
  join(ROOT, 'public/wp-content/uploads/2024/04/Probation-period-UAE-1024x576.jpg'),
];
for (const p of check) {
  const b = readFileSync(p);
  console.log(p.split(/[/\\]/).pop(), b.length, b[0].toString(16), b[1].toString(16));
}
