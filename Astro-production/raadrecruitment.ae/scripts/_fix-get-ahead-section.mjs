import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const home = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8")).find(
  (p) => p.path === "/",
).bodyHtml;
const css = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");

const needle = "We Help Businesses Get Ahead";
const i = home.indexOf(needle);
console.log("idx", i);
console.log(home.slice(i - 800, i + 1500).replace(/\s+/g, " ").slice(0, 2200));

const classes = [...home.slice(i - 1200, i + 1200).matchAll(/us_custom_[a-f0-9]+/g)].map((m) => m[0]);
console.log("\nclasses", [...new Set(classes)]);
for (const cls of [...new Set(classes)]) {
  console.log(cls, (css.match(new RegExp(`\\.${cls}\\{[^}]+\\}`)) || [])[0] || "MISSING");
}

const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
const li = live.indexOf(needle);
console.log("\nlive chunk", live.slice(li - 200, li + 600).replace(/\s+/g, " ").slice(0, 900));
for (const cls of [...new Set(classes)]) {
  const hit = (styles.match(new RegExp(`\\.${cls}\\{[^}]+\\}`, "g")) || [])[0];
  if (hit) console.log("LIVE", cls, hit);
}
