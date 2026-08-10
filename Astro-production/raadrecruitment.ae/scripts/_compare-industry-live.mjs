import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "NG/1.0" } });
  return res.text();
}

const live = await fetchText("/construction/?nowprocket=1");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const local = pages.find((p) => p.path === "/construction/");
const localHtml = local.bodyHtml || local.content;

// Compare w-image and hero section snippets
function sectionAround(html, needle, before = 800, after = 1200) {
  const i = html.indexOf(needle);
  if (i < 0) return null;
  return html.slice(Math.max(0, i - before), i + after).replace(/\s+/g, " ");
}

const needles = [
  "Related Industries",
  "Transform Your Projects",
  "w-image",
  "Construction Manpower",
];

for (const n of needles) {
  console.log("\n===", n, "===");
  const L = sectionAround(localHtml, n);
  const V = sectionAround(live, n);
  console.log("local", L ? L.slice(0, 400) : "MISS");
  console.log("live ", V ? V.slice(0, 400) : "MISS");
}

// Count style tags / us_custom background images in pageCss construction.css
const cssPath = join(ROOT, "public/css/page-design/construction.css");
const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
console.log("\nconstruction.css len", css.length);
console.log("bg-image count", (css.match(/background-image/g) || []).length);
console.log("sample backgrounds:");
for (const m of css.matchAll(/background-image:\s*url\(([^)]+)\)/g)) {
  console.log(" ", m[1]);
}

// Check live for extra style blocks targeting us_custom that local pageCss might miss
const liveStyles = [...live.matchAll(/<style[^>]*id=["']([^"']*)["'][^>]*>([\s\S]*?)<\/style>/gi)];
console.log("\nlive style ids:", liveStyles.map((m) => [m[1], m[2].length]));

const liveStyleBlocks = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const usCustomLive = liveStyleBlocks.filter((s) => s.includes("us_custom_") && s.includes("background"));
console.log("live styles with us_custom+bg", usCustomLive.length, usCustomLive.map((s) => s.length));

// Check if page-design CSS is missing image sizing for industry hero columns
const localOnlyBgs = [...css.matchAll(/\.us_custom_[a-f0-9]+\s*\{[^}]*background[^}]*\}/gi)].slice(0, 15);
console.log("\nlocal us_custom bg rules:", localOnlyBgs.length);
localOnlyBgs.forEach((m) => console.log(m[0].slice(0, 200)));
