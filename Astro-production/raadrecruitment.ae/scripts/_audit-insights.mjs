import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const ins = pages.find((p) => p.path === "/insights/");
const h = ins.bodyHtml || ins.content;
console.log("local len", h.length);
for (const n of [
  "Load More",
  "load-more",
  "elementor-posts",
  "ecs-",
  "w-grid",
  "pagination",
  "Insight",
]) {
  console.log(n, h.includes(n));
}
console.log("sample", h.slice(0, 600).replace(/\s+/g, " "));

const live = await (
  await fetch("/insights/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();
console.log("\nlive len", live.length);
for (const n of [
  "Load More",
  "ecs-load-more",
  "elementor-posts",
  "w-grid",
  "pagination",
  "us_grid",
  "g-loadmore",
]) {
  console.log("live", n, live.includes(n));
}

const needles = ["Load More", "g-loadmore", "us_grid", "w-grid-list", "elementor-widget-posts"];
for (const n of needles) {
  const i = live.indexOf(n);
  if (i >= 0) console.log("\nctx", n, live.slice(i - 120, i + 300).replace(/\s+/g, " "));
}
