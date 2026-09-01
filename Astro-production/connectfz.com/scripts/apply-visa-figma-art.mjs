#!/usr/bin/env node
/**
 * Overlay Connect FZ Figma HQ visa art onto the live WP upload filenames
 * (including sized srcset variants) so visa pages match Figma photography.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const U12 = path.join(PUBLIC, "wp-content/uploads/2025/12");
const PACK = path.join(PUBLIC, "wp-content/uploads/figma-pack");
const HQ = "/Users/rajpalsingh/Downloads/Connect FZ - Assets/IMAGES IN HIGH QUALITY";
const OPT = "/Users/rajpalsingh/Downloads/Connect FZ - Assets/OPTIMIZED";

function slug(name) {
  return path
    .basename(name)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/-\d+x\d+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function dimFromName(name) {
  const m = name.match(/-(\d+)x(\d+)\.[a-z0-9]+$/i);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

function indexDir(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const name of fs.readdirSync(dir)) {
    const src = path.join(dir, name);
    if (!fs.statSync(src).isFile()) continue;
    const key = slug(name);
    const prev = map.get(key);
    if (!prev || fs.statSync(src).size > fs.statSync(prev).size) map.set(key, src);
  }
  return map;
}

function walkImages(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkImages(p, out);
    else if (/\.(png|jpe?g|webp)$/i.test(name)) out.push(p);
  }
  return out;
}

async function writeAs(src, dest) {
  const ext = path.extname(dest).toLowerCase();
  const dim = dimFromName(path.basename(dest));
  let img = sharp(src, { failOn: "none" });
  if (dim) img = img.resize(dim.w, dim.h, { fit: "cover", position: "centre" });
  if (ext === ".webp") img = img.webp({ quality: 86 });
  else if (ext === ".png") img = img.png({ compressionLevel: 9 });
  else img = img.jpeg({ quality: 88, mozjpeg: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await img.toFile(dest);
}

const hq = indexDir(HQ);
const opt = indexDir(OPT);
const pack = indexDir(PACK);
const sources = new Map([...opt, ...pack, ...hq]);

/** Extra aliases: WP hero filenames → Figma portrait keys */
const ALIASES = {
  getyouruaegoldenvisa: "getyouruaegoldenvisa",
  getyouruaejobseekervisa: "uaejobseekervisa",
  getyouruaefreelancevisa: "uaefreelancevisa",
  getyouruaeinvestorvisa: "uaeinvestorvisa",
  getyourremotevisainuae: "uaeremoteworkvisa",
  getyourspousevisainuae: "uaeinvestorvisa",
  getyouruaeretirementvisa: "greenvisauae",
  applyforuaejobseekervisa: "uaejobseekervisa",
  wehelpyougetyouruaeinvestorvisa: "uaeinvestorvisa",
  wehelpyougetyouruaeremoteworkvisa: "uaeremoteworkvisa",
  wehelpyougetyouruaeretirementvisa: "greenvisauae",
  familyvisawithconnectfz: "getallyourvisaserviceswithconnectfz",
  desktopscaled: "bg2",
  desktop7scaled: "uaevisaservicesbg",
  bg21scaled: "bg2",
  uaevisaservicesbgscaled1: "uaevisaservicesbg",
};

let written = 0;
const dests = [
  ...walkImages(U12),
  ...walkImages(path.join(PUBLIC, "wp-content/uploads/2023/05")),
  ...walkImages(path.join(PUBLIC, "wp-content/uploads/2023/06")),
  ...walkImages(PACK),
];

for (const dest of dests) {
  const key = slug(dest);
  const srcKey = ALIASES[key] || key;
  const src = sources.get(srcKey) || sources.get(key);
  if (!src) continue;
  if (path.resolve(src) === path.resolve(dest)) continue;
  try {
    await writeAs(src, dest);
    written++;
  } catch (err) {
    console.warn("fail", path.basename(dest), err.message);
  }
}

/** Always materialize hero BGs used by Elementor CSS */
const forced = [
  [sources.get("bg2"), path.join(PUBLIC, "wp-content/uploads/2023/06/Desktop-scaled.jpg")],
  [sources.get("bg2"), path.join(PUBLIC, "wp-content/uploads/2023/05/bg2-1-scaled.jpg")],
  [sources.get("bg2"), path.join(PUBLIC, "wp-content/uploads/2023/03/bg2.jpg")],
  [sources.get("uaevisaservicesbg"), path.join(PUBLIC, "wp-content/uploads/2023/06/Desktop-7-scaled.jpg")],
  [sources.get("uaevisaservicesbg"), path.join(PUBLIC, "wp-content/uploads/2023/06/UAE-VISA-SERVICES-bg.jpg")],
];
for (const [src, dest] of forced) {
  if (!src || !dest) continue;
  await writeAs(src, dest);
  written++;
}

/** Rebuild missing tiny thumbs from the full-size sibling */
const missing = dests.filter((p) => {
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  return !st || st.size < 1800;
});
for (const dest of missing) {
  const dim = dimFromName(path.basename(dest));
  if (!dim) continue;
  const parent = dest.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
  if (!fs.existsSync(parent) || fs.statSync(parent).size < 2000) continue;
  await writeAs(parent, dest);
  written++;
}

console.log({ written, hq: hq.size });
