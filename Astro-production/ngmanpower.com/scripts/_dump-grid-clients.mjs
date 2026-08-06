import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const html = pages.find((p) => p.path === "/manufacturing/").bodyHtml;

// Feature cards section
const i = html.indexOf("Full Service Recruitment");
const start = html.lastIndexOf("<section", i);
const end = html.indexOf("</section>", html.indexOf("Proven Track Record")) + 10;
const grid = html.slice(start, end);
console.log("GRID section class", (grid.match(/us_custom_[a-f0-9]+/)||[])[0]);
console.log("cols class", (grid.match(/cols_\d+/)||[])[0]);
console.log("card icons", [...grid.matchAll(/one\.png|two\.png|three\.png|four\.png|five\.png|six\.png/g)].map(m=>m[0]));
console.log("us_custom near cards", [...new Set([...grid.matchAll(/us_custom_[a-f0-9]+/g)].map(m=>m[0]))]);

// Clients full structure
const c = html.indexOf("Clients globally");
const cStart = html.lastIndexOf("<section", c);
// take next 3 sections
let idx = cStart;
for (let n = 0; n < 4; n++) {
  const s = html.indexOf("<section", idx);
  const e = html.indexOf("</section>", s) + 10;
  const chunk = html.slice(s, e);
  console.log("\nCLIENTS BLOCK", n, chunk.slice(0, 200).replace(/\s+/g," "));
  console.log("  imgs", [...chunk.matchAll(/src="([^"]+)"/g)].map(m=>m[1]));
  idx = e;
}
