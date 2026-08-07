import fs from "node:fs";

const css = fs.readFileSync("public/wp-content/uploads/elementor/css/post-10.css", "utf8");
const html = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8")).find((p) => p.path === "/").bodyHtml;

// Find core services / contact related element IDs from HTML
const needles = ["CORE SERVICES", "Core Services", "NEED HELP", "Need Help", "Contact us now", "CONTACT US"];
for (const n of needles) {
  const i = html.toLowerCase().indexOf(n.toLowerCase());
  console.log("\n===", n, i, "===");
  if (i >= 0) {
    const slice = html.slice(Math.max(0, i - 500), i + 200);
    const ids = [...slice.matchAll(/elementor-element-([a-f0-9]+)/g)].map((m) => m[1]);
    console.log("nearby ids", [...new Set(ids)]);
    console.log(slice.replace(/\s+/g, " ").slice(0, 400));
  }
}

// Dump background-related rules from post-10
const bgRules = [...css.matchAll(/\{[^}]*background[^}]*\}/gi)];
console.log("\nbg rule count", bgRules.length);

// Extract section rules with background-color
const sectionBgs = [...css.matchAll(/(\.elementor-10[^,{]*?)\{([^}]*background[^}]*)\}/gi)];
for (const m of sectionBgs.slice(0, 40)) {
  console.log(m[1].slice(0, 120), "=>", m[2].replace(/\s+/g, " ").slice(0, 180));
}
