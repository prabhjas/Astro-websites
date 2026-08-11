import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const live = await (
  await fetch("https://ngmanpower.com/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();

const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const carouselCss = styles.find((s) => s.includes("sp-wp-carousel-free-id-439") && s.includes("wpcf-fancybox"));
if (!carouselCss) throw new Error("439 css not found");
writeFileSync(join(ROOT, "public/css/wp-carousel-439-inline.css"), carouselCss + "\n");
console.log("wrote 439 css", carouselCss.length);

// Extract counter CSS from live wp-custom / inline
const counterCss = styles
  .flatMap((s) => s.match(/\.stats-number\{[^}]+\}|\.counter_suffix\{[^}]+\}|\.stats-desc[^\{]*\{[^}]+\}|\.counter_r[^\{]*\{[^}]+\}/gi) || [])
  .join("\n");
console.log("counter rules", counterCss);

// wp-custom local
const wp = readFileSync(join(ROOT, "public/css/wp-custom.css"), "utf8");
const idx = wp.indexOf("stats-number");
console.log("wp-custom stats idx", idx);
if (idx >= 0) console.log(wp.slice(idx - 80, idx + 400));

// Read WPCP public JS to see init selector
const pub = readFileSync(
  join(ROOT, "public/wp-content/plugins/wp-carousel-free/public/js/wp-carousel-free-public.min.js"),
  "utf8",
);
console.log("public js snippet", pub.slice(0, 500));
console.log("has data-swiper", pub.includes("data-swiper"), "has wpcp", pub.includes("wpcp"));
