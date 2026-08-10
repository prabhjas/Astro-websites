import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const homeCss = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");
const design = readFileSync(join(ROOT, "public/css/impreza-design-options.css"), "utf8");
const theme = readFileSync(join(ROOT, "public/css/impreza-theme-options.css"), "utf8");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/").bodyHtml;

for (const cls of [
  "us_custom_add3fd8d",
  "us_custom_41b180c8",
  "us_custom_8d45c27c",
  "us_custom_9c7b8ea7",
  "us_custom_2873e29c",
  "us_custom_c283c4f3",
]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`, "g");
  console.log(
    cls,
    "\n  home:",
    (homeCss.match(re) || [])[0] || "-",
    "\n  design:",
    (design.match(re) || [])[0] || "-",
    "\n  theme:",
    (theme.match(re) || [])[0] || "-",
  );
}

const ids = [...home.matchAll(/id="(n2-ss-\d+)"/g)].map((m) => m[1]);
console.log("\nsliders", ids);

// Placeholder context
const pi = home.indexOf("Placeholder.jpg");
console.log("\nPlaceholder context:\n", home.slice(pi - 300, pi + 200).replace(/\s+/g, " "));

// Count iconboxes
console.log("iconbox count", (home.match(/w-iconbox /g) || []).length);
console.log("Vector.png count", (home.match(/Vector\.png/g) || []).length);

// Check live color of iconbox text via design CSS on live page
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "NG/1.0" } })
).text();
const styleBlocks = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const joined = styleBlocks.join("\n");
for (const cls of ["us_custom_add3fd8d", "us_custom_41b180c8"]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`, "g");
  console.log("LIVE", cls, (joined.match(re) || []).join(" | "));
}

// Check computed-ish: any rule for .w-iconbox-text or p inside add3fd8d
const textRules = joined.match(/[^{}]*add3fd8d[^{]*\{[^}]+\}/gi) || [];
console.log("LIVE add3fd8d all", textRules);
const iconText = joined.match(/[^{}]*w-iconbox-text[^{]*\{[^}]+\}/gi) || [];
console.log("LIVE iconbox-text", iconText.slice(0, 5));
