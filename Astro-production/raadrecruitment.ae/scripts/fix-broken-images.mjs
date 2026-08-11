/**
 * Find broken images on local pages and download from live site.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const LIVE = "https://spheavyrental.ae";
const LOCAL = "http://127.0.0.1:4321";
const paths = [
  "/about-us/",
  "/heavy-machinery-rental/",
  "/power-generator-rental/",
];

const browser = await chromium.launch({ headless: true });
const missing = new Set();

for (const p of paths) {
  const page = await browser.newPage();
  await page.goto(`${LOCAL}${p}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1000);
  const urls = await page.evaluate(() =>
    [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean),
  );
  console.log(p, "broken", urls.length);
  urls.forEach((u) => {
    console.log(" ", u);
    missing.add(u);
  });
  await page.close();
}

await browser.close();

let got = 0;
let miss = 0;
for (const url of missing) {
  try {
    const u = new URL(url, LOCAL);
    let rel = u.pathname;
    if (!rel.startsWith("/wp-content/")) {
      console.log("skip non-wp", rel);
      miss++;
      continue;
    }
    const dest = path.join("public", rel.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log("exists but broken?", dest);
    }
    const liveUrl = LIVE + rel;
    const res = await fetch(liveUrl);
    if (!res.ok) {
      console.log("MISS", liveUrl, res.status);
      miss++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log("got", rel, buf.length);
    got++;
  } catch (e) {
    console.log("ERR", url, e.message);
    miss++;
  }
}
console.log({ got, miss, total: missing.size });
