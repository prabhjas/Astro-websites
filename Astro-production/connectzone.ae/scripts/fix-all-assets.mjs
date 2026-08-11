#!/usr/bin/env node
/**
 * One-shot asset repair for connectzone.ae:
 * 1. Import designer assets folder → referenced WP paths
 * 2. Deploy all folder assets to 2024/01 (WP-style names)
 * 3. Map *-bg.jpg service backgrounds to elementor CSS paths
 * 4. Fill WP thumbnail variants from parent full-size files on disk
 * 5. Fetch remaining refs from live origin + Wayback (--fetch)
 *
 * Usage:
 *   node scripts/fix-all-assets.mjs "/path/to/Connect Zone - Assets"
 *   node scripts/fix-all-assets.mjs "/path/to/Connect Zone - Assets" --fetch
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const ORIGIN = process.env.ASSET_ORIGIN || "https://connectzone.ae";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const assetsRoot = args[0];
const DO_FETCH = process.argv.includes("--fetch");

function normalizeName(name) {
  const base = path.basename(name, path.extname(name));
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-\d+x\d+$/i, "")
    .replace(/%[0-9a-f]{2}/gi, "")
    .replace(/%/g, "")
    .replace(/[@&,.''"()]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function wpName(name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  return base.replace(/[%&]/g, "").replace(/[,]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") + ext;
}

function existsGood(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 100;
  } catch {
    return false;
  }
}

function isHtmlSoft404Buffer(buf, ext = "") {
  if (!buf || buf.length < 15) return true;
  const head = buf.subarray(0, 200).toString("utf8");
  if (buf[0] === 0x3c && /<!DOCTYPE|<html\b|Page Not Found/i.test(head)) return true;
  if (/\.(jpe?g|png|gif|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm)$/i.test(ext)) {
    if (/^\s*<(!DOCTYPE|html|head|body|script)/i.test(head)) return true;
  }
  return false;
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
    refs.add(m[0].split("?")[0]);
  }
  return [...refs];
}

function deployAllAssets(dir) {
  let n = 0;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(png|jpe?g|webp|svg|gif|woff2?)$/i.test(ent.name)) continue;
      const sub = p.includes("Assets Connect Zone") ? "2023/11" : "2024/01";
      const dest = path.join(PUBLIC, "wp-content/uploads", sub, wpName(ent.name));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const srcSize = fs.statSync(p).size;
      const destSize = existsGood(dest) ? fs.statSync(dest).size : 0;
      if (destSize < srcSize) {
        fs.copyFileSync(p, dest);
        n++;
      }
    }
  }
  walk(dir);
  return n;
}

function mapServiceBackgrounds(dir) {
  let n = 0;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/-bg\.(jpg|jpeg|webp|png)$/i.test(ent.name)) continue;
      const wpFile = wpName(ent.name);
      const dest = path.join(PUBLIC, "wp-content/uploads/2024/01", wpFile);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!existsGood(dest) || fs.statSync(dest).size < fs.statSync(p).size) {
        fs.copyFileSync(p, dest);
        n++;
      }
    }
  }
  walk(dir);
  return n;
}

/** Build index of all files under public/wp-content/uploads by normalized basename */
function indexPublicUploads() {
  const base = path.join(PUBLIC, "wp-content/uploads");
  const map = new Map();
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (existsGood(p)) {
        const norm = normalizeName(ent.name);
        if (!map.has(norm)) map.set(norm, []);
        map.get(norm).push(p);
      }
    }
  }
  walk(base);
  return map;
}

