import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const style = readFileSync(
  join(ROOT, "public/wp-content/themes/Impreza/css/style.min.css"),
  "utf8",
);
const theme = readFileSync(join(ROOT, "public/css/impreza-theme-options.css"), "utf8");

for (const re of [
  /\.w-iconbox-title\{[^}]+\}/g,
  /\.w-iconbox-text\{[^}]+\}/g,
  /\.w-iconbox-text p\{[^}]+\}/g,
  /h4\{[^}]+\}/g,
  /\.w-iconbox\.color_primary[^{]*\{[^}]+\}/g,
]) {
  console.log(re, [...style.matchAll(re)].slice(0, 3).map((m) => m[0]));
  console.log("theme", [...theme.matchAll(re)].slice(0, 3).map((m) => m[0]));
}

// Fetch live homepage CSS for h4 / iconbox title in us-customizer
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "NG/1.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
console.log("\nlive h4", styles.match(/h4\{[^}]+\}/g));
console.log("live iconbox-title", styles.match(/[^{}]*iconbox-title[^{}]*\{[^}]+\}/gi));
console.log("live color-content-heading", styles.match(/--color-content-heading:[^;]+/g));

// Check if live actually shows readable text - maybe they use color on title via white
// Look at computed style from a screenshot... we can't. Check for .color_primary title color
console.log(
  "style primary title",
  style.match(/w-iconbox\.color_primary[\s\S]{0,200}title[\s\S]{0,100}/)?.[0]?.slice(0, 250),
);
