import fs from "node:fs";

const h = fs.readFileSync(new URL("./sample-post.html", import.meta.url), "utf8");
const idx = h.indexOf('data-elementor-type="single-post"');
console.log("idx", idx);
console.log(h.slice(Math.max(0, idx - 200), idx + 300));

// Find opening tag more carefully - walk back to <div or <section or <main
let start = idx;
while (start > 0 && h[start] !== "<") start--;
console.log("\nopening candidate:", h.slice(start, start + 120));

// Try cheerio-less: match elementor-element with single-post
const re =
  /<(div|section|main)[^>]*data-elementor-type="single-post"[^>]*>/i;
const m = h.match(re);
console.log("regex match", m?.[0]?.slice(0, 200));
