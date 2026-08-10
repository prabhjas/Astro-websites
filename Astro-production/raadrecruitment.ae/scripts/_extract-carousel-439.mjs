import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/").bodyHtml;

const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();

// Find carousel 439 markup + data-swiper
for (const [label, html] of [
  ["LOCAL", home],
  ["LIVE", live],
]) {
  const i = html.indexOf("wpcp-wrapper-439");
  console.log("\n", label, "wrapper idx", i);
  if (i < 0) continue;
  const chunk = html.slice(i, i + 3500);
  console.log(chunk.replace(/\s+/g, " ").slice(0, 2000));
  // data attributes
  const data = chunk.match(/data-[a-z-]+="[^"]{0,200}"/gi);
  console.log("data attrs", data?.slice(0, 30));
}

// Find style for 439 on live
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const for439 = styles.filter((s) => /439|wpcp-wrapper-439|sp-wpcp-439/i.test(s));
console.log("\nstyle blocks with 439:", for439.length);
for (const s of for439) {
  writeFileSync(join(ROOT, "public/css/wp-carousel-439-inline.css"), s);
  console.log("wrote 439 css len", s.length, s.slice(0, 400));
}

// Also check link tags for carousel css with 439
const links = [...live.matchAll(/href="([^"]*439[^"]*)"/gi)].map((m) => m[1]);
console.log("links 439", links);

// WP localized script - look for wpcp_ajax / sp_wpcp_ajax
const ajax = live.match(/var\s+\w*(wpcp|carousel)\w*\s*=\s*\{[\s\S]{0,500}\}/gi);
console.log("ajax vars", ajax);

// Script after carousel public
const after = live.indexOf("wp-carousel-free-public.min.js");
console.log("after public js", live.slice(after, after + 1500).match(/<script[\s\S]*?<\/script>/gi)?.slice(0, 4)?.map((x) => x.slice(0, 300)));

// Check wp-custom counter_r and stats
const wpCustom = readFileSync(join(ROOT, "public/css/wp-custom.css"), "utf8");
const bits = wpCustom.match(/[\s\S]{0,40}stats-number[\s\S]{0,200}|[\s\S]{0,40}counter_r[\s\S]{0,200}|[\s\S]{0,40}counter_suffix[\s\S]{0,200}/gi);
console.log("\nwp-custom stats", bits);

// Smart slider - verify n2const exists in n2.min.js
const n2 = readFileSync(
  join(ROOT, "public/wp-content/plugins/smart-slider-3/Public/SmartSlider3/Application/Frontend/Assets/dist/n2.min.js"),
  "utf8",
);
console.log("n2 has n2const", n2.includes("n2const"), "has _N2", n2.includes("_N2"));

// Check if SS init might fail - look for documentReady
console.log("n2 documentReady", /documentReady/.test(n2));
