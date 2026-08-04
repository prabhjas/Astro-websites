import fs from "node:fs";

const live = fs.readFileSync("_crawl/live-home.html", "utf8");
const local = await (await fetch("http://127.0.0.1:4321/")).text();
fs.writeFileSync("_crawl/local-home-after.html", local);

const checks = [
  "elementor-kit-19",
  "elementor-location-header",
  "elementor-location-footer",
  "elementor-153",
  "elementor-158",
  "elementor-10",
  "HERO-SECTION-MAIN",
  "Bebas Neue",
  "SF Pro Display",
  "Get a free quote",
  "sp-header", // should NOT be present anymore
  "post-10.css",
  "post-153.css",
  "widget-nav-menu",
];

console.log("marker | live | local");
for (const c of checks) {
  console.log(`${c} | ${live.includes(c)} | ${local.includes(c)}`);
}

console.log("local title", local.match(/<title>([^<]+)/)?.[1]);
console.log("local body class", local.match(/<body[^>]*class="([^"]+)"/)?.[1]);
console.log("local stylesheets", (local.match(/rel="stylesheet"/g) || []).length);
console.log("local len", local.length, "live len", live.length);
