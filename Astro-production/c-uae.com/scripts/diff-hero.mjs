import fs from "node:fs";

function snippetAround(html, needle, radius = 400) {
  const i = html.indexOf(needle);
  if (i < 0) return `MISSING ${needle}`;
  return html.slice(Math.max(0, i - 120), Math.min(html.length, i + radius));
}

const live = fs.readFileSync("_crawl/live-home.html", "utf8");
const local = fs.readFileSync("_crawl/local-home-after.html", "utf8");

const needles = [
  "HERO-SECTION-MAIN",
  "elementor-element-6f9e53a", // may differ
  "Your Trusted Equipment Partner",
  "background_background",
  "elementor-background-overlay",
  "top-header",
];

for (const n of needles) {
  console.log("\n====", n, "====");
  console.log("LIVE:", snippetAround(live, n).replace(/\s+/g, " ").slice(0, 300));
  console.log("LOCAL:", snippetAround(local, n).replace(/\s+/g, " ").slice(0, 300));
}

// Compare first section of page content
const livePage = live.match(/data-elementor-type="wp-page"[\s\S]{0,800}/)?.[0];
const localPage = local.match(/data-elementor-type="wp-page"[\s\S]{0,800}/)?.[0];
console.log("\nLIVE page start", livePage?.replace(/\s+/g, " ").slice(0, 500));
console.log("\nLOCAL page start", localPage?.replace(/\s+/g, " ").slice(0, 500));

// Check hero image file
for (const f of [
  "public/wp-content/uploads/2025/06/HERO-SECTION-MAIN.webp",
  "public/wp-content/uploads/2025/06/background-organge-purple.webp",
  "public/wp-content/uploads/2025/07/Generator-Rental-Service-Page-image.webp",
]) {
  console.log(f, fs.existsSync(f) ? fs.statSync(f).size : "MISSING");
}

// Check if post-10.css hero rule exists in linked CSS content on disk
const css = fs.readFileSync("public/wp-content/uploads/elementor/css/post-10.css", "utf8");
const heroRule = css.match(/HERO-SECTION-MAIN[\s\S]{0,200}/);
console.log("hero css rule", heroRule?.[0]);
