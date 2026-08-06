import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/").bodyHtml;
const design = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");

const sections = [
  ["logo/clients", /logo-eire|logo-dgrade|logo-abm|logo-Synergy|logo-rakez|protiviti|Questions\?/i],
  ["stats 700", /Helping Our Clients On 700/i],
  ["consultation", /Request a Consultation/i],
  ["industries", /NG Provide/i],
  ["testimonials", /What they says/i],
  ["contact form", /Contact us now/i],
];

for (const [name, re] of sections) {
  const m = home.match(re);
  console.log(name, !!m, m ? home.indexOf(m[0]) : -1);
}

// Pull chunks
function chunk(label, needle, before = 200, after = 1800) {
  const i = home.search(needle);
  console.log(`\n=== ${label} @${i} ===`);
  if (i < 0) return;
  console.log(home.slice(Math.max(0, i - before), i + after).replace(/\s+/g, " ").slice(0, 1600));
}

chunk("LOGOS", /logo-eire|Questions\?/i, 800, 2500);
chunk("STATS", /Helping Our Clients On 700/i, 400, 2500);
chunk("CONSULT", /Request a Consultation/i, 400, 2000);
chunk("INDUSTRIES", /NG Provide/i, 100, 2000);
chunk("TESTI", /What they says/i, 100, 500);
chunk("CONTACT", /Contact us now/i, 400, 1500);

// Key images existence
const imgs = [
  ...home.matchAll(/src="(\/wp-content\/uploads\/[^"]+)"/g),
].map((m) => m[1]);
const unique = [...new Set(imgs)];
const missing = unique.filter((p) => !existsSync(join(ROOT, "public", p.replace(/^\//, ""))));
console.log("\nunique imgs", unique.length, "missing", missing.length);
console.log(missing.slice(0, 20));

// Counter / carousel classes
console.log("\nult_counter", (home.match(/ult_counter|stats-block|w-counter/gi) || []).slice(0, 10));
console.log("carousel", (home.match(/class="[^"]*(carousel|owl|swiper|logo)[^"]*"/gi) || []).slice(0, 15));
