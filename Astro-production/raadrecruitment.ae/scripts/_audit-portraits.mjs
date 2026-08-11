import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const html = pages.find((p) => p.path === "/manufacturing/").bodyHtml;

// Find circular-looking content / portrait images early in page
const imgs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).slice(0, 40);
console.log(imgs);

// Dump sections 2-4 more carefully
let idx = 0;
for (let n = 0; n < 5; n++) {
  const start = html.indexOf("<section", idx);
  const end = html.indexOf("</section>", start) + 10;
  const chunk = html.slice(start, end);
  const cls = (chunk.match(/us_custom_[a-f0-9]+/) || [])[0];
  const imgCount = (chunk.match(/<img /g) || []).length;
  const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  console.log("\n#", n + 1, cls, "imgs", imgCount, "len", chunk.length);
  console.log(text);
  idx = end;
}

// Check live for social proof circles after hero on manufacturing
const live = await (
  await fetch("https://ngmanpower.com/manufacturing/?nowprocket=1", {
    headers: { "User-Agent": "NG/1.0" },
  })
).text();
const liveMain = live.slice(live.indexOf("page-content"), live.indexOf("page-content") + 15000);
console.log("\nlive after INDUSTRY snippet:");
const li = live.indexOf("INDUSTRY");
console.log(live.slice(li, li + 3500).replace(/\s+/g, " ").slice(0, 1500));
