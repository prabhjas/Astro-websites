import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/")?.bodyHtml || "";
const design = readFileSync(join(ROOT, "public/css/impreza-design-options.css"), "utf8");
const theme = readFileSync(join(ROOT, "public/css/impreza-theme-options.css"), "utf8");

// iconbox custom class styles
for (const cls of ["us_custom_add3fd8d", "us_custom_41b180c8", "us_custom_8d45c27c", "us_custom_9c7b8ea7"]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`, "g");
  console.log(cls, (design.match(re) || theme.match(re) || []).join(" | "));
}

// testimonials markup in home
const ti = home.toLowerCase().indexOf("what they");
console.log("\nTESTIMONIALS HTML:\n", home.slice(ti, ti + 3500).replace(/\s+/g, " "));

// industries ManP / Placeholder
const ii = home.toLowerCase().indexOf("ng provide");
console.log("\nINDUSTRIES HTML:\n", home.slice(ii, ii + 2500).replace(/\s+/g, " "));

// iconbox img tags count / unique srcs
const iconImgs = [...home.matchAll(/w-iconbox-icon[\s\S]*?<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log("\niconbox srcs", [...new Set(iconImgs)]);

// carousel/slider widgets near testimonials
const sliderBits = [...home.matchAll(/class="[^"]*(us_carousel|w-slider|owl|swiper|ultimate-carousel|ult-carousel|slick)[^"]*"/gi)].map((m) => m[0]);
console.log("slider classes", [...new Set(sliderBits)]);
