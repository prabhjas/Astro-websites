import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const html = pages.find((p) => p.path === "/manufacturing/").bodyHtml;

// First two sections after hero start
const sections = [...html.matchAll(/<section class="l-section wpb_row ([^"]+)"/g)].slice(0, 6);
console.log(sections.map((m) => m[1]));

// Dump section 2 fully (after hero)
const s1 = html.indexOf("<section");
const s2 = html.indexOf("<section", s1 + 10);
const s3 = html.indexOf("<section", s2 + 10);
console.log("\n=== SECTION 2 ===\n");
console.log(html.slice(s2, s3).replace(/\s+/g, " ").slice(0, 2000));

const css = readFileSync(join(ROOT, "public/css/page-design/manufacturing.css"), "utf8");
for (const sel of ["us_custom_0b7e9c85", "us_custom_7bf0190b", "us_custom_772571f6", "us_custom_f678570c", "us_custom_5434396f"]) {
  console.log("\n", sel);
  for (const m of css.matchAll(new RegExp(`\\.${sel}\\{[^}]+\\}`, "g"))) console.log(m[0]);
}
