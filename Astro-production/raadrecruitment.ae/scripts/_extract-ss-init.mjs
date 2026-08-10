import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((x) => x.path === "/");
const html = home.bodyHtml || home.content;

console.log("has SmartSliderSimple", html.includes("SmartSliderSimple"));
console.log("has _N2.r", html.includes("_N2.r"));
console.log("has n2-ss-2", html.includes("n2-ss-2"));
console.log("What they idx", html.indexOf("What they"));
console.log("Govt idx", html.indexOf("We are Govt"));

// Icon images near Govt
const chunk = html.slice(html.indexOf("We are Govt") - 1500, html.indexOf("We are Govt") + 2500);
const imgs = [...chunk.matchAll(/src=["']([^"']+)["']/g)].map((m) => m[1]);
console.log("imgs near Govt:", imgs);

// Industries Placeholder
console.log("Placeholder.jpg present", html.includes("Placeholder.jpg"));
const ind = html.indexOf("NG Provide");
console.log("NG Provide idx", ind);
if (ind >= 0) console.log(html.slice(ind, ind + 1200).replace(/\s+/g, " ").slice(0, 900));

// Extract full SS init from live and save
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "NG/1.0" } })
).text();
const m = live.match(
  /<script>_N2\.r\('documentReady',function\(\)\{n2const\.prefersReducedMotion=false;_N2\.r\(\["documentReady","smartslider-frontend","SmartSliderWidgetArrowImage","ss-simple"\],function\(\)\{new _N2\.SmartSliderSimple\('n2-ss-2',[\s\S]*?\}\);?\}\);?<\/script>/
);
console.log("\nlive init match", !!m, m ? m[0].length : 0);
if (m) {
  writeFileSync(join(ROOT, "public/scripts/smartslider-n2-ss-2-init.js"), m[0].replace(/^<script>/, "").replace(/<\/script>$/, ""));
  console.log("wrote init js");
}

// Also check n2const bootstrap
const n2const = live.match(/<script[^>]*>[\s\S]*?n2const[\s\S]*?<\/script>/gi)?.filter((s) => s.includes("n2const") && !s.includes("SmartSliderSimple"));
console.log("n2const scripts", n2const?.length);
for (const s of n2const?.slice(0, 3) || []) console.log(s.slice(0, 500));

// Compare icon markup live vs local for Govt section
const liveGovt = live.indexOf("We are Govt");
const liveChunk = live.slice(liveGovt - 2000, liveGovt + 3000);
console.log("\nLIVE icon markup sample:");
console.log([...liveChunk.matchAll(/w-iconbox[\s\S]{0,400}/g)].slice(0, 2).map((x) => x[0].replace(/\s+/g, " ").slice(0, 350)));

// Check if live uses font icons elsewhere with different Vector
const liveVectors = [...live.matchAll(/uploads\/2023\/05\/[^"' ]+\.(png|svg|webp|jpg)/gi)].map((m) => m[0]);
console.log("\nunique 2023/05 assets on live home", [...new Set(liveVectors)]);
