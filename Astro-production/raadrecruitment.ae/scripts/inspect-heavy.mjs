import fs from "node:fs";
import { chromium } from "playwright";

const p = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8")).find(
  (x) => x.slug === "heavy-machinery-rental",
);
const h = p.bodyHtml;
function countIds(html) {
  const ids = [...html.matchAll(/data-elementor-id="(\d+)"/g)].map((m) => m[1]);
  const counts = {};
  for (const id of ids) counts[id] = (counts[id] || 0) + 1;
  return counts;
}
console.log("local bodyHtml templates", countIds(h));
console.log("local top sections", (h.match(/elementor-top-section/g) || []).length);

const b = await chromium.launch({ headless: true });
const page = await b.newPage();
await page.goto("/heavy-machinery-rental/?nowprocket=1", {
  waitUntil: "networkidle",
  timeout: 90000,
});
await page.waitForTimeout(2000);
const html = await page.evaluate(
  () => document.querySelector("[data-elementor-type=wp-page]")?.outerHTML || "",
);
fs.writeFileSync("_crawl/heavy-machinery-live-body.html", html);
console.log("live saved", html.length);
console.log("live templates", countIds(html));
console.log("live top sections", (html.match(/elementor-top-section/g) || []).length);

// Also get without waiting for networkidle - raw SSR
const page2 = await b.newPage();
await page2.goto("/heavy-machinery-rental/?nowprocket=1", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
const ssr = await page2.evaluate(
  () => document.querySelector("[data-elementor-type=wp-page]")?.outerHTML || "",
);
console.log("ssr top sections", (ssr.match(/elementor-top-section/g) || []).length);
console.log("ssr templates", countIds(ssr));
await b.close();
