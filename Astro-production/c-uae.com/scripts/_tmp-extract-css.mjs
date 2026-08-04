import fs from "node:fs";

const live = fs.readFileSync("scripts/_live-bsd.html", "utf8");
const styles = [];
const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m;
while ((m = re.exec(live))) styles.push(m[1]);
const withForm = styles.filter(
  (s) => s.includes("form-main") || s.includes("step-count") || s.includes("Multi Step"),
);
console.log("blocks", withForm.length, withForm.map((s) => s.length));
fs.writeFileSync("scripts/_live-inline-form.css", withForm.join("\n\n/* --- */\n\n"));

// Find Customizer / Elementor Custom CSS snippets mentioning form
const hits = [];
for (const s of styles) {
  if (/form-main|info-data|back-next|step-count|Manrope/.test(s)) hits.push(s);
}
console.log("hits", hits.length);
for (const h of hits) {
  const i = h.search(/\.form-main|Multi Step|\.info-data|\.step-count/);
  if (i >= 0) console.log("---\n", h.slice(Math.max(0, i - 50), i + 2500));
}

// Check if live loads Manrope via elementor fonts in HTML differently (escaped)
console.log("live manrope.css?", live.includes("manrope.css"));
console.log("live Manrope font-family count", (live.match(/Manrope/g) || []).length);

// Local manrope css
const manrope = fs.readFileSync(
  "public/wp-content/uploads/elementor/google-fonts/css/manrope.css",
  "utf8",
);
console.log("local manrope.css:\n", manrope.slice(0, 800));

// Check font files exist
const fontUrls = [...manrope.matchAll(/url\(([^)]+)\)/g)].map((x) => x[1].replace(/['"]/g, ""));
console.log("font urls", fontUrls.slice(0, 5));
for (const u of fontUrls.slice(0, 8)) {
  const path = u.startsWith("/")
    ? `public${u}`
    : `public/wp-content/uploads/elementor/google-fonts/css/${u}`;
  console.log(path, fs.existsSync(path) ? "OK" : "MISSING");
}
