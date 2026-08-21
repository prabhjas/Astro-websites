import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const out =
  "C:/Users/DELL/Desktop/Astro-New-Setup/Astro-websites/Astro-production/ngmanpower.com/.verify-screens/insights";
mkdirSync(out, { recursive: true });

async function run(url, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const broken = [];
  page.on("response", (res) => {
    const u = res.url();
    if (res.status() >= 400 && /uploads|css|insights|load-more/i.test(u)) {
      broken.push({ status: res.status(), u: u.slice(0, 160) });
    }
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-top.png` });
  await page.evaluate(() => {
    const el = document.querySelector(".g-loadmore, [data-sp-insights-load-more]");
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${label}-loadmore.png` });

  const info = await page.evaluate(() => {
    const list = document.querySelector("[data-sp-insights-list], .w-grid-list");
    const loadMore = document.querySelector("[data-sp-insights-load-more], .g-loadmore");
    const btn = loadMore?.querySelector("button, a.w-btn, a");
    const cards = [...(list?.querySelectorAll(".w-grid-item") || [])];
    const imgs = [...document.querySelectorAll(".l-main img")].slice(0, 20).map((img) => ({
      src: (img.currentSrc || img.src || "").split("/").pop(),
      w: Math.round(img.getBoundingClientRect().width),
      h: Math.round(img.getBoundingClientRect().height),
      natural: { w: img.naturalWidth, h: img.naturalHeight },
    }));
    return {
      title: document.title,
      cards: cards.length,
      ids: cards.map((c) => c.getAttribute("data-id")).filter(Boolean),
      hasScript: !!document.querySelector('script[src*="insights-load-more"]'),
      loadMore: loadMore
        ? {
            text: btn?.textContent?.trim(),
            display: getComputedStyle(loadMore).display,
            hidden: loadMore.hidden,
            attrs: {
              perPage: loadMore.getAttribute("data-per-page"),
              offset: loadMore.getAttribute("data-offset"),
              sp: loadMore.getAttribute("data-sp-insights-load-more"),
            },
          }
        : null,
      imgs,
    };
  });

  let clickResult = null;
  if (label === "local" && info.loadMore) {
    const before = info.cards;
    await page.click("[data-sp-insights-load-more] button, [data-sp-insights-load-more] a, .g-loadmore button, .g-loadmore a.w-btn");
    await page.waitForTimeout(2500);
    clickResult = await page.evaluate((beforeCount) => {
      const list = document.querySelector("[data-sp-insights-list], .w-grid-list");
      const cards = [...(list?.querySelectorAll(".w-grid-item") || [])];
      const loadMore = document.querySelector("[data-sp-insights-load-more], .g-loadmore");
      const btn = loadMore?.querySelector("button, a.w-btn, a");
      return {
        before: beforeCount,
        after: cards.length,
        label: btn?.textContent?.trim(),
        hidden: loadMore?.hidden || getComputedStyle(loadMore).display === "none",
        ids: cards.map((c) => c.getAttribute("data-id")).filter(Boolean),
      };
    }, before);
    await page.screenshot({ path: `${out}/${label}-after-click.png` });
  }

  writeFileSync(
    `${out}/${label}-info.json`,
    JSON.stringify({ broken: broken.slice(0, 30), info, clickResult }, null, 2)
  );
  console.log(label, JSON.stringify({ broken: broken.length, info, clickResult }, null, 2));
  await browser.close();
}

await run("http://127.0.0.1:5102/insights/", "local");
await run("https://ngmanpower.com/insights/", "live");
