import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "public/css/impreza-theme-options.css",
  "public/css/impreza-design-options.css",
  "public/css/page-design/home.css",
  "public/css/migration-overrides.css",
  "public/css/wp-custom.css",
];

const needles = [
  /[^{}]*w-iconbox[^{]*\{[^}]*color:[^}]+\}/gi,
  /[^{}]*\.l-section[^{]*p[^{]*\{[^}]*color:[^}]+\}/gi,
  /[^{}]*has_text_color[^{]*\{[^}]+\}/gi,
  /color:#0{1,3}[0-9a-f]{3,5}!important/gi,
];

for (const f of files) {
  const css = readFileSync(join(ROOT, f), "utf8");
  console.log("\n===", f, "len", css.length);
  // Find rules that set dark colors on p or iconbox
  const dark = [...css.matchAll(/[^{}]{0,80}\{[^}]{0,200}color:#(?:0{3,6}|1a1a1a|000e29|00133e|212529)[^}]*\}/gi)].slice(0, 15);
  console.log("dark color rules sample", dark.map((m) => m[0].slice(0, 180)));
}

// Check order: which CSS wins for .us_custom_add3fd8d .w-iconbox-text p
const all = files.map((f) => readFileSync(join(ROOT, f), "utf8")).join("\n");
const pRules = [...all.matchAll(/[^{}\n]*p[^{}\n]*\{[^}]*color:[^}]+\}/gi)]
  .filter((m) => /iconbox|add3fd8d|section|content|body|l-main/i.test(m[0]))
  .slice(0, 20);
console.log("\np color rules", pRules.map((m) => m[0].slice(0, 200)));
