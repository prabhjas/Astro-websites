#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.env.BASE || "http://127.0.0.1:5113";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failed = [];
const fonts = [];
const images = [];

page.on("response", async (res) => {
  const url = res.url();
  const status = res.status();
  const ct = (res.headers()["content-type"] || "").toLowerCase();
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url) || ct.includes("font")) {
    fonts.push({ status, url: url.replace(base, ""), ct });
    if (status >= 400) failed.push({ type: "font", status, url });
  }
  if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url) || ct.startsWith("image/")) {
    images.push({ status, url: url.replace(base, ""), ct });
    if (status >= 400) failed.push({ type: "image", status, url });
  }
  if (/\.css(\?|$)/i.test(url) && status >= 400) {
    failed.push({ type: "css", status, url });
  }
});

page.on("requestfailed", (req) => {
  failed.push({
    type: "requestfailed",
    url: req.url(),
    error: req.failure()?.errorText,
  });
});

await page.goto(base + "/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);

const computed = await page.evaluate(() => {
  const body = getComputedStyle(document.body);
  const h1 = document.querySelector("h1, .elementor-heading-title, .entry-title");
  const img = document.querySelector("img");
  const imgs = [...document.querySelectorAll("img")].slice(0, 30).map((el) => ({
    src: el.currentSrc || el.src,
    naturalWidth: el.naturalWidth,
    complete: el.complete,
    display: getComputedStyle(el).display,
  }));
  return {
    bodyFont: body.fontFamily,
    h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
    h1Text: h1?.textContent?.trim().slice(0, 80) || null,
    firstImg: img
      ? { src: img.currentSrc || img.src, w: img.naturalWidth, h: img.naturalHeight }
      : null,
    zeroSizeImages: imgs.filter((i) => i.naturalWidth === 0),
    logoOk: imgs.some((i) => i.src.includes("logo") && i.naturalWidth > 0),
  };
});

await page.screenshot({
  path: "scripts/_home-screenshot.png",
  fullPage: false,
});

const report = {
  failed: failed.slice(0, 50),
  failedCount: failed.length,
  fontResponses: fonts.slice(0, 20),
  imageFailCount: images.filter((i) => i.status >= 400).length,
  imageOkCount: images.filter((i) => i.status < 400).length,
  computed,
};
fs.writeFileSync("scripts/_playwright-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
