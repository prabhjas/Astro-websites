import fs from "node:fs";
import path from "node:path";

const root = "Astro-production/eormiddleast.com/public";
const needed = [
  "js/phone-flags/flags.png",
  "js/phone-flags/flags@2x.png",
  "wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js",
  "wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js",
  "wp-includes/js/jquery/jquery.min.js",
  "scripts/phone-flags.js",
  "scripts/cf7-bridge.js",
];
for (const rel of needed) {
  const p = path.join(root, rel);
  console.log(fs.existsSync(p) ? `${fs.statSync(p).size}\t${rel}` : `MISSING\t${rel}`);
}

const pages = JSON.parse(
  fs.readFileSync("Astro-production/eormiddleast.com/src/data/pages.json", "utf8"),
);
const p = pages.find((x) => x.path === "/contact-us/");
const h = p?.bodyHtml || "";
console.log("contact body", h.length);
console.log("wpcf7", h.includes("wpcf7"));
console.log("elementor-form", h.includes("elementor-form"));
console.log("form tag", (h.match(/<form/gi) || []).length);
const names = [...h.matchAll(/name="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 50);
console.log("field names", names);

// also check homepage popup forms
const home = pages.find((x) => x.path === "/");
const hh = home?.bodyHtml || "";
console.log("home wpcf7", hh.includes("wpcf7"), "elementor-form", hh.includes("elementor-form"));
