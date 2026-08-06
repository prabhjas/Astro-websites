import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const h = pages.find((p) => p.path === "/insights/").bodyHtml;
const i = h.indexOf("w-grid-json");
const chunk = h.slice(i, i + 2500);
console.log(chunk.replace(/&quot;/g, '"').replace(/&#039;/g, "'").slice(0, 2000));

const posts = JSON.parse(readFileSync(join(ROOT, "src/data/posts.json"), "utf8"));
console.log("\ntotal posts", posts.length);
console.log("grid items in html", (h.match(/w-grid-item/g) || []).length);
