import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const paths = [
  "/construction/",
  "/manufacturing/",
  "/oil-and-gas/",
  "/logistics/",
  "/electromechanical/",
  "/factories/",
  "/food-industry/",
  "/landscaping/",
  "/warehouse/",
  "/industries/",
];

function cleanUrl(u) {
  return u
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/\/[^/]+/, "")
    .split("?")[0];
}

for (const path of paths) {
  const p = pages.find((x) => x.path === path);
  if (!p) {
    console.log(path, "MISSING PAGE");
    continue;
  }
  const html = p.bodyHtml || p.content;
  const si = html.indexOf('id="n2-ss-3"');
  const block = si >= 0 ? html.slice(si, si + 25000) : "";
  const imgs = [...new Set([...block.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]))];
  const missing = imgs
    .map(cleanUrl)
    .filter((c) => c.includes("uploads") && !existsSync(join(ROOT, "public", c.replace(/^\//, ""))));

  const allImgs = [...new Set([...html.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]))];
  const allMissing = allImgs
    .map(cleanUrl)
    .filter((c) => c.includes("uploads") && !existsSync(join(ROOT, "public", c.replace(/^\//, ""))));

  const bgs = [...html.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]);
  const bgMissing = bgs
    .map(cleanUrl)
    .filter((c) => c.includes("uploads") && !existsSync(join(ROOT, "public", c.replace(/^\//, ""))));

  console.log(path, {
    ss: si >= 0,
    sliderImgs: imgs.length,
    sliderMissing: missing,
    pageMissingImgs: allMissing.slice(0, 10),
    bgMissing: [...new Set(bgMissing)].slice(0, 10),
  });
}
