#!/usr/bin/env node
/**
 * Verify assets that Connect FZ actually serves.
 * Unused WP theme/CSS leftovers are ignored so the check matches production HTML.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif|ico|woff2?|ttf|eot)$/i;
const CSS_BLOCK = /hello-elementor|smart-slider-3|bebasneue|\/elementor\/css\/post-(?:8|19|153|158)\.css/;

function isOk(rel) {
  const file = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (!fs.existsSync(file) || fs.statSync(file).size < 40) return false;
  const head = fs.readFileSync(file).subarray(0, 24).toString("utf8");
  return !head.includes("<!DOCTYPE") && !head.includes("<html");
}

function collectFromText(text, into) {
  const re = /(?:src|href|data-src|data-lazy-src|url)\(?["']?(\/(?:wp-content|assets|css)\/[^"'()\s?#]+)/gi;
  let m;
  while ((m = re.exec(text))) {
    const rel = decodeURIComponent(m[1].replace(/\\/g, "").replace(/[.,;]+$/, ""));
    if (!rel.startsWith("/")) continue;
    if (CSS_BLOCK.test(rel)) continue;
    into.add(rel.split("?")[0]);
  }
}

const refs = new Set();

for (const name of ["pages.json", "posts.json", "header.html", "footer.html", "live-css-order.json"]) {
  const p = path.join(ROOT, "src/data", name);
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p, "utf8");
  if (name.endsWith(".json") && name !== "live-css-order.json") {
    const rows = JSON.parse(raw);
    for (const row of rows) {
      collectFromText(row.bodyHtml || row.content || "", refs);
      if (row.elementorCss) refs.add(row.elementorCss);
      if (row.featuredImage) refs.add(String(row.featuredImage).replace(/^https?:\/\/[^/]+/, ""));
    }
  } else {
    collectFromText(raw, refs);
  }
}

const cssDirs = [
  path.join(PUBLIC, "css"),
  path.join(PUBLIC, "wp-content/uploads/elementor/css"),
];
for (const dir of cssDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".css")) continue;
    collectFromText(fs.readFileSync(path.join(dir, name), "utf8"), refs);
  }
}

const missingImages = [];
const missingCss = [];
const checked = [];
for (const rel of [...refs].sort()) {
  if (IMG_EXT.test(rel)) {
    checked.push(rel);
    if (!isOk(rel)) missingImages.push(rel);
    continue;
  }
  if (rel.endsWith(".css") && (rel.startsWith("/css/") || rel.includes("/uploads/elementor/css/"))) {
    if (CSS_BLOCK.test(rel)) continue;
    checked.push(rel);
    if (!isOk(rel)) missingCss.push(rel);
  }
}

let untracked = [];
try {
  untracked = execSync("git ls-files --others --exclude-standard -- public/wp-content public/css", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
} catch {
  /* ignore */
}

const report = {
  checked: checked.length,
  missingImages: missingImages.length,
  missingCss: missingCss.length,
  untrackedUploads: untracked.length,
  missingImagesList: missingImages,
  missingCssSample: missingCss.slice(0, 20),
  untrackedSample: untracked.slice(0, 40),
};
fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "reports/local-asset-verify.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (missingImages.length) {
  console.error("\nAsset verify FAILED — missing images would 404 on live.");
  process.exit(1);
}
if (untracked.length) {
  console.warn(
    `\nWARN: ${untracked.length} public files are not in git. Commit or rsync public/wp-content/ before deploy or live will miss them.`,
  );
}
console.log("Asset verify OK.");
