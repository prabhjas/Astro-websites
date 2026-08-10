import fs from "node:fs";

const html = await (await fetch("http://127.0.0.1:5092/contact-us/")).text();
const hrefs = [...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1].split("?")[0]);
console.log("relevant css links:");
for (const h of hrefs) {
  if (/live-inline|wp-custom|child-theme|wpr-used|migration|post-57|post-19|cf7|styles\.css/i.test(h)) {
    console.log(h);
  }
}

const wpr = fs.readFileSync("public/css/wpr-used.css", "utf8");
console.log("\nwpr-used has wpcf7-submit", wpr.includes("wpcf7-submit"));
console.log("wpr-used has FFDD04 submit?", /wpcf7-submit\{[^}]*FFDD04/i.test(wpr));
const idx = wpr.indexOf(".wpcf7-submit");
console.log("snippet", wpr.slice(idx, idx + 200));
