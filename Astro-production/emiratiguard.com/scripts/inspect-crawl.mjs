import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://spheavyrental.ae";
const html = fs.readFileSync("_crawl/homepage.html", "utf8");
const hrefs = [...html.matchAll(/href=(["'])(.*?)\1/g)].map((m) => m[2]);
const cssHrefs = hrefs.filter((u) => u.includes(".css"));
console.log("css hrefs", cssHrefs.length);
cssHrefs.forEach((u) => console.log(u));

const links = html.match(/<link[^>]+>/g) || [];
console.log("\nlink count", links.length);
links.slice(0, 40).forEach((l) => console.log(l));

// Also check data dir
for (const f of ["pages.json", "posts.json", "site.json", "seo.json"]) {
  const p = path.join("src/data", f);
  console.log(f, fs.existsSync(p) ? fs.statSync(p).size : "MISSING");
}

console.log("node_modules", fs.existsSync("node_modules"));
console.log("public uploads files", countFiles("public/wp-content"));
console.log("header len", fs.existsSync("_crawl/header.html") ? fs.statSync("_crawl/header.html").size : 0);
console.log("footer len", fs.existsSync("_crawl/footer.html") ? fs.statSync("_crawl/footer.html").size : 0);

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) n += countFiles(p);
    else n++;
  }
  return n;
}
