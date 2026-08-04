/**
 * Rewrite dev.iberiaeor.com → iberiaeor.com (or relative /wp-content/…),
 * then download any missing assets from production.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://iberiaeor.com";
const DEV = /https?:\/\/dev\.iberiaeor\.com/gi;

const DATA_FILES = [
  "src/data/pages.json",
  "src/data/posts.json",
  "src/data/bodies.json",
  "src/data/seo.json",
  "src/data/header.html",
  "src/data/footer.html",
  "src/data/site.json",
];

function rewrite(text) {
  return text
    .replace(DEV, ORIGIN)
    .replaceAll("//dev.iberiaeor.com", "//iberiaeor.com");
}

const assetUrls = new Set();

for (const rel of DATA_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const before = fs.readFileSync(full, "utf8");
  const after = rewrite(before);
  if (before !== after) {
    fs.writeFileSync(full, after);
    console.log("rewrote", rel);
  }
  for (const m of after.matchAll(/https?:\/\/iberiaeor\.com(\/wp-content\/[^"'\\\s)>]+)/g)) {
    assetUrls.add(m[1].split("?")[0]);
  }
  for (const m of after.matchAll(/["'](\/wp-content\/uploads\/[^"'\\\s)>]+)/g)) {
    assetUrls.add(m[1].split("?")[0]);
  }
}

let downloaded = 0;
let skipped = 0;
let missing = 0;
for (const rel of assetUrls) {
  if (!/\.(png|jpe?g|webp|gif|svg|avif|mp4|woff2?|ttf|css|js)$/i.test(rel)) continue;
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
    skipped += 1;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const res = await fetch(ORIGIN + rel, {
      headers: { "User-Agent": "IberiaEOR-Astro/1.0" },
    });
    if (!res.ok) {
      missing += 1;
      console.warn("missing", res.status, rel);
      continue;
    }
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    downloaded += 1;
  } catch (e) {
    missing += 1;
    console.warn("fail", rel, e.message);
  }
}

// Verify no remaining dev refs in data
let remaining = 0;
for (const rel of DATA_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const t = fs.readFileSync(full, "utf8");
  const m = t.match(/dev\.iberiaeor\.com/gi);
  if (m) remaining += m.length;
}

console.log(
  JSON.stringify({ downloaded, skippedExisting: skipped, missing, remainingDevRefs: remaining }, null, 2),
);
