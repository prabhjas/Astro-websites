#!/usr/bin/env node
/**
 * Import designer-provided Figma export assets into public/wp-content/uploads
 * at every path referenced by pages.json, posts.json, and public CSS.
 *
 * Matches by normalized basename (spaces/commas/% → hyphens).
 * Prefers correct extension; overwrites missing or placeholder files.
 *
 * Usage:
 *   node scripts/import-figma-assets.mjs "/path/to/Connect Zone - Assets"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const DRY = process.argv.includes("--dry-run");
const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const assetsRoot = args[0];

if (!assetsRoot) {
  console.error("Usage: node scripts/import-figma-assets.mjs <assets-folder> [--dry-run]");
  process.exit(1);
}
if (!fs.existsSync(assetsRoot)) {
  console.error("Assets folder not found:", assetsRoot);
  process.exit(1);
}

/** Normalize WP-style filenames for fuzzy matching */
function normalizeName(name) {
  const base = path.basename(name, path.extname(name));
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/%/g, "")
    .replace(/[@&,.''"()]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function collectRefs() {
  const sources = [
    path.join(root, "src/data/pages.json"),
    path.join(root, "src/data/posts.json"),
    path.join(root, "src/data/authors.json"),
  ];
  const cssDir = path.join(root, "public/css");
  const elDir = path.join(PUBLIC, "wp-content/uploads/elementor/css");

  let text = "";
  for (const f of sources) {
    if (fs.existsSync(f)) text += fs.readFileSync(f, "utf8");
  }
  function walkCss(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkCss(p);
      else if (ent.name.endsWith(".css")) text += fs.readFileSync(p, "utf8");
    }
  }
  walkCss(cssDir);
  walkCss(elDir);

  const refs = new Set();
  for (const m of text.matchAll(/\/wp-content\/uploads\/[^"'\\\s)]+/g)) {
    refs.add(m[0].split("?")[0]);
  }
  return [...refs];
}

/** @type {Map<string, string[]>} */
const sourceByNorm = new Map();

function indexSources(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      indexSources(p);
      continue;
    }
    if (!/\.(png|jpe?g|webp|svg|gif|woff2?|ttf)$/i.test(ent.name)) continue;
    const norm = normalizeName(ent.name);
    if (!sourceByNorm.has(norm)) sourceByNorm.set(norm, []);
    sourceByNorm.get(norm).push(p);
  }
}

function pickSource(candidates, wantedExt) {
  if (!candidates?.length) return null;
  const ext = wantedExt.toLowerCase();
  const exact = candidates.find((c) => path.extname(c).toLowerCase() === ext);
  if (exact) return exact;
  if (ext === ".svg") return candidates.find((c) => /\.svg$/i.test(c)) || null;
  if (ext === ".webp") return candidates.find((c) => /\.webp$/i.test(c)) || candidates.find((c) => /\.(png|jpe?g)$/i.test(c));
  return candidates.find((c) => /\.(png|jpe?g|webp)$/i.test(c)) || candidates[0];
}

function needsCopy(dest, srcPath) {
  if (!fs.existsSync(dest)) return true;
  const st = fs.statSync(dest);
  if (st.size < 100) return true;
  // Overwrite if source is substantially larger (likely real asset vs tiny placeholder)
  const srcSize = fs.statSync(srcPath).size;
  if (srcSize > st.size * 2 && srcSize > 5000) return true;
  return false;
}

indexSources(assetsRoot);
console.log(`Indexed ${sourceByNorm.size} unique asset names from ${assetsRoot}`);

const refs = collectRefs();
const refByNorm = new Map();
for (const p of refs) {
  const b = decodeURIComponent(path.basename(p));
  const n = normalizeName(b);
  if (!refByNorm.has(n)) refByNorm.set(n, []);
  refByNorm.get(n).push(p);
}

let copied = 0;
let matched = 0;
const copiedList = [];

for (const [norm, sources] of sourceByNorm) {
  const targets = refByNorm.get(norm);
  if (!targets) continue;
  matched++;
  for (const wp of targets) {
    const wantedExt = path.extname(decodeURIComponent(wp));
    const src = pickSource(sources, wantedExt);
    if (!src) continue;
    const dest = path.join(PUBLIC, wp.replace(/^\//, ""));
    if (!needsCopy(dest, src)) continue;
    if (DRY) {
      console.log(`[dry-run] ${path.basename(src)} -> ${wp}`);
      copied++;
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
    if (copiedList.length < 20) copiedList.push({ from: path.basename(src), to: wp });
  }
}

// Manual aliases for naming mismatches between Figma export and WP disk names
const MANUAL = [
  [
    "Assets Connect Zone/Connect-Zones--Corporate-PRO-Services.jpg",
    "/wp-content/uploads/2024/01/Connect-Zones-Corporate%D1%8FPRO-Services.jpg",
  ],
  [
    "Assets Connect Zone/VISAS-background.jpg",
    "/wp-content/uploads/2023/02/background2-scaled.jpg",
  ],
];

for (const [rel, wp] of MANUAL) {
  const src = path.join(assetsRoot, rel);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(PUBLIC, wp.replace(/^\//, ""));
  if (!needsCopy(dest, src)) continue;
  if (!DRY) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  copied++;
  copiedList.push({ from: rel, to: wp, manual: true });
}

console.log(JSON.stringify({ matched, copied, sample: copiedList }, null, 2));
