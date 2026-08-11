import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const homeCss = readFileSync(join(ROOT, "public/css/page-design/home.css"), "utf8");
const pages = JSON.parse(readFileSync(join(ROOT, "src/data/pages.json"), "utf8"));
const home = pages.find((p) => p.path === "/");

const classes = [
  "us_custom_0665d8c8", // logo row section
  "us_custom_54e80159", // consultation grid
  "us_custom_e11ab399",
  "us_custom_943b4079",
  "us_custom_86abb748",
  "us_custom_7e0323ab", // stats heading
  "us_custom_ed0a943e",
  "us_custom_6b85a8c6", // what they says
  "us_custom_2873e29c",
  "us_custom_43884fc4",
  "us_custom_f678570c",
  "us_custom_5434396f",
  "counter_r",
  "stats-number",
];

for (const cls of classes) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`, "g");
  console.log(cls, (homeCss.match(re) || [])[0] || "MISSING");
}

// WPCP assets
const pageCss = home.pageCss || [];
console.log("\npageCss", pageCss);

const local = await (await fetch("http://127.0.0.1:5102/")).text();
const cssLinks = [...local.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
console.log(
  "\nwpcp css",
  cssLinks.filter((h) => /wpcp|carousel|swiper|wp-carousel/i.test(h)),
);
console.log(
  "ss css",
  cssLinks.filter((h) => /smartslider|n2-/i.test(h)),
);

// Scripts on page
const scripts = [...local.matchAll(/src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]);
console.log(
  "carousel/ss/counter js",
  scripts.filter((s) => /wpcp|carousel|swiper|smartslider|n2|countUp|custom\.min|ss-simple/i.test(s)),
);

// Check wpcp files exist
const candidates = [
  "public/wp-content/plugins/wp-carousel-pro",
  "public/wp-content/plugins/wp-carousel-free",
  "public/css/wp-carousel-free-inline.css",
  "public/scripts/swiper.min.js",
  "public/scripts/sp-carousels.js",
];
for (const c of candidates) {
  console.log(c, existsSync(join(ROOT, c)));
}

// Live: extract design CSS for consultation + counter
const live = await (
  await fetch("https://ngmanpower.com/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
for (const cls of ["us_custom_54e80159", "us_custom_e11ab399", "us_custom_943b4079", "us_custom_86abb748", "us_custom_6b85a8c6", "counter_r", "us_custom_0665d8c8"]) {
  const re = new RegExp(`\\.${cls}\\{[^}]+\\}`, "g");
  console.log("LIVE", cls, (styles.match(re) || [])[0] || "-");
}

// WPCP init inline on live
const wpcpInit = live.match(/wpcp[_-]|sp_wpcp|Swiper\([\s\S]{0,200}/gi);
console.log("\nlive wpcp mentions", (live.match(/wpcp|WPCP|sp-wpcp/gi) || []).length);
const liveScripts = [...live.matchAll(/<script[^>]*src="([^"]+)"/gi)].map((m) => m[1]);
console.log(
  "live carousel scripts",
  liveScripts.filter((s) => /carousel|swiper|wpcp/i.test(s)),
);

// Testimonial slide text visible without JS? check transform
console.log("\nlocal has Gary", local.includes("Gary H"));
console.log("live has Gary", live.includes("Gary H"));
