import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const local = pages.find((p) => p.path === "/manufacturing/").bodyHtml;

const live = await (
  await fetch("/manufacturing/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();
const liveLocal = await (await fetch("http://127.0.0.1:5102/manufacturing/")).text();

function sectionBundle(html, fromNeedle, toNeedle) {
  const a = html.indexOf(fromNeedle);
  const b = toNeedle ? html.indexOf(toNeedle, a + 10) : html.length;
  if (a < 0) return null;
  return html.slice(a, b > a ? b : a + 8000);
}

const ranges = [
  ["HERO→SOCIAL", "INDUSTRY", "How NG Manpower Supports"],
  ["SOCIAL→GRID", "How NG Manpower Supports", "Clients globally"],
  ["CLIENTS→REV", "Clients globally", "Revolutionize Your"],
  ["REV→END", "Revolutionize Your", "Know about other"],
];

for (const [name, from, to] of ranges) {
  const L = sectionBundle(local, from, to);
  const V = sectionBundle(live, from, to);
  console.log("\n====", name, "====");
  console.log("local len", L?.length, "live len", V?.length);
  if (L) {
    const imgs = [...L.matchAll(/src="([^"]+)"/g)].map((m) => m[1].replace(/https?:\/\/[^/]+/, ""));
    const customs = [...new Set([...L.matchAll(/us_custom_[a-f0-9]+/g)].map((m) => m[0]))];
    console.log("local imgs", imgs.slice(0, 12));
    console.log("local classes", customs.slice(0, 20));
  }
  if (V) {
    const imgs = [...V.matchAll(/src="([^"]+)"/g)].map((m) => m[1].replace(/https?:\/\/[^/]+/, ""));
    console.log("live imgs", imgs.slice(0, 12));
  }
}

// CSS rules for key sections in manufacturing.css
const css = readFileSync(join(ROOT, "public/css/page-design/manufacturing.css"), "utf8");
const fix = readFileSync(join(ROOT, "public/css/industry-layout-fix.css"), "utf8");
for (const sel of [
  "us_custom_0b7e9c85",
  "us_custom_7bf0190b",
  "us_custom_2cb867d0",
  "us_custom_6a99ad11",
  "us_custom_8b78c63d",
  "us_custom_0493f734",
  "us_custom_8549a734",
  "us_custom_9a181baa",
]) {
  const rules = [...css.matchAll(new RegExp(`\\.${sel}\\{[^}]+\\}`, "g"))].map((m) => m[0]);
  console.log("\nCSS", sel, rules[0]?.slice(0, 220));
}

console.log("\nserved layout-fix?", liveLocal.includes("industry-layout-fix.css"));
console.log("served Helping-Our-Clients?", liveLocal.includes("Helping-Our-Clients"));
console.log("served one.png icons?", liveLocal.includes("/2023/05/one.png"));
console.log("grid cols_3?", (local.match(/cols_3/g) || []).length);
