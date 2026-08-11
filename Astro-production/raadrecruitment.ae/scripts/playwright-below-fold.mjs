#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";

const base = process.env.BASE || "http://127.0.0.1:5113";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const responses = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!/\.(png|jpe?g|webp|gif|svg|woff2?)(\?|$)/i.test(url) && !url.includes("/wp-content/uploads/")) return;
  const status = res.status();
  const ct = (res.headers()["content-type"] || "").toLowerCase();
  const buf = status === 200 ? await res.body().catch(() => null) : null;
  const head = buf ? buf.slice(0, 20).toString("utf8") : "";
  const isHtml =
    ct.includes("text/html") || head.startsWith("<!DOCTYPE") || head.startsWith("<html");
  responses.push({
    status,
    ct,
    isHtml,
    bytes: buf?.length ?? 0,
    url: url.replace(base, ""),
  });
});

await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });

// Scroll whole page slowly to trigger lazy load
for (let y = 0; y < 8000; y += 400) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(200);
}
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const report = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("img")].map((el) => {
    const cs = getComputedStyle(el);
    return {
      src: el.getAttribute("src"),
      currentSrc: el.currentSrc,
      dataSrc: el.getAttribute("data-src") || el.getAttribute("data-lazy-src"),
      srcset: el.getAttribute("srcset")?.slice(0, 120) || null,
      loading: el.getAttribute("loading"),
      classes: el.className?.toString?.().slice(0, 120) || "",
      naturalWidth: el.naturalWidth,
      complete: el.complete,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      w: el.clientWidth,
      h: el.clientHeight,
    };
  });

  // background images on elements
  const bgHits = [];
  for (const el of document.querySelectorAll("*")) {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") continue;
    const urls = [...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    for (const u of urls) {
      if (/wp-content|uploads|\.(png|jpe?g|webp|gif|svg)/i.test(u)) {
        bgHits.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString?.() || "").slice(0, 80),
          url: u,
        });
      }
    }
  }

  return {
    brokenImgs: imgs.filter((i) => i.naturalWidth === 0),
    okImgs: imgs.filter((i) => i.naturalWidth > 0).length,
    totalImgs: imgs.length,
    sampleBroken: imgs.filter((i) => i.naturalWidth === 0).slice(0, 25),
    bgCount: bgHits.length,
    bgSample: bgHits.slice(0, 40),
  };
});

// Verify each broken src via fetch in page
const brokenUrls = [
  ...new Set(
    report.sampleBroken
      .map((i) => i.currentSrc || i.src || i.dataSrc)
      .filter(Boolean)
  ),
];
const urlChecks = [];
for (const u of brokenUrls.slice(0, 40)) {
  try {
    const r = await page.request.get(u);
    const ct = r.headers()["content-type"] || "";
    const body = await r.body();
    const head = body.slice(0, 15).toString("utf8");
    urlChecks.push({
      u: u.replace(base, ""),
      status: r.status(),
      ct,
      bytes: body.length,
      looksHtml: head.startsWith("<!") || head.startsWith("<html"),
    });
  } catch (e) {
    urlChecks.push({ u: u.replace(base, ""), error: String(e) });
  }
}

// soft-404/html responses from network
const badResponses = responses.filter(
  (r) => r.status >= 400 || r.isHtml || r.bytes < 50
);

await page.screenshot({
  path: "scripts/_home-full-mid.png",
  fullPage: false,
});
await page.evaluate(() => window.scrollTo(0, 2200));
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/_home-scrolled.png", fullPage: false });

const out = {
  okImgs: report.okImgs,
  totalImgs: report.totalImgs,
  brokenCount: report.brokenImgs.length,
  sampleBroken: report.sampleBroken,
  bgCount: report.bgCount,
  bgSample: report.bgSample,
  urlChecks,
  badResponses: badResponses.slice(0, 50),
};
fs.writeFileSync("scripts/_playwright-below-fold.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
