import fs from "node:fs";

const css = fs.readFileSync("public/wp-content/uploads/elementor/css/post-980.css", "utf8");
const i = css.indexOf("5028b2e");
console.log("css", css.slice(i, i + 550));

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const p = pages.find((x) => (x.path || "").includes("forklift"));
const h = p.bodyHtml;
const j = h.indexOf("5028b2e");
console.log("html", h.slice(j, j + 500));
console.log(
  "bg refs",
  [...new Set(h.match(/Forklift[^"'\\\s>]+/g) || [])].slice(0, 15),
);

// Also fix any remaining unicode/encoded refs in pages.json via replace
const ascii =
  "/wp-content/uploads/2025/07/Forklift-Rental-in-the-UAE---Fast-Safe-Affordable-image-service.webp";
let raw = fs.readFileSync("src/data/pages.json", "utf8");
const before = raw.length;
raw = raw
  .replace(
    /\/wp-content\/uploads\/2025\/07\/Forklift-Rental-in-the-UAE-(?:%E2%80%93|\u2013|–|â€“)-Fast-Safe-Affordable-image-service\.webp/g,
    ascii,
  )
  .replace(
    /\/wp-content\/uploads\/2025\/07\/Forklift-Rental-in-the-UAE-\\u2013-Fast-Safe-Affordable-image-service\.webp/g,
    ascii,
  );
if (raw.length !== before || raw.includes("Fast-Safe-Affordable")) {
  fs.writeFileSync("src/data/pages.json", raw);
  console.log("pages.json rewritten for forklift bg");
}

// fallback css
let fb = fs.readFileSync("public/css/elementor-bg-fallback.css", "utf8");
if (fb.includes("5028b2e") || fb.includes("Fast-Safe")) {
  console.log(
    "fallback snippet",
    fb
      .split("\n")
      .filter((l) => l.includes("5028b2e") || l.includes("Fast-Safe"))
      .join("\n")
      .slice(0, 400),
  );
}
