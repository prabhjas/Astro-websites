import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5102/about-us/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const hasScript = await page.evaluate(
  () => !!document.querySelector('script[src*="video_module"]')
);
const before = await page.evaluate(
  () => !!document.querySelector(".ultv-video__play iframe")
);
const bound = await page.evaluate(() => {
  const el = document.querySelector(".ultv-video__outer-wrap");
  const jq = window.jQuery;
  if (!jq || !el) return { jq: !!jq, el: !!el };
  const ev = jq._data(el, "events");
  return { jq: true, el: true, events: ev ? Object.keys(ev) : null };
});

await page.click(".ultv-video__outer-wrap", { force: true });
await page.waitForTimeout(1000);

const after = await page.evaluate(() => {
  const iframe = document.querySelector(".ultv-video__play iframe");
  return iframe
    ? { src: iframe.src, w: iframe.offsetWidth, h: iframe.offsetHeight }
    : null;
});

console.log(JSON.stringify({ hasScript, before, bound, after }, null, 2));
await browser.close();
