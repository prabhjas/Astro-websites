import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto("http://127.0.0.1:4321/services/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const vars = [
    "--e-global-color-primary",
    "--e-global-color-accent",
    "--e-global-color-f86b8ae",
    "--e-global-color-text",
  ];
  const v = {};
  for (const x of vars) v[x] = cs.getPropertyValue(x).trim();
  const item = document.querySelector(".elementor-accordion-item");
  const t = item?.querySelector(".elementor-tab-title");
  const a = item?.querySelector(".elementor-accordion-title");
  return {
    vars: v,
    firstActive: t?.classList.contains("elementor-active"),
    aColor: a ? getComputedStyle(a).color : null,
    contentDisplay: item
      ? getComputedStyle(item.querySelector(".elementor-tab-content")).display
      : null,
    listenersHint: typeof window.__spAccordionBound,
  };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
