import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const local = pages.find((p) => p.path === "/manufacturing/");
const html = local.bodyHtml || local.content;

const live = await (
  await fetch("/manufacturing/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();

function chunk(html, needle, before = 500, after = 2000) {
  const i = html.indexOf(needle);
  if (i < 0) return null;
  return { i, text: html.slice(Math.max(0, i - before), i + after) };
}

const needles = [
  "Clients globally",
  "appreciate our",
  "right hands",
  "INDUSTRY",
  "ISO1-LOGO",
  "ISO2-LOGO",
  "Frame-360",
  "Frame-383",
];

for (const n of needles) {
  const L = chunk(html, n);
  const V = chunk(live, n);
  console.log("\n====", n, "====");
  console.log("local idx", L?.i, "live idx", V?.i);
  if (L) {
    // extract us_custom classes nearby
    const classes = [...L.text.matchAll(/us_custom_[a-f0-9]+|w-image|g-cols|wpb_row/g)].map((m) => m[0]);
    console.log("local classes", [...new Set(classes)].slice(0, 25));
  }
}

// Pull CSS rules from manufacturing.css for overlapping/collage/hero classes
const css = readFileSync(join(ROOT, "public/css/page-design/manufacturing.css"), "utf8");
const rules = [...css.matchAll(/\.us_custom_[a-f0-9]+\{[^}]+\}/g)].map((m) => m[0]);
console.log("\nall us_custom rules count", rules.length);
for (const r of rules) {
  if (/margin|padding|background|position|top|left|transform|z-index|width|height|grid|gap|border-radius/i.test(r)) {
    console.log(r.slice(0, 280));
  }
}

// Find Clients section markup more carefully
const ci = html.indexOf("Clients globally");
console.log("\n--- LOCAL Clients section ---");
console.log(html.slice(ci - 1500, ci + 2500).replace(/\s+/g, " ").slice(0, 2200));

console.log("\n--- LIVE Clients section ---");
const li = live.indexOf("Clients globally");
console.log(live.slice(li - 1500, li + 2500).replace(/\s+/g, " ").slice(0, 2200));
