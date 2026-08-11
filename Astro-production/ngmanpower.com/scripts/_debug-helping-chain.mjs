import { chromium } from "playwright";
import { readFileSync } from "fs";

const css = readFileSync("public/css/page-design/about-us.css", "utf8");
for (const k of [
  "514e3533",
  "3ed5ac5d",
  "bf6a3866",
  "9c7b8ea7",
  "Helping",
]) {
  const i = css.indexOf(k);
  console.log(k, i >= 0 ? css.slice(Math.max(0, i - 20), i + 120) : "missing");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5102/about-us/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const chain = await page.evaluate(() => {
  const img = document.querySelector('img[src*="Helping-Our-Clients"]');
  const out = [];
  let el = img;
  while (el && out.length < 12) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out.push({
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 100),
      h: Math.round(r.height),
      w: Math.round(r.width),
      styleH: cs.height,
      maxH: cs.maxHeight,
      minH: cs.minHeight,
      overflow: cs.overflow,
      display: cs.display,
      flex: cs.flex,
      align: cs.alignSelf,
      inline: el.getAttribute("style"),
    });
    el = el.parentElement;
  }
  return out;
});
console.log(JSON.stringify(chain, null, 2));
await browser.close();
