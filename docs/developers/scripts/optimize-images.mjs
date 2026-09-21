/**
 * optimize-images.mjs — recompress + downscale large images IN PLACE.
 *
 * Safe by design: same path, same format, only overwrites when the result is
 * meaningfully smaller. Zero reference breakage (no extension/URL changes).
 * This is the single biggest safe win on image-heavy sites (it removed 106 MB
 * across 252 files on Connect Group).
 *
 * Usage:
 *   node optimize-images.mjs <public-dir> [--dry]
 * Examples:
 *   node optimize-images.mjs ../../../Astro-production/connectfm.ae/public --dry
 *   node optimize-images.mjs ../../../Astro-production/connectfm.ae/public
 *
 * Tunables: MIN_BYTES (only touch files above this), MAX_W (cap width).
 * Requires: npm i  (sharp).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!ROOT) { console.error("usage: node optimize-images.mjs <public-dir> [--dry]"); process.exit(1); }

const MIN_BYTES = 200 * 1024; // only images larger than this
const MAX_W = 1920;           // downscale anything wider (retina-desktop safe)

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(jpe?g|png|webp)$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT).filter((f) => { try { return fs.statSync(f).size >= MIN_BYTES; } catch { return false; } });
console.error(`candidates >${MIN_BYTES / 1024}KB:`, files.length);

let saved = 0, changed = 0, skipped = 0;
for (const f of files) {
  try {
    const before = fs.statSync(f).size;
    const input = fs.readFileSync(f);            // buffer so we can overwrite same path
    const meta = await sharp(input).metadata();
    let pipe = sharp(input, { failOn: "none" });
    if (meta.width > MAX_W) pipe = pipe.resize({ width: MAX_W, withoutEnlargement: true });
    if (meta.format === "jpeg") pipe = pipe.jpeg({ quality: 80, mozjpeg: true });
    else if (meta.format === "webp") pipe = pipe.webp({ quality: 74 });
    else if (meta.format === "png") pipe = pipe.png({ compressionLevel: 9, quality: 82, palette: true, effort: 8 });
    else continue;
    const out = await pipe.toBuffer();
    if (out.length < before * 0.92) {            // only if >=8% smaller
      if (!DRY) fs.writeFileSync(f, out);
      saved += before - out.length; changed++;
      if (changed <= 30) console.error(`  ${Math.round(before/1024)}->${Math.round(out.length/1024)}KB  ${f.replace(ROOT,"")}`);
    } else skipped++;
  } catch (e) { console.error("  ERR", f.replace(ROOT, ""), e.message); }
}
console.log(`${DRY ? "[DRY] " : ""}changed ${changed}, skipped ${skipped}, saved ${(saved / 1048576).toFixed(1)} MB`);
