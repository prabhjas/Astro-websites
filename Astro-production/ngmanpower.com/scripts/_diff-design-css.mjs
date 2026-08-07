import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function normalize(css) {
  return css
    .replace(/https?:\/\/ngmanpower\.com/g, "")
    .replace(/\/\/ngmanpower\.com/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const slugs = [
  "manufacturing",
  "construction",
  "oil-and-gas",
  "logistics",
  "electromechanical",
  "factories",
  "food-industry",
  "landscaping",
  "warehouse",
];

for (const slug of slugs) {
  const local = readFileSync(join(ROOT, `public/css/page-design/${slug}.css`), "utf8");
  const live = readFileSync(join(ROOT, `public/css/page-design/${slug}.css.live-extract.css`), "utf8");
  const nL = normalize(local);
  const nV = normalize(live);
  console.log(slug, {
    equal: nL === nV,
    localLen: nL.length,
    liveLen: nV.length,
    diff: nV.length - nL.length,
  });

  if (nL !== nV) {
    // find first differing index
    let i = 0;
    while (i < nL.length && i < nV.length && nL[i] === nV[i]) i++;
    console.log("  first diff @", i);
    console.log("  local:", JSON.stringify(nL.slice(i, i + 120)));
    console.log("  live :", JSON.stringify(nV.slice(i, i + 120)));
  }
}

// Check key assets
const assets = [
  "public/wp-content/uploads/2023/07/1-4.png",
  "public/wp-content/uploads/2023/05/Frame-360.jpg",
  "public/wp-content/uploads/2023/06/Frame-383.jpg",
  "public/wp-content/uploads/2023/05/ISO1-LOGO.png",
  "public/wp-content/uploads/2023/05/Content-Block-optimized-e1685510871694.jpg",
];
for (const a of assets) {
  console.log(existsSync(join(ROOT, a)) ? "OK" : "MISSING", a);
}

// Inspect clients section structure on local manufacturing HTML
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const m = pages.find((p) => p.path === "/manufacturing/");
const html = m.bodyHtml || m.content;
const ci = html.indexOf("Clients globally");
const sectionStart = html.lastIndexOf("<section", ci);
const sectionEnd = html.indexOf("</section>", ci) + 10;
console.log("\nClients section classes:");
console.log(html.slice(sectionStart, sectionStart + 300));
// find parent section of badges
const badgeIdx = html.indexOf("ISO1-LOGO", ci > 0 ? 0 : 0);
// all ISO near clients
const near = html.slice(ci - 800, ci + 3500);
const imgs = [...near.matchAll(/src="([^"]+)"/g)].map((x) => x[1]);
console.log("imgs near clients", imgs);
const customs = [...near.matchAll(/us_custom_[a-f0-9]+/g)].map((x) => x[0]);
console.log("customs", [...new Set(customs)]);
