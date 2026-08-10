import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");

for (const cls of ["us_custom_b1c9dc42", "us_custom_a4ebe4e2", "us_custom_0c6eec21", "us_custom_54e80159"]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`);
  console.log("local", cls, (css.match(re) || [])[0] || "-");
  console.log("live ", cls, (styles.match(re) || [])[0] || "-");
}
