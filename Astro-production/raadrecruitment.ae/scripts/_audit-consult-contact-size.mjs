import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/").bodyHtml;
const css = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");
const overrides = readFileSync(join(ROOT, "public/css/migration-overrides.css"), "utf8");

function chunk(label, re, n = 2500) {
  const m = home.match(re);
  const i = m ? home.indexOf(m[0]) : -1;
  console.log(`\n=== ${label} @${i} ===`);
  if (i < 0) return;
  console.log(home.slice(i - 400, i + n).replace(/\s+/g, " ").slice(0, 2000));
}

chunk("CONSULT", /Request a Consultation/);
chunk("CONTACT FORM", /Contact us now/);

// Related custom classes
const classes = [
  "us_custom_54e80159",
  "us_custom_e11ab399",
  "us_custom_943b4079",
  "us_custom_86abb748",
  "us_custom_9c7b8ea7",
  "us_custom_8d45c27c",
];
// Find contact form section classes near Contact us now
const ci = home.indexOf("Contact us now");
const around = home.slice(ci - 2500, ci + 1500);
const found = [...around.matchAll(/us_custom_[a-f0-9]+/g)].map((m) => m[0]);
console.log("\nclasses near contact form", [...new Set(found)]);

for (const cls of [...new Set([...classes, ...found])]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`);
  console.log(cls, (css.match(re) || [])[0] || "MISSING in home.css");
}

console.log("\noverrides consult/contact bits:");
console.log(
  overrides
    .split("\n")
    .filter((l) => /54e80159|consult|constructor|Contact|form|Group-21|man-constructor/i.test(l))
    .join("\n"),
);

// Live CSS for same classes
const live = await (
  await fetch("https://ngmanpower.com/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
for (const cls of [...new Set([...classes, ...found])]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`, "g");
  const hit = (styles.match(re) || [])[0];
  if (hit) console.log("LIVE", cls, hit);
}

// Image sizes in markup
console.log("\nGroup-21", home.match(/Group-21\.png[^>]*/)?.[0]);
console.log("man-constructor", home.match(/man-constructor-contact-form\.png[^>]*/)?.[0]);
