import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5102/insights/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const before = await page.evaluate(() => {
  const g1 = document.querySelector("#us_grid_1 .w-grid-list");
  const g2 = document.querySelector("#us_grid_2 .w-grid-list");
  return {
    g1: g1?.querySelectorAll(".w-grid-item").length || 0,
    g2: g2?.querySelectorAll(".w-grid-item").length || 0,
    markedGrid: document.querySelector("[data-sp-insights-grid]")?.id,
    markedListParent: document
      .querySelector("[data-sp-insights-list]")
      ?.closest(".w-grid")?.id,
    loadMoreIn: document
      .querySelector("[data-sp-insights-load-more]")
      ?.closest(".w-grid")?.id,
    h1Color: getComputedStyle(document.querySelector("h1")).color,
  };
});

await page.locator("[data-sp-insights-load-more] a, [data-sp-insights-load-more] button, .g-loadmore a.w-btn").first().click();
await page.waitForTimeout(2500);

const after = await page.evaluate(() => {
  const g1 = document.querySelector("#us_grid_1 .w-grid-list");
  const g2 = document.querySelector("#us_grid_2 .w-grid-list");
  const btn = document.querySelector("[data-sp-insights-load-more] a, [data-sp-insights-load-more] button, .g-loadmore a.w-btn");
  return {
    g1: g1?.querySelectorAll(".w-grid-item").length || 0,
    g2: g2?.querySelectorAll(".w-grid-item").length || 0,
    label: btn?.textContent?.trim(),
    hidden: document.querySelector("[data-sp-insights-load-more]")?.hidden,
  };
});

console.log(JSON.stringify({ before, after }, null, 2));
await browser.close();
