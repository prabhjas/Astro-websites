#!/usr/bin/env node
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5113/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.querySelector('img[src*="Oil-and-gas"]')?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(600);
await page.screenshot({ path: "scripts/_industries-fixed.png" });
await page.evaluate(() => {
  const h = [...document.querySelectorAll("h2,h3,.elementor-heading-title")].find((el) =>
    /RECRUITMENT SERVICES/i.test(el.textContent || ""),
  );
  h?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/_services-fixed.png" });
const loaded = await page.evaluate(() => ({
  ssLoaded: !!document.querySelector(".n2-ss-slider.n2-ss-loaded"),
  oil: (() => {
    const i = document.querySelector('img[src*="Oil-and-gas"]');
    return i && { nw: i.naturalWidth, x: Math.round(i.getBoundingClientRect().x) };
  })(),
}));
console.log(loaded);
await browser.close();
