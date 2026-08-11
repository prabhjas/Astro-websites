import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5102/insights/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  const grids = [...document.querySelectorAll(".w-grid")].map((g, i) => {
    const list = g.querySelector(".w-grid-list");
    const items = [...(list?.querySelectorAll(".w-grid-item") || [])];
    const loadMore = g.querySelector(".g-loadmore");
    return {
      i,
      id: g.id,
      cls: g.className.slice(0, 120),
      spGrid: g.getAttribute("data-sp-insights-grid"),
      spList: list?.getAttribute("data-sp-insights-list"),
      items: items.length,
      ids: items.slice(0, 5).map((el) => el.getAttribute("data-id")),
      hasLoadMore: !!loadMore,
      loadMoreSp: loadMore?.getAttribute("data-sp-insights-load-more"),
      loadMoreOffset: loadMore?.getAttribute("data-offset"),
      headingNear: g.previousElementSibling?.textContent?.trim()?.slice(0, 80) ||
        g.closest(".l-section")?.querySelector("h1,h2,h3")?.textContent?.trim()?.slice(0, 80),
    };
  });
  return grids;
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
