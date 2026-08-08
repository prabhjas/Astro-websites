import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const home = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8")).find(
  (p) => p.path === "/",
).bodyHtml;
const css = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");

const i = home.indexOf("man-constructor-contact-form");
console.log("constructor idx", i);
console.log(home.slice(i - 2000, i + 800).replace(/\s+/g, " ").slice(0, 2500));

const classes = [...home.slice(i - 2500, i + 500).matchAll(/us_custom_[a-f0-9]+/g)].map((m) => m[0]);
console.log("\nclasses", [...new Set(classes)]);
for (const cls of [...new Set(classes)]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`);
  console.log(cls, (css.match(re) || [])[0] || "MISSING");
}

// form wrapper
const fi = home.indexOf("Contact us now");
// find all occurrences
let idx = 0;
while ((idx = home.indexOf("Contact us now", idx)) !== -1) {
  console.log("\noccurrence", idx, home.slice(idx - 120, idx + 80).replace(/\s+/g, " "));
  idx += 1;
}
