#!/usr/bin/env node
/**
 * Restore Connect Zone images from:
 * 1. Figma assets folder (priority)
 * 2. Git history (commit with real assets before banner placeholders)
 * 3. Sister sites in monorepo (excluding known bad duplicates)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const REPO = path.resolve(root, "../../..");
const MONO = path.resolve(root, "..");
const GIT_COMMITS = ["83f49f36a", "37c007e36", "a3f27bf9d"];

const args = process.argv.slice(2).filter((a) => !a.startsWith("-") && !a.endsWith(".mjs"));
const assetsRoot = args.find((a) => fs.existsSync(a) && fs.statSync(a).isDirectory());

function md5buf(buf) {
  return crypto.createHash("md5").update(buf).digest("hex");
}
function md5f(p) {
  return md5buf(fs.readFileSync(p));
}

const badHashes = new Set();
for (const p of [
  path.join(PUBLIC, "wp-content/uploads/2023/09/Banner.png"),
  path.join(PUBLIC, "wp-content/uploads/2023/05/Hero-Bkg.webp"),
  path.join(MONO, "connectfz.com/public/wp-content/uploads/2023/06/Certified-ISO-14001-2015-Connect-Resources-1.png"),
]) {
  if (fs.existsSync(p)) badHashes.add(md5f(p));
}

function isBad(p) {
  try {
    return badHashes.has(md5f(p));
  } catch {
    return true;
  }
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
  return [
    ...new Set(
      [...text.matchAll(/\/wp-content\/uploads\/[^"'\\\s)]+/g)]
        .map((m) => m[0].split("?")[0])
        .filter((p) => !p.includes("*")),
    ),
  ];
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

function pickBest(hits) {
  return hits
    .filter((p) => !isBad(p))
    .sort((a, b) => {
      const score = (p) => {
        let s = 0;
        if (assetsRoot && p.startsWith(assetsRoot)) s += 3000;
        if (p.includes("connectzone.ae/public")) s += 2000;
        if (p.includes("connectresources.ae")) s += 800;
        s += fs.statSync(p).size / 1000;
        return s;
      };
      return score(b) - score(a);
    })[0];
}

function restoreFromGit(rel) {
  const gitPath = `Astro-production/connectzone.ae/${rel}`;
  for (const commit of GIT_COMMITS) {
    try {
      const buf = execSync(`git -C "${REPO}" show ${commit}:"${gitPath}"`, {
        stdio: ["pipe", "pipe", "ignore"],
      });
      if (buf.length > 200 && !badHashes.has(md5buf(buf))) return buf;
    } catch {
      /* next commit */
    }
  }
  return null;
}

function deployAssetsFolder() {
  if (!assetsRoot) return 0;
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
      fs.copyFileSync(p, dest);
      n++;
    }
  }
  walk(assetsRoot);
  return n;
}

const MANUAL = assetsRoot
  ? [
      ["Assets Connect Zone/JAFZA.png", "wp-content/uploads/2023/05/JAFZA.png"],
      ["Assets Connect Zone/DMCC.png", "wp-content/uploads/2023/05/DMCC.png"],
      ["Assets Connect Zone/Iso-certified-section-1.png", "wp-content/uploads/2023/05/Iso-certified-section-1.png"],
      [
        "Assets Connect Zone/Iso-certified-section-1-281x300.png",
        "wp-content/uploads/2023/05/Iso-certified-section-1-281x300.png",
      ],
      [
        "Assets Connect Zone/Connect-Zones--Corporate-PRO-Services.jpg",
        "wp-content/uploads/2024/01/Connect-Zones-Corporate-PRO-Services.jpg",
      ],
      ["Assets Connect Zone/VISAS-background.jpg", "wp-content/uploads/2023/02/background2-scaled.jpg"],
      ["Assets Connect Zone/Pattern Connect Zone.svg", "wp-content/uploads/2023/11/Pattern-Connect-Zone.svg"],
      ["Assets Connect Zone/Mainland.jpg", "wp-content/uploads/2023/11/Mainland.jpg"],
      ["Assets Connect Zone/Free Zone.jpg", "wp-content/uploads/2023/11/Free-Zone.jpg"],
      ["Assets Connect Zone/Offshore.jpg", "wp-content/uploads/2023/11/Offshore.jpg"],
    ]
  : [];

const assetsIndex = new Map();
const monoIndex = new Map();
if (assetsRoot) indexDir(assetsRoot, assetsIndex);
indexDir(MONO, monoIndex);

console.log("Deploying Figma assets folder...");
const deployed = deployAssetsFolder();
console.log(`Deployed ${deployed} files`);

let manualCopied = 0;
for (const [rel, destRel] of MANUAL) {
  const src = path.join(assetsRoot, rel);
  const dest = path.join(PUBLIC, destRel);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  manualCopied++;
}
console.log(`Manual mappings: ${manualCopied}`);

// Map service page backgrounds from assets folder to elementor paths
if (assetsRoot) {
  let bgs = 0;
  function walkBg(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walkBg(p);
      else if (/-bg\.(jpg|jpeg|webp|png)$/i.test(ent.name)) {
        const dest = path.join(PUBLIC, "wp-content/uploads/2024/01", wpName(ent.name));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(p, dest);
        bgs++;
      }
    }
  }
  walkBg(assetsRoot);
  console.log(`Service backgrounds: ${bgs}`);
}

let fromAssets = 0;
let fromGit = 0;
let fromMono = 0;
let stillBad = 0;
let missing = 0;

for (const wp of collectRefs()) {
  const rel = wp.replace(/^\//, "");
  const dest = path.join(PUBLIC, rel);
  if (!fs.existsSync(dest)) {
    missing++;
    const norm = normalizeName(decodeURIComponent(path.basename(wp)));
    const asset = pickBest(assetsIndex.get(norm) || []);
    const git = restoreFromGit(rel);
    const mono = pickBest(monoIndex.get(norm) || []);
    if (asset) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(asset, dest);
      fromAssets++;
    } else if (git) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, git);
      fromGit++;
    } else if (mono) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(mono, dest);
      fromMono++;
    } else stillBad++;
    continue;
  }

  if (!isBad(dest)) continue;

  const norm = normalizeName(decodeURIComponent(path.basename(wp)));
  const asset = pickBest(assetsIndex.get(norm) || []);
  if (asset) {
    fs.copyFileSync(asset, dest);
    fromAssets++;
    continue;
  }

  const git = restoreFromGit(rel);
  if (git) {
    fs.writeFileSync(dest, git);
    fromGit++;
    continue;
  }

  const mono = pickBest(monoIndex.get(norm) || []);
  if (mono) {
    fs.copyFileSync(mono, dest);
    fromMono++;
    continue;
  }

  stillBad++;
}

console.log(
  JSON.stringify({ deployed, manualCopied, fromAssets, fromGit, fromMono, missing, stillBad }, null, 2),
);
