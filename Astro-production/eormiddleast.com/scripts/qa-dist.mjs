import fs from "node:fs";
import path from "node:path";

const checks = [
  "dist/index.html",
  "dist/about-us/index.html",
  "dist/generator-rental/index.html",
  "dist/blog/index.html",
  "dist/wheel-loaders-for-rent/index.html",
  "dist/sitemap-index.xml",
  "dist/robots.txt",
];
for (const f of checks) {
  console.log(f, fs.existsSync(f) ? fs.statSync(f).size : "MISSING");
}

const html = fs.readFileSync("dist/index.html", "utf8");
console.log("title", html.match(/<title>([^<]+)/)?.[1]);
console.log("has logo", html.includes("logo@2x.webp"));
console.log("has elementor", html.includes("elementor"));
console.log("has header cta", html.includes("Get a free quote"));
console.log("canonical", html.match(/rel="canonical" href="([^"]+)/)?.[1]);
console.log("stylesheet count", (html.match(/rel="stylesheet"/g) || []).length);
console.log("jsonld", (html.match(/application\/ld\+json/g) || []).length);

function countIndex(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += countIndex(p);
    else if (e.name === "index.html") n++;
  }
  return n;
}
console.log("index.html pages", countIndex("dist"));
