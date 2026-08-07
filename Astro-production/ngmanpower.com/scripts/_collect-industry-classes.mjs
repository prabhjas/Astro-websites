import { readFileSync } from "fs";
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
];

for (const path of paths) {
  const p = pages.find((x) => x.path === path);
  const html = p.bodyHtml || p.content;
  const hero = html.match(/<section class="l-section wpb_row (us_custom_[a-f0-9]+)/)?.[1];
  const ci = html.indexOf("Clients globally");
  const after = html.slice(ci, ci + 5500);
  const sections = [...after.matchAll(/<section class="l-section wpb_row (us_custom_[a-f0-9]+)/g)].map((m) => m[1]);
  const cssPath = join(ROOT, "public/css/page-design", path.replace(/\//g, "").replace(/^/, "") || "x");
  // page slug from path
  const slug = path.replace(/^\/|\/$/g, "");
  const css = readFileSync(join(ROOT, `public/css/page-design/${slug}.css`), "utf8");
  const badgeCls = sections.find((s) => after.includes(s) && css.includes(s) && css.includes(`${s}{margin-top:-`)) || sections[1];
  const overlayImg = sections[0];
  const badge = sections.find((s) => {
    const i = after.indexOf(s);
    return after.slice(i, i + 1500).includes("ISO1-LOGO");
  });
  const collage = html.includes("Frame-364.png");
  console.log(JSON.stringify({ path, hero, overlayImg: sections[0], badge, all: sections.slice(0, 3), collage }));
}

// Also pull CSS values for manufacturing badge/overlay/hero
const css = readFileSync(join(ROOT, "public/css/page-design/manufacturing.css"), "utf8");
for (const sel of ["us_custom_0b7e9c85", "us_custom_6a99ad11", "us_custom_8b78c63d", "us_custom_0493f734", "us_custom_4e307cde"]) {
  const re = new RegExp(`\\.${sel}\\{[^}]+\\}`, "g");
  console.log("\n", sel);
  for (const m of css.matchAll(re)) console.log(" ", m[0]);
}
