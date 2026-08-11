#!/usr/bin/env node
/**
 * Resolve missing connectzone.ae assets by copying from:
 * 1. Local assets folder (Figma exports)
 * 2. Sister sites in Astro-production monorepo
 * 3. Thumbnail variants from full-size files on disk
 * 4. Wayback Machine (slow, rate-limited)
 * 5. Generic placeholder for irrecoverable blog thumbnails
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const MONO = path.resolve(root, "..");
const ORIGIN = "https://connectzone.ae";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const assetsRoot = process.argv.find((a) => !a.startsWith("-") && !a.endsWith(".mjs"));
const USE_WAYBACK = !process.argv.includes("--no-wayback");
const PLACEHOLDER = process.argv.includes("--placeholder");

function normalizeName(name) {
  const base = path.basename(name, path.extname(name));
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-\d+x\d+$/i, "")
    .replace(/-\d+$/i, "")
    .replace(/%[0-9a-f]{2}/gi, "")
    .replace(/[%@&,.''"()]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function existsGood(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 100;
  } catch {
    return false;
  }
}

function isHtml(buf, ext) {
  if (!buf?.length) return true;
  const head = buf.subarray(0, 200).toString("utf8");
  if (buf[0] === 0x3c && /<!DOCTYPE|<html/i.test(head)) return true;
  if (/\.(jpe?g|png|webp|gif|svg|woff2?)$/i.test(ext) && /^\s*<(!DOCTYPE|html)/i.test(head)) return true;
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
  walkCss(path.join(root, "src"));

  const refs = new Set();
  for (const m of text.matchAll(/\/wp-content\/uploads\/[^"'\\\s)]+/g)) {
    refs.add(m[0].split("?")[0]);
  }
  return [...refs];
}

/** @type {Map<string, string[]>} */
const monoIndex = new Map();

function indexMono(dir, depth = 0) {
  if (depth > 10) return;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      indexMono(p, depth + 1);
      continue;
    }
    if (!/\.(png|jpe?g|webp|svg|gif|woff2?|mp4)$/i.test(e.name)) continue;
    const n = normalizeName(e.name);
    if (!monoIndex.has(n)) monoIndex.set(n, []);
    monoIndex.get(n).push(p);
  }
}

function indexAssets(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  indexMono(dir, 0);
}

function findSource(basename) {
  const keys = [normalizeName(basename)];
  const stem = path.basename(basename, path.extname(basename));
  keys.push(normalizeName(stem.replace(/-1$/i, "") + path.extname(basename)));
  for (const k of keys) {
    const hits = monoIndex.get(k);
    if (hits?.length) return pickBest(hits);
  }
  return null;
}

function pickBest(hits) {
  return hits.sort((a, b) => {
    const score = (p) => {
      let s = 0;
      if (p.includes("connectzone.ae")) s += 1000;
      if (p.includes("connectresources.ae")) s += 500;
      if (p.includes("/public/")) s += 100;
      s += fs.statSync(p).size / 1000;
      return s;
    };
    return score(b) - score(a);
  })[0];
}

