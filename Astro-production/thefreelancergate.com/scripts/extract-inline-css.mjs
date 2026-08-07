import fs from "node:fs";

const live = fs.readFileSync("_crawl/live-home.html", "utf8");
const styles = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m, i) => ({
  i,
  len: m[1].length,
  head: m[1].slice(0, 120).replace(/\s+/g, " "),
  id: (m[0].match(/id="([^"]+)"/) || [])[1] || "",
}));
console.log("style tags", styles.length);
for (const s of styles) console.log(s.i, s.id, s.len, s.head);

// Combine all meaningful custom styles (skip tiny)
const custom = [...live.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  .map((m) => m[1])
  .filter((css) => css.length > 200)
  .join("\n\n/* ---- */\n\n");

const cleaned = custom
  .replaceAll("https://spheavyrental.ae", "")
  .replaceAll("http://spheavyrental.ae", "");

fs.mkdirSync("public/css", { recursive: true });
fs.writeFileSync("public/css/live-inline.css", cleaned);
console.log("wrote live-inline.css", cleaned.length);

// Also check Trusted text
console.log("has Trusted", live.includes("Trusted"));
console.log("has Partner", live.includes("Partner"));
console.log("has ARAB", live.includes("ARAB"));
