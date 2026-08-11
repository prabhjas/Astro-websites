#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const h = fs.readFileSync('src/legacy/filter-screen.cleaned.html', 'utf8');
const cards = (h.match(/class="car-wrap get-infodata filter/g) || []).length;
const ids = [...h.matchAll(/data-id="(\d+)" class="car-wrap/g)].map((m) => m[1]);
console.log('local cleaned cards', cards, 'ids', ids);

const urls = [
  '/filter-screen/?vehicle_type=SUV',
  '/filter-screen/?vehicle_type=Sedan',
  '/filter-screen/?make=Toyota',
  '/filter-screen/?make=BMW',
  '/filter-screen/?experience=Electric',
  '/filter-screen/?experience=Deluxe',
  '/filter-screen/?filterlocation=Dubai',
  '/filter-screen/?filterlocation=Abu-Dhabi',
  '/filter-screen/?make=Nissan&vehicle_type=SUV',
];

const b = await chromium.launch();
async function vis(origin, path) {
  const p = await b.newPage();
  await p.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2800);
  const m = await p.evaluate(() => {
    const all = [...document.querySelectorAll('.filter.car-wrap')];
    const visible = all.filter(
      (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 10,
    );
    return {
      total: all.length,
      visible: visible.length,
      keys: visible.map((el) => el.getAttribute('data-make') + '/' + el.getAttribute('data-vehicle')).sort(),
    };
  });
  await p.close();
  return m;
}

let fail = 0;
for (const path of urls) {
  const local = await vis('http://127.0.0.1:5121', path);
  const live = await vis('https://izi.ae', path);
  const ok =
    local.visible === live.visible &&
    JSON.stringify(local.keys) === JSON.stringify(live.keys);
  // allow total drift if visible set matches (inventory flapping on live)
  if (!ok) fail++;
  console.log(
    (ok ? 'PASS' : 'FAIL'),
    path,
    'L',
    `${local.visible}/${local.total}`,
    'V',
    `${live.visible}/${live.total}`,
    ok ? '' : `local=[${local.keys}] live=[${live.keys}]`,
  );
}
await b.close();
process.exitCode = fail ? 1 : 0;
