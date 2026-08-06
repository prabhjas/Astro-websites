import { chromium } from "playwright";
import { mkdirSync } from "fs";

const out =
  "C:/Users/DELL/Desktop/Astro-New-Setup/Astro-websites/Astro-production/ngmanpower.com/.verify-screens";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5102/manufacturing/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/local-full.png`, fullPage: true });

const secs = [
  ["hero", ".us_custom_0b7e9c85"],
  ["contact", ".us_custom_7bf0190b"],
  ["social", ".us_custom_2cb867d0"],
  ["clients", ".us_custom_6a99ad11"],
  ["circle", ".us_custom_8b78c63d"],
  ["badges", ".us_custom_0493f734"],
  ["revolutionize", ".us_custom_8549a734"],
];

for (const [name, sel] of secs) {
  const el = await page.$(sel);
  if (!el) {
    console.log("MISSING", name, sel);
    continue;
  }
  await el.screenshot({ path: `${out}/local-${name}.png` });
  const box = await el.boundingBox();
  console.log(name, box);
}

const hero = await page.$(".us_custom_0b7e9c85");
const social = await page.$(".us_custom_2cb867d0");
const clients = await page.$(".us_custom_6a99ad11");
const revo = await page.$(".us_custom_8549a734");
const hb = await hero.boundingBox();
const sb = await social.boundingBox();
const cb = await clients.boundingBox();
const rb = await revo.boundingBox();
console.log("gap hero->social", sb.y - (hb.y + hb.height));
console.log("social height", sb.height);

await page.screenshot({
  path: `${out}/local-top.png`,
  clip: {
    x: 0,
    y: 0,
    width: 1440,
    height: Math.min(2200, sb.y + sb.height + 40),
  },
});
await page.screenshot({
  path: `${out}/local-bottom.png`,
  clip: {
    x: 0,
    y: Math.max(0, cb.y - 40),
    width: 1440,
    height: Math.min(1600, rb.y + rb.height - (cb.y - 40) + 80),
  },
});

// Computed styles check
const styles = await page.evaluate(() => {
  const pick = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return { missing: true, sel };
    const cs = getComputedStyle(el);
    const o = { sel };
    for (const p of props) o[p] = cs.getPropertyValue(p);
    const r = el.getBoundingClientRect();
    o.top = r.top + window.scrollY;
    o.height = r.height;
    return o;
  };
  return {
    hero: pick(".us_custom_0b7e9c85", [
      "margin-top",
      "padding-bottom",
      "background-image",
      "background-size",
      "background-position",
    ]),
    contact: pick(".us_custom_7bf0190b", ["margin-top", "margin-left"]),
    social: pick(".us_custom_2cb867d0", ["margin-top", "padding-top", "padding-bottom"]),
    clients: pick(".us_custom_6a99ad11", ["padding-top", "padding-bottom"]),
    circle: pick(".us_custom_8b78c63d", ["margin-top", "padding-bottom"]),
    badges: pick(".us_custom_0493f734", ["margin-top", "padding-bottom"]),
    body: pick(".us_custom_6a99ad11 .us_custom_42622947", ["margin-top"]),
  };
});
console.log(JSON.stringify(styles, null, 2));

await browser.close();
console.log("done", out);
