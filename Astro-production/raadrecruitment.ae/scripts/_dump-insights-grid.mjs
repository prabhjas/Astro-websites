import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const h = pages.find((p) => p.path === "/insights/").bodyHtml;

const i = h.indexOf("w-grid");
console.log("w-grid idx", i);
console.log(h.slice(i, i + 2500));
console.log("\n--- load more ---");
const j = h.indexOf("Load More");
console.log(h.slice(j - 400, j + 600));
console.log("\nitems", (h.match(/w-grid-item/g) || []).length);
console.log("g-loadmore", h.includes("g-loadmore"));
console.log("w-grid-json", h.includes("w-grid-json"));
