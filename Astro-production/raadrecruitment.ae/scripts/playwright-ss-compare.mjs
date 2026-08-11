#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });

async function probe(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console:" + msg.text());
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const ss = document.querySelectorAll(".n2-ss-slider, [id^=n2-ss-]");
    const oil = document.querySelector('img[src*="Oil-and-gas"], img[data-src*="Oil-and-gas"]');
    const male = document.querySelector('img[src*="Male-01"], img[data-src*="Male-01"]');
    return {
      ssCount: ss.length,
      ssClasses: [...ss].slice(0, 5).map((el) => el.className?.toString?.().slice(0, 120)),
      hasN2: typeof window.n2 === "object" || typeof window.N2 === "function" || !!window._N2,
      n2Keys: Object.keys(window).filter((k) => /n2|smartslider|N2/i.test(k)).slice(0, 20),
      oil: oil
        ? {
            src: oil.getAttribute("src"),
            nw: oil.naturalWidth,
            rectX: oil.getBoundingClientRect().x,
            loading: oil.loading,
          }
        : null,
      male: male
        ? {
            src: male.getAttribute("src"),
            nw: male.naturalWidth,
            complete: male.complete,
          }
        : null,
    };
  });
  // scroll to industries-ish
  await page.evaluate(() => window.scrollTo(0, 4500));
  await page.waitForTimeout(1500);
  const afterScroll = await page.evaluate(() => {
    const oil = document.querySelector('img[src*="Oil-and-gas"]');
    return oil
      ? { nw: oil.naturalWidth, x: oil.getBoundingClientRect().x, complete: oil.complete }
      : null;
  });
  await page.screenshot({ path: `scripts/_cmp-${label}.png`, fullPage: false });
  await page.close();
  return { label, url, info, afterScroll, errors: errors.slice(0, 30) };
}

const local = await probe("http://127.0.0.1:5113/", "local");
const live = await probe("https://raadrecruitment.ae/", "live");
const out = { local, live };
fs.writeFileSync("scripts/_ss-compare.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
