#!/usr/bin/env node
/**
 * Visual layout compare: live vs local at 3 breakpoints.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const LIVE = "https://raadrecruitment.ae";
const LOCAL = process.env.BASE || "http://127.0.0.1:5113";
const pages = (process.env.PAGES || "/,/about-us/,/contact-us/,/blog/").split(",").filter(Boolean);
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

fs.mkdirSync("scripts/_layout-shots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

async function metrics(page) {
  return page.evaluate(() => {
    const body = document.body;
    const main = document.querySelector("#content, main, .site-content");
    const section = document.querySelector(".elementor-section, .elementor");
    const h1 = document.querySelector("h1, .elementor-heading-title");
    const sheetCount = [...document.styleSheets].length;
    const failedSheets = [];
    for (const s of document.styleSheets) {
      try {
        void s.cssRules;
      } catch {
        failedSheets.push(s.href);
      }
    }
    return {
      title: document.title,
      bodyW: body.scrollWidth,
      bodyH: body.scrollHeight,
      clientW: document.documentElement.clientWidth,
      overflowX: body.scrollWidth > document.documentElement.clientWidth + 2,
      mainW: main?.getBoundingClientRect().width || null,
      sectionW: section?.getBoundingClientRect().width || null,
      h1Font: h1 ? getComputedStyle(h1).fontFamily : null,
      h1Size: h1 ? getComputedStyle(h1).fontSize : null,
      sheetCount,
      failedSheets: failedSheets.slice(0, 10),
      hasElementor: !!document.querySelector(".elementor"),
      bg: getComputedStyle(body).backgroundColor,
    };
  });
}

for (const vp of viewports) {
  for (const p of pages) {
    for (const [label, origin] of [
      ["local", LOCAL],
      ["live", LIVE],
    ]) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      const css404 = [];
      page.on("response", (res) => {
        const u = res.url();
        if (/\.css(\?|$)/i.test(u) && res.status() >= 400) css404.push({ status: res.status(), u });
      });
      try {
        await page.goto(origin + p, { waitUntil: "networkidle", timeout: 90000 });
        await page.waitForTimeout(1200);
        const m = await metrics(page);
        const shot = `scripts/_layout-shots/${label}${p.replace(/\W+/g, "_")}_${vp.name}.png`;
        await page.screenshot({ path: shot, fullPage: false });
        report.push({ label, path: p, vp: vp.name, ...m, css404: css404.slice(0, 15), shot });
        console.log(label, p, vp.name, "overflowX=", m.overflowX, "mainW=", m.mainW, "sheets=", m.sheetCount);
      } catch (e) {
        report.push({ label, path: p, vp: vp.name, error: String(e) });
        console.warn("ERR", label, p, vp.name, e.message);
      }
      await context.close();
    }
  }
}

fs.writeFileSync("scripts/_layout-compare.json", JSON.stringify(report, null, 2));
console.log("wrote scripts/_layout-compare.json", report.length);
await browser.close();
