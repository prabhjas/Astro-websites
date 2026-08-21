#!/usr/bin/env node
/**
 * Replace generic Banner/Hero placeholder copies with real assets from:
 * 1. Figma assets folder (exact normalized name match)
 * 2. Sister sites in Astro-production monorepo
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const MONO = path.resolve(root, "..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("-") && !a.endsWith(".mjs"));
const assetsRoot = args.find((a) => fs.existsSync(a) && fs.statSync(a).isDirectory());

const BANNER = path.join(PUBLIC, "wp-content/uploads/2023/09/Banner.png");
const HERO = path.join(PUBLIC, "wp-content/uploads/2023/05/Hero-Bkg.webp");

function md5(p) {
  return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
}

function normalizeName(name) {
  const base = path.basename(name, path.extname(name));
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-\d+x\d+$/i, "")
    .replace(/%[0-9a-f]{2}/gi, "")
    .replace(/[%@&,.''"()]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function wpName(name) {
  const ext = path.extname(name);
  return path.basename(name, ext).replace(/[%&]/g, "").replace(/[,]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") + ext;
}

function indexDir(dir, map, depth = 0) {
  if (depth > 10 || !fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      indexDir(p, map, depth + 1);
      continue;
    }
    if (!/\.(png|jpe?g|webp|svg|gif)$/i.test(ent.name)) continue;
    const n = normalizeName(ent.name);
    if (!map.has(n)) map.set(n, []);
    map.get(n).push(p);
  }
}

function collectRefs() {
  const sources = [
    path.join(root, "src/data/pages.json"),
    path.join(root, "src/data/posts.json"),
    path.join(root, "src/data/authors.json"),
  ];
  let text = "";
  for (const f of sources) {
    if (fs.existsSync(f)) text += fs.readFileSync(f, "utf8");
  }
  function walkCss(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkCss(p);
      else if (/\.css$/i.test(ent.name)) text += fs.readFileSync(p, "utf8");
    }
  }
  walkCss(path.join(root, "public/css"));
  walkCss(path.join(PUBLIC, "wp-content/uploads/elementor/css"));
  const refs = new Set();
  for (const m of text.matchAll(/\/wp-content\/uploads\/[^"'\\\s)]+/g)) {
    const p = m[0].split("?")[0];
    if (!p.includes("*")) refs.add(p);
  }
  return [...refs];
}

function pickBest(hits) {
  return hits.sort((a, b) => {
    const score = (p) => {
      let s = 0;
      if (assetsRoot && p.startsWith(assetsRoot)) s += 2000;
      if (p.includes("connectzone.ae")) s += 1000;
      if (p.includes("connectresources.ae")) s += 500;
      if (p.includes("/public/")) s += 100;
      s += fs.statSync(p).size / 1000;
      return s;
    };
    return score(b) - score(a);
  })[0];
}

function deployAllAssets() {
  if (!assetsRoot || !fs.existsSync(assetsRoot)) return 0;
  let n = 0;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(png|jpe?g|webp|svg|gif)$/i.test(ent.name)) continue;
      const sub = p.includes("Assets Connect Zone") ? "2023/11" : "2024/01";
      const dest = path.join(PUBLIC, "wp-content/uploads", sub, wpName(ent.name));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(p).size) {
        fs.copyFileSync(p, dest);
        n++;
      }
    }
  }
  walk(assetsRoot);
  return n;
}

const placeholderHashes = new Set([md5(BANNER), md5(HERO)]);
const assetsIndex = new Map();
const monoIndex = new Map();
if (assetsRoot) indexDir(assetsRoot, assetsIndex);
indexDir(MONO, monoIndex);

const deployed = deployAllAssets();
console.log(`Deployed from assets folder: ${deployed}`);

let placeholderCount = 0;
let fromAssets = 0;
let fromMono = 0;
let stillPlaceholder = 0;

for (const wp of collectRefs()) {
  const dest = path.join(PUBLIC, wp.replace(/^\//, ""));
  if (!fs.existsSync(dest)) continue;
  const hash = md5(dest);
  if (!placeholderHashes.has(hash)) continue;
  placeholderCount++;
  const norm = normalizeName(decodeURIComponent(path.basename(wp)));
  const assetSrc = assetsIndex.get(norm);
  const monoSrc = monoIndex.get(norm);
  const src = assetSrc?.length ? pickBest(assetSrc) : monoSrc?.length ? pickBest(monoSrc) : null;
  if (!src || md5(src) === hash) {
    stillPlaceholder++;
    continue;
  }
  fs.copyFileSync(src, dest);
  if (assetSrc?.includes(src)) fromAssets++;
  else fromMono++;
}

console.log(
  JSON.stringify(
    {
      placeholderCount,
      replacedFromAssets: fromAssets,
      replacedFromMonorepo: fromMono,
      stillPlaceholder,
    },
    null,
    2,
  ),
);
