import { chromium } from "playwright";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const LOCAL = "http://127.0.0.1:5089";
const PUBLIC = "c:/Users/DELL/Desktop/Astro-New-Setup/Astro-websites/Astro-production/iberiaeor.com/public";
const pages = ["/", "/about-us/", "/employer-of-record/", "/contact-us/", "/insights/"];

const browser = await chromium.launch({ headless: true });
let liveSrc = 0;
let missingFile = 0;
let broken = 0;
let ok = 0;

for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(LOCAL + path, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const imgs = await page.evaluate(() =>
    [...document.images].map((img) => ({
      src: img.currentSrc || img.src,
      naturalWidth: img.naturalWidth,
      complete: img.complete,
    })),
  );
  for (const img of imgs) {
    if (!img.src || img.src.startsWith("data:")) continue;
    if (/iberiaeor\.com/i.test(img.src) && !/127\.0\.0\.1/.test(img.src)) {
      liveSrc += 1;
      console.log("LIVE_SRC", path, img.src.slice(0, 120));
    }
    try {
      const u = new URL(img.src, LOCAL);
      if (u.pathname.startsWith("/wp-content/")) {
        const local = join(PUBLIC, ...u.pathname.split("/").filter(Boolean));
        if (!existsSync(local) || statSync(local).size === 0) {
          missingFile += 1;
          console.log("MISSING_FILE", path, u.pathname);
        }
      }
    } catch {
      /* ignore */
    }
    if (img.complete && img.naturalWidth === 0) {
      broken += 1;
      console.log("BROKEN", path, img.src.slice(0, 120));
    } else if (img.naturalWidth > 0) {
      ok += 1;
    }
  }
  await page.close();
}

await browser.close();
console.log({ ok, broken, liveSrc, missingFile });