function copyTo(wp, src) {
  const dest = path.join(PUBLIC, wp.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return dest;
}

function fillFromDiskIndex(refs, localIndex) {
  let n = 0;
  for (const wp of refs) {
    const dest = path.join(PUBLIC, wp.replace(/^\//, ""));
    if (existsGood(dest)) continue;
    const base = decodeURIComponent(path.basename(wp));
    const ext = path.extname(base);
    const stem = path.basename(base, ext).replace(/-\d+x\d+$/i, "");
    const keys = [normalizeName(stem + ext), normalizeName(stem)];
    let hits = null;
    for (const k of keys) {
      if (localIndex.get(k)?.length) {
        hits = localIndex.get(k);
        break;
      }
    }
    if (!hits?.length) continue;
    const src = hits.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    copyTo(wp, src);
    n++;
  }
  return n;
}

function buildLocalIndex() {
  const map = new Map();
  const base = path.join(PUBLIC, "wp-content/uploads");
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (existsGood(p)) {
        const n = normalizeName(e.name);
        if (!map.has(n)) map.set(n, []);
        map.get(n).push(p);
      }
    }
  }
  walk(base);
  return map;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWayback(pathname) {
  try {
    await sleep(1500);
    const cdx = `https://web.archive.org/cdx/search/cdx?url=connectzone.ae${encodeURI(pathname)}&output=json&filter=statuscode:200&limit=3`;
    const cdxRes = await fetch(cdx, { headers: { "User-Agent": UA } });
    if (!cdxRes.ok) return false;
    const rows = await cdxRes.json();
    const ts = rows?.[1]?.[1];
    if (!ts) return false;
    await sleep(500);
    const wbUrl = `https://web.archive.org/web/${ts}im_/${ORIGIN}${pathname}`;
    const wbRes = await fetch(wbUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!wbRes.ok) return false;
    const buf = Buffer.from(await wbRes.arrayBuffer());
    if (buf.length < 20 || isHtml(buf, path.extname(pathname))) return false;
    const dest = path.join(PUBLIC, pathname.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function getPlaceholder() {
  const candidates = [
    path.join(PUBLIC, "wp-content/uploads/2023/11/Pattern-Connect-Zone.svg"),
    path.join(PUBLIC, "wp-content/uploads/2024/01/Headline.png"),
    path.join(PUBLIC, "wp-content/uploads/2024/01/Connect-Zones-Corporate-PRO-Services.jpg"),
  ];
  return candidates.find(existsGood) || null;
}

// --- main ---
console.log("Indexing monorepo uploads...");
indexMono(MONO);
if (assetsRoot) indexAssets(assetsRoot);
console.log(`Indexed ${monoIndex.size} unique basenames`);

const refs = collectRefs();
let missing = refs.filter((wp) => !existsGood(path.join(PUBLIC, wp.replace(/^\//, ""))));
console.log(`Missing before fix: ${missing.length}`);

let fromMono = 0;
for (const wp of [...missing]) {
  const src = findSource(decodeURIComponent(path.basename(wp)));
  if (!src) continue;
  copyTo(wp, src);
  fromMono++;
}
console.log(`Copied from monorepo/assets: ${fromMono}`);

let fromDisk = fillFromDiskIndex(refs, buildLocalIndex());
console.log(`Filled from local disk index (pass 1): ${fromDisk}`);
fromDisk += fillFromDiskIndex(refs, buildLocalIndex());
console.log(`Filled from local disk index (pass 2): ${fromDisk}`);

missing = refs.filter((wp) => !existsGood(path.join(PUBLIC, wp.replace(/^\//, ""))));
console.log(`Still missing: ${missing.length}`);

if (USE_WAYBACK && missing.length > 0) {
  console.log(`Fetching ${missing.length} from Wayback (slow)...`);
  let wb = 0;
  for (let i = 0; i < missing.length; i++) {
    const wp = missing[i];
    if (await fetchWayback(wp)) {
      wb++;
      if (wb % 10 === 0) console.log(`  wayback: ${wb}/${missing.length}`);
    }
  }
  console.log(`Wayback recovered: ${wb}`);
}

missing = refs.filter((wp) => !existsGood(path.join(PUBLIC, wp.replace(/^\//, ""))));

if (PLACEHOLDER && missing.length > 0) {
  const ph = getPlaceholder();
  if (ph) {
    let placed = 0;
    for (const wp of missing) {
      if (wp.endsWith(".mp4")) continue; // skip video placeholders
      copyTo(wp, ph);
      placed++;
    }
    console.log(`Placeholder applied: ${placed}`);
    missing = refs.filter((wp) => !existsGood(path.join(PUBLIC, wp.replace(/^\//, ""))));
  }
}

console.log(`\nFinal missing: ${missing.length} / ${refs.length}`);
if (missing.length > 0) {
  for (const p of missing.slice(0, 40)) console.log(" ", p);
  process.exit(1);
}
