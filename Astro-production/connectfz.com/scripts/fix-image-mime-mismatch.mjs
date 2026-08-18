#!/usr/bin/env node
/**
 * Rewrite image bytes so they match the file extension.
 * Live Caddy sends X-Content-Type-Options: nosniff, so a .webp that is
 * actually PNG/JPEG is blocked by the browser.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

function sniff(buf) {
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf.subarray(1, 4).toString("ascii") === "PNG") return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 3 && buf.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  return "other";
}

function expected(ext) {
  const e = ext.toLowerCase();
  if (e === ".webp") return "webp";
  if (e === ".png") return "png";
  if (e === ".jpg" || e === ".jpeg") return "jpeg";
  if (e === ".gif") return "gif";
  return "other";
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (IMG_RE.test(name)) out.push(p);
  }
  return out;
}

async function convert(file, actual, want) {
  const img = sharp(file, { failOn: "none" });
  let pipeline = img;
  if (want === "webp") pipeline = img.webp({ quality: 82 });
  else if (want === "png") pipeline = img.png({ compressionLevel: 9 });
  else if (want === "jpeg") pipeline = img.jpeg({ quality: 85, mozjpeg: true });
  else return false;
  const out = await pipeline.toBuffer();
  if (!out.length) return false;
  fs.writeFileSync(file, out);
  return true;
}

async function main() {
  const files = walk(path.join(PUBLIC, "wp-content/uploads"));
  const stats = { ok: 0, converted: 0, skipped: 0, failed: 0 };
  for (const file of files) {
    const buf = fs.readFileSync(file);
    const actual = sniff(buf);
    const want = expected(path.extname(file));
    if (actual === want || want === "other") {
      stats.ok++;
      continue;
    }
    if (actual === "other") {
      stats.skipped++;
      continue;
    }
    try {
      await convert(file, actual, want);
      stats.converted++;
      if (stats.converted % 50 === 0) console.log(`converted ${stats.converted}…`);
    } catch (err) {
      stats.failed++;
      console.warn("fail", path.relative(PUBLIC, file), actual, "->", want, err.message);
    }
  }
  console.log(stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
