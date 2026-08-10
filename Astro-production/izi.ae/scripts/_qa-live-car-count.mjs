#!/usr/bin/env node
import { chromium } from 'playwright';

async function countRaw(path) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // stop before much JS? use commit + content early
  await page.goto('https://izi.ae' + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(500);
  const html = await page.content();
  const ids = [...html.matchAll(/data-id="(\d+)" class="car-wrap/g)].map((m) => m[1]);
  await browser.close();
  return { path, count: ids.length, ids };
}

for (const path of [
  '/filter-screen/',
  '/filter-screen/?vehicle_type=SUV',
  '/filter-screen/?filterlocation=Dubai',
  '/filter-screen/?filterlocation=Abu-Dhabi',
]) {
  console.log(await countRaw(path));
}
