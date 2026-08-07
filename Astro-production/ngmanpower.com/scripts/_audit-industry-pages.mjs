import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const header = readFileSync(join(ROOT, "src/data/header.html"), "utf8");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));

// Find Industries menu and child links
const indIdx = header.search(/Industries|industries/i);
console.log("header industries idx", indIdx);
const chunk = header.slice(Math.max(0, indIdx - 100), indIdx + 4000);
const hrefs = [...chunk.matchAll(/href="(\/[^"]+\/)"/g)].map((m) => m[1]);
console.log("nearby hrefs", [...new Set(hrefs)]);

// Also all menu items after Industries until next top-level
const menuMatch = header.match(/Industries[\s\S]{0,8000}?<\/ul>\s*<\/li>/i);
const industryHrefs = menuMatch
  ? [...menuMatch[0].matchAll(/href="(\/[^"#]+\/?)"/g)].map((m) => m[1])
  : [];
console.log("dropdown links", [...new Set(industryHrefs)]);

const industryPaths = [
  "/industries/",
  "/construction/",
  "/manufacturing/",
  "/oil-and-gas/",
  "/logistics/",
  "/electromechanical/",
  "/factories/",
  "/food-industry/",
  "/landscaping/",
  "/warehouse/",
];

for (const path of industryPaths) {
  const p = pages.find((x) => x.path === path);
  if (!p) {
    console.log("\nMISSING PAGE", path);
    continue;
  }
  const html = p.bodyHtml || p.content || "";
  const carousels = [...html.matchAll(/wpcp-wrapper-(\d+)|sp-wpcp-(\d+)|id="sp-wp-carousel-free-id-(\d+)"|n2-ss-(\d+)|swiper-wrapper/g)].map(
    (m) => m[0],
  );
  const imgs = [...html.matchAll(/src="(\/wp-content\/uploads\/[^"]+)"/g)].map((m) => m[1]);
  console.log("\n", path, {
    len: html.length,
    carousels: [...new Set(carousels)],
    imgCount: imgs.length,
    sampleImgs: imgs.slice(0, 4),
    pageCss: p.pageCss?.filter((c) => /carousel|smartslider|page-design/i.test(c)),
  });
}