function fillThumbnailVariants(refs, index) {
  let n = 0;
  for (const wp of refs) {
    const dest = path.join(PUBLIC, wp.replace(/^\//, ""));
    if (existsGood(dest)) continue;
    const base = decodeURIComponent(path.basename(wp));
    const ext = path.extname(base);
    const stem = path.basename(base, ext);
    const parentStem = stem.replace(/-\d+x\d+$/i, "");
    if (parentStem === stem) continue;
    const norm = normalizeName(parentStem + ext);
    const candidates = index.get(norm);
    if (!candidates?.length) continue;
    const src = candidates.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    n++;
  }
  return n;
}

async function downloadOne(pathname) {
  const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
  if (existsGood(dest)) return { ok: true, skipped: true };

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (const urlPath of [pathname, decodeURIComponent(pathname)]) {
    try {
      const res = await fetch(ORIGIN + urlPath, {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 20 || ct.includes("text/html") || isHtmlSoft404Buffer(buf, path.extname(pathname)))
        continue;
      fs.writeFileSync(dest, buf);
      return { ok: true, bytes: buf.length, source: "live" };
    } catch {
      /* try wayback */
    }
  }

  try {
    const cdx = `https://web.archive.org/cdx/search/cdx?url=connectzone.ae${pathname}&output=json&filter=statuscode:200&limit=5`;
    const cdxRes = await fetch(cdx, { headers: { "User-Agent": UA } });
    if (cdxRes.ok) {
      const rows = await cdxRes.json();
      const ts = rows?.[1]?.[1];
      if (ts) {
        const wbUrl = `https://web.archive.org/web/${ts}im_/${ORIGIN}${pathname}`;
        const wbRes = await fetch(wbUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
        if (wbRes.ok) {
          const buf = Buffer.from(await wbRes.arrayBuffer());
          if (buf.length >= 20 && !isHtmlSoft404Buffer(buf, path.extname(pathname))) {
            fs.writeFileSync(dest, buf);
            return { ok: true, bytes: buf.length, source: "wayback" };
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { ok: false };
}

async function fetchMissing(missing, concurrency = 8) {
  let downloaded = 0;
  let failed = 0;
  const queue = [...missing];
  async function worker() {
    while (queue.length) {
      const pathname = queue.shift();
      const r = await downloadOne(pathname);
      if (r.ok && !r.skipped) {
        downloaded++;
        if (downloaded % 20 === 0) console.log(`  fetched ${downloaded}/${missing.length}...`);
      } else if (!r.ok) failed++;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { downloaded, failed };
}

function countMissing(refs) {
  return refs.filter((wp) => !existsGood(path.join(PUBLIC, wp.replace(/^\//, ""))));
}

// --- run ---
console.log("=== Connect Zone: fix-all-assets ===\n");

if (assetsRoot && fs.existsSync(assetsRoot)) {
  console.log("1. Running import-figma-assets...");
  spawnSync("node", ["scripts/import-figma-assets.mjs", assetsRoot], {
    cwd: root,
    stdio: "inherit",
  });

  console.log("\n2. Deploying all assets to uploads...");
  const deployed = deployAllAssets(assetsRoot);
  console.log(`   deployed/updated: ${deployed}`);

  console.log("\n3. Mapping service page backgrounds...");
  const bgs = mapServiceBackgrounds(assetsRoot);
  console.log(`   bg images mapped: ${bgs}`);
} else {
  console.warn("Assets folder not provided or missing — skipping local import");
}

let refs = collectRefs();
let index = indexPublicUploads();

console.log("\n4. Filling WP thumbnail variants from full-size files...");
const thumbs = fillThumbnailVariants(refs, index);
console.log(`   thumbnails filled: ${thumbs}`);

index = indexPublicUploads();
let missing = countMissing(refs);
console.log(`\n   still missing after local fix: ${missing.length}`);

if (DO_FETCH && missing.length > 0) {
  console.log(`\n5. Fetching ${missing.length} assets from live + Wayback...`);
  const { downloaded, failed } = await fetchMissing(missing);
  console.log(`   downloaded: ${downloaded}, failed: ${failed}`);
  missing = countMissing(refs);
}

console.log(`\n=== Final: ${missing.length} missing of ${refs.length} referenced ===`);
if (missing.length > 0) {
  console.log("Remaining sample:");
  for (const p of missing.slice(0, 30)) console.log(" ", p);
  process.exit(1);
}
