import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");
const home = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8")).find(
  (p) => p.path === "/",
).bodyHtml;

const i = home.indexOf('w-text-value">Contact us now');
console.log(home.slice(i - 800, i + 1200).replace(/\s+/g, " ").slice(0, 1800));

for (const cls of [
  "us_custom_0c6eec21",
  "us_custom_956984a9",
  "us_custom_a4ebe4e2",
  "us_custom_b03640aa",
  "us_custom_54e80159",
]) {
  console.log(cls, (css.match(new RegExp(`\\.${cls}\\{[^}]+\\}`)) || [])[0]);
}

// parent section of consultation
const ci = home.indexOf("us_custom_54e80159");
console.log("\nconsult parent", home.slice(ci - 500, ci).replace(/\s+/g, " "));
