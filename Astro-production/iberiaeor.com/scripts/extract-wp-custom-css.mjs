import fs from "node:fs";

const live = fs.readFileSync("_crawl/live-home.html", "utf8");

// Prefer WordPress Additional CSS / Elementor custom CSS block
const customMatch = live.match(/<style id="wp-custom-css">([\s\S]*?)<\/style>/i);
const custom = customMatch
  ? customMatch[1]
  : [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
      .map((m) => m[1])
      .find((css) => css.includes(".wpcf7") && css.includes(".yellow")) || "";

const cleaned = custom
  .replaceAll("https://spheavyrental.ae", "")
  .replaceAll("http://spheavyrental.ae", "")
  .trim();

fs.mkdirSync("public/css", { recursive: true });
fs.writeFileSync("public/css/wp-custom.css", cleaned);
console.log("wp-custom.css bytes", cleaned.length);
console.log(cleaned.slice(0, 500));
