import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");

// Pull all stats/counter related rules
const rules = styles.match(/[^{}]*stats[^{}]*\{[^}]+\}|[^{}]*counter_[^{}]*\{[^}]+\}/gi) || [];
console.log(rules.join("\n\n"));

// Quote image size on live vs local design
const quote = styles.match(/[^{}]*bxs_quote|us_custom_2416bfe9[^{}]*\{[^}]+\}/gi);
console.log("\nquote", quote);

// Industries image column
const ind = styles.match(/\.us_custom_ac5d29cc\{[^}]+\}|\.us_custom_43884fc4\{[^}]+\}/g);
console.log("ind", ind);

// Contact form section design
const contact = styles.match(/\.us_custom_[a-f0-9]+\{[^}]*contact|man-constructor/gi);
// Find section with contact form bg
const formBg = styles.match(/[^{}]*\{[^}]*man-constructor[^}]*\}/gi);
console.log("formBg", formBg);

// WP Armour
console.log("wpa in live", /wpa_|WP Armour|honeypot/i.test(live));
