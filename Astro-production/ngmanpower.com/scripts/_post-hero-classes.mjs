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
  const html = pages.find((p) => p.path === path).bodyHtml;
  const i = html.indexOf("Helping-Our-Clients");
  const start = html.lastIndexOf("<section", i);
  const cls = (html.slice(start, start + 120).match(/us_custom_[a-f0-9]+/) || [])[0];
  const heading = (html.slice(i, i + 800).match(/How NG Manpower[^<]*/)||[])[0];
  console.log(path, cls, heading?.slice(0, 60));
}
