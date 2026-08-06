import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));

await p.goto("http://127.0.0.1:4321/about-us/", { waitUntil: "domcontentloaded" });
await p.locator('img[src*="check-icon"]').first().scrollIntoViewIfNeeded();
await p.waitForTimeout(800);
const icons = await p.evaluate(() =>
  [...document.images]
    .filter((i) => i.src.includes("check-icon"))
    .map((i) => ({ w: i.naturalWidth, complete: i.complete })),
);
console.log("check-icon after scroll", icons);

await p.goto("http://127.0.0.1:4321/services/", { waitUntil: "networkidle" });
await p.waitForTimeout(2200);
const faq = await p.evaluate(() => {
  const item = document.querySelector(".elementor-accordion-item");
  const t = item?.querySelector(".elementor-tab-title");
  const a = item?.querySelector(".elementor-accordion-title");
  const c = item?.querySelector(".elementor-tab-content");
  return {
    active: t?.classList.contains("elementor-active"),
    aColor: a ? getComputedStyle(a).color : null,
    display: c ? getComputedStyle(c).display : null,
  };
});
console.log("faq", faq);
console.log("pageerrors", errs);
await b.close();
