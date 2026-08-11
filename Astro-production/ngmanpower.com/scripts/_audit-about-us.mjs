import { readFileSync } from "fs";
import { chromium } from "playwright";

const pages = JSON.parse(readFileSync("src/data/pages.json", "utf8"));
const page = pages.find((p) => p.path === "/about-us/");
const html = page.bodyHtml;
const markers = [
  "maxresdefault",
  "ISO1-LOGO",
  "Rectangle-591",
  "Mission",
  "Vision",
  "Helping-Our-Clients",
  "Frame-365",
  "us_custom_6e1d0a49",
  "us_custom_55283421",
  "ult-video",
  "uvc-",
  "w-video",
  "clip-path",
  "skew",
];
for (const m of markers) {
  const i = html.indexOf(m);
  console.log("\n===", m, i, "===");
  if (i >= 0) console.log(html.slice(Math.max(0, i - 180), i + 280).replace(/\s+/g, " "));
}

const browser = await chromium.launch({ headless: true });
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:5102/about-us/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const styles = await p.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { missing: true, sel };
    const cs = getComputedStyle(el);
    return {
      sel,
      display: cs.display,
      marginTop: cs.marginTop,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      clipPath: cs.clipPath,
      transform: cs.transform,
      height: Math.round(el.getBoundingClientRect().height),
      width: Math.round(el.getBoundingClientRect().width),
    };
  };
  return {
    badgesSec: pick(".us_custom_6e1d0a49"),
    badgeCols: [...document.querySelectorAll(".us_custom_6e1d0a49 .wpb_column")].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        cls: el.className.toString().slice(0, 80),
        display: cs.display,
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top + scrollY),
        left: Math.round(r.left),
      };
    }),
    badgeRow: pick(".us_custom_6e1d0a49 .g-cols"),
    hero: pick(".us_custom_5d0a241b"),
    rounded: pick(".us_custom_04570ec2"),
    img591: (() => {
      const img = document.querySelector('img[src*="Rectangle-591"]');
      if (!img) return null;
      const cs = getComputedStyle(img);
      return {
        height: cs.height,
        width: cs.width,
        maxHeight: cs.maxHeight,
        src: img.currentSrc,
        html: img.outerHTML.slice(0, 300),
      };
    })(),
  };
});
console.log(JSON.stringify(styles, null, 2));
await browser.close();
