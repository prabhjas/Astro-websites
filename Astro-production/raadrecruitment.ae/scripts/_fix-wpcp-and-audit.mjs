import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();

// WPCP carousel JSON / init
const wpcpScripts = [...live.matchAll(/<script[^>]*>([\s\S]*?wpcp[\s\S]*?)<\/script>/gi)];
console.log("inline wpcp scripts", wpcpScripts.length);
for (const s of wpcpScripts.slice(0, 5)) {
  console.log("---", s[1].slice(0, 600));
}

// data attributes on carousel
const car = live.match(/id="sp-wpcp-439"[\s\S]{0,2500}/);
console.log("\ncarousel attrs", car?.[0]?.slice(0, 1500));

// Download missing WPCP JS if needed
const jsUrls = [
  "/wp-content/plugins/wp-carousel-free/public/js/preloader.min.js?ver=2.7.12",
  "/wp-content/plugins/wp-carousel-free/public/js/swiper-bundle.min.js?ver=2.7.12",
  "/wp-content/plugins/wp-carousel-free/public/js/wp-carousel-free-public.min.js?ver=2.7.12",
];

const outDir = join(ROOT, "public/wp-content/plugins/wp-carousel-free/public/js");
mkdirSync(outDir, { recursive: true });
for (const u of jsUrls) {
  const name = u.split("/").pop().split("?")[0];
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(join(outDir, name), buf);
  console.log("dl", name, r.status, buf.length);
}

// Also grab any localized script data
const loc = live.match(/var\s+sp_wpcp_[\w]+[\s\S]{0,2000}/gi) || live.match(/wpcp_vars[\s\S]{0,800}/gi);
console.log("loc", loc?.slice(0, 2));

// Contact section - man-constructor
const ci = live.indexOf("man-constructor-contact-form");
console.log("\ncontact img live", live.slice(ci - 100, ci + 200).replace(/\s+/g, " "));

// Check consultation p color issue - white sections hit by p{color:#000}
console.log("consultation white classes present");

// Stats numbers sample from live
const sn = live.match(/stats-number[^>]*>[\s\S]{0,80}/g);
console.log("stats", sn?.slice(0, 4));
