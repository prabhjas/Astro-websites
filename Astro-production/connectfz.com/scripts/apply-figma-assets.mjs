#!/usr/bin/env node
/**
 * Copy Connect FZ Figma/OPTIMIZED pack into public uploads and
 * rewrite absolute connectfz.com media URLs in CSS/HTML.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = "/Users/rajpalsingh/Downloads/Connect FZ - Assets/OPTIMIZED";
const DEST = path.join(ROOT, "public/wp-content/uploads/figma-pack");
const PUBLIC = path.join(ROOT, "public");

const ALIASES = {
  "UAE-VISA-SERVICES-bg-scaled-1.webp": "UAE-VISA-SERVICES-bg.jpg",
  "UAE-VISA-SERVICES-bg.jpg": "UAE-VISA-SERVICES-bg.jpg",
  "Pricing-1-scaled.jpg": "Pricing.jpg",
  "Pricing.jpg": "Pricing.jpg",
  "Process-Bkg-Desktop.png": "bg-steps.jpg",
  "Process-Bkg-Mobile.png": "bg-steps.jpg",
  "FAQ-Bkg-Desktop.png": "bg2.jpg",
  "FAQ-Bkg-Mobile.png": "bg2.jpg",
  "bg-steps.jpg": "bg-steps.jpg",
  "bg2.jpg": "bg2.jpg",
  "Group 61.png": "Group 61.png",
  "Logo.png": "Logo.png",
};

function copyPack() {
  fs.mkdirSync(DEST, { recursive: true });
  for (const name of fs.readdirSync(PACK)) {
    if (name.startsWith(".")) continue;
    const src = path.join(PACK, name);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, path.join(DEST, name));
  }
}

function slugName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildPackIndex() {
  const map = new Map();
  for (const name of fs.readdirSync(DEST)) {
    map.set(slugName(name), `/wp-content/uploads/figma-pack/${name}`);
  }
  return map;
}

function rewriteAbsolute(text) {
  return text
    .replace(/https?:\/\/(?:www\.)?connectfz\.com(\/wp-content\/[^"'()\s]+)/gi, "$1")
    .replace(/url\(\s*\/\/connectfz\.com/gi, "url(");
}

function walk(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

copyPack();
const packIndex = buildPackIndex();

// Materialize expected WP paths from aliases so Elementor CSS keeps working
for (const [wpName, packName] of Object.entries(ALIASES)) {
  const packFile = path.join(DEST, packName);
  if (!fs.existsSync(packFile)) continue;
  const targets = [
    path.join(PUBLIC, "wp-content/uploads/2025/12", wpName),
    path.join(PUBLIC, "wp-content/uploads/2023/05", wpName),
    path.join(PUBLIC, "wp-content/uploads/2023/03", wpName),
  ];
  for (const dest of targets) {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(packFile, dest);
  }
}

let rewritten = 0;
const textFiles = [
  ...walk(path.join(ROOT, "src"), (f) => /\.(html|css|json|astro)$/.test(f)),
  ...walk(path.join(PUBLIC, "css"), (f) => /\.css$/.test(f)),
  ...walk(path.join(PUBLIC, "wp-content/uploads/elementor/css"), (f) => /\.css$/.test(f)),
];

for (const file of textFiles) {
  let raw = fs.readFileSync(file, "utf8");
  let next = rewriteAbsolute(raw);
  // swap missing golden-visa jpg to pack if referenced
  next = next.replaceAll(
    "/wp-content/uploads/2023/05/Get-unmatched-benefits-with-your-Golden-Visa-Based-on-Emirates.jpg",
    "/wp-content/uploads/figma-pack/Get-unmatched-benefits-with-your-Golden-Visa-Based-on-Emirates.jpg",
  );
  if (next !== raw) {
    fs.writeFileSync(file, next);
    rewritten++;
  }
}

console.log({ packFiles: fs.readdirSync(DEST).length, rewritten });
