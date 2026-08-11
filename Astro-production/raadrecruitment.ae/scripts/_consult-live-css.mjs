import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");
const live = await (
  await fetch("https://ngmanpower.com/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");

for (const cls of [
  "us_custom_54e80159",
  "us_custom_b03640aa",
  "us_custom_943b4079",
  "us_custom_86abb748",
  "us_custom_e11ab399",
]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`);
  console.log("local", cls, (css.match(re) || [])[0]);
  console.log("live ", cls, (styles.match(re) || [])[0]);
}

// Check btn style_3
const theme = readFileSync(join(ROOT, "public/css/impreza-theme-options.css"), "utf8");
console.log("btn3", (theme.match(/\.us-btn-style_3\{[^}]+\}/g) || []).slice(0, 2));
