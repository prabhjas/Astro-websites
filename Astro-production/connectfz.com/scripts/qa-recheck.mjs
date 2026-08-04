/**
 * Quick re-check after asset sync: key pages console/404/overflow + mobile nav.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const LOCAL = "http://127.0.0.1:5096";
const paths = [
  "/",
  "/about-us/",
  "/contact/",
  "/insights/",
  "/free-zones/",
  "/pro-services/",
  "/business-setup-in-dubai-mainland/",
];
const browser = await chromium.launch({ headless: true });

const out = [];
for (const width of [1440, 768, 390]) {
  for (const p of paths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const failed = [];
    page.on("pageerror", (e) => consoleErrors.push(String(e.message).slice(0, 160)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 160));
    });
    page.on("requestfailed", (req) => {
      const u = req.url();
      if (u.includes("127.0.0.1:5096")) failed.push(u.replace(LOCAL, "").slice(0, 100));
    });
    const res = await page.goto(LOCAL + p, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => null);
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
    });
    const metrics = await page.evaluate(() => {
      const broken = [...document.images]
        .filter((i) => i.getBoundingClientRect().height > 0 && (!i.complete || i.naturalWidth === 0))
        .map((i) => (i.currentSrc || i.src || "").replace(/^https?:\/\/[^/]+/, ""))
        .slice(0, 8);
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        forms: document.querySelectorAll("form.wpcf7-form").length,
        header: !!document.querySelector("header.header1"),
        toggle: !!document.querySelector(".navbar-toggle"),
        broken,
      };
    });
    let mobileOpen = null;
    if (width <= 768) {
      const btn = page.locator(".navbar-toggle");
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(300);
        mobileOpen = await page.evaluate(() => {
          const panel = document.querySelector("#navbar");
          return panel ? panel.classList.contains("in") || getComputedStyle(panel).display !== "none" : false;
        });
      }
    }
    out.push({
      path: p,
      width,
      status: res?.status() || 0,
      ...metrics,
      mobileOpen,
      consoleErrors: [...new Set(consoleErrors)].filter((e) => !/favicon|nunito/i.test(e)).slice(0, 6),
      failed: [...new Set(failed)].filter((u) => !/nunito|favicon/i.test(u)).slice(0, 6),
    });
    await context.close();
  }
}
await browser.close();
fs.writeFileSync("_crawl/qa-recheck.json", JSON.stringify(out, null, 2));
const summary = {
  rows: out.length,
  overflow: out.filter((r) => r.overflow).map((r) => `${r.path}@${r.width}`),
  withConsole: out.filter((r) => r.consoleErrors.length).length,
  withFailed: out.filter((r) => r.failed.length).length,
  withBroken: out.filter((r) => r.broken.length).length,
  mobileOk: out.filter((r) => r.width <= 768 && r.mobileOpen === true).length,
  sample: out.filter((r) => r.consoleErrors.length || r.failed.length || r.broken.length).slice(0, 10),
};
console.log(JSON.stringify(summary, null, 2));
