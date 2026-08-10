import fs from "node:fs";
import path from "node:path";

const ORIGIN = "";

async function download(rel) {
  const dest = path.join("public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) return;
  const res = await fetch(ORIGIN + rel);
  if (!res.ok) {
    console.warn("skip", res.status, rel);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log("saved", rel, fs.statSync(dest).size);
}

// Find hero image references
const css = fs.readFileSync("public/wp-content/uploads/elementor/css/post-10.css", "utf8");
const urls = [...css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]);
console.log("post-10 urls:");
for (const u of urls) console.log(" ", u);

// Download common Elementor runtime bundles referenced by errors + directory listing via known names
const bundles = [
  "/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.4c8abccc3e268b0767b2.bundle.min.js",
  "/wp-content/plugins/elementor-pro/assets/js/nav-menu.a23fbd67486c5bedf26c.bundle.min.js",
  "/wp-content/uploads/2025/06/HERO-SECTION-MAIN.webp",
  "/wp-content/uploads/2025/06/Middle-Luna-image.webp",
  "/wp-content/uploads/2025/06/we-Serve-Dubais-Core-Industries-image.webp",
  "/wp-content/uploads/2025/06/Our-mission-and-values-image.webp",
];

// Also scrape any missing /wp-content/ images from local homepage body
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const home = pages.find((p) => p.path === "/");
const imgs = [...(home?.bodyHtml || "").matchAll(/(?:src|data-src)=["']([^"']+)["']/g)].map((m) => m[1]);
const bg = [...(home?.bodyHtml || "").matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]);

for (const u of [...new Set([...bundles, ...imgs, ...bg, ...urls])]) {
  let rel = u.split("?")[0];
  if (rel.startsWith("http")) {
    try {
      rel = new URL(rel).pathname;
    } catch {
      continue;
    }
  }
  if (!rel.startsWith("/wp-content") && !rel.startsWith("/wp-includes")) continue;
  await download(rel);
}

// Try to fetch elementor assets directory index won't work; parse frontend.min.js for bundle names
const frontend = fs.readFileSync("public/wp-content/plugins/elementor/assets/js/frontend.min.js", "utf8");
const proHandlers = fs.readFileSync(
  "public/wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js",
  "utf8",
);
const names = [
  ...frontend.matchAll(/([a-z0-9-]+\.[a-f0-9]+\.bundle\.min\.js)/gi),
  ...proHandlers.matchAll(/([a-z0-9-]+\.[a-f0-9]+\.bundle\.min\.js)/gi),
].map((m) => m[1]);
console.log("bundle refs", [...new Set(names)].length);
for (const name of [...new Set(names)]) {
  const base = name.includes("nav-menu") || name.includes("carousel") || name.includes("form") || name.includes("video") || name.includes("sticky") || name.includes("shared")
    ? name.includes("nav-menu") || name.startsWith("ajax") // guess path
      ? null
      : null
    : null;
  // Try elementor path then elementor-pro path
  for (const prefix of [
    "/wp-content/plugins/elementor/assets/js/",
    "/wp-content/plugins/elementor-pro/assets/js/",
  ]) {
    const dest = path.join("public", (prefix + name).slice(1));
    if (fs.existsSync(dest)) break;
    const res = await fetch(ORIGIN + prefix + name);
    if (res.ok) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log("bundle", prefix + name);
      break;
    }
  }
}
