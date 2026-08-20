#!/usr/bin/env node
/**
 * WordPress exported filenames using Cyrillic soft hyphen (я / %D1%8F) break
 * when the URL is decoded by browsers. Replace with ASCII hyphens in data files
 * and ensure clean copies exist on disk.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const uploadDir = path.join(root, "public/wp-content/uploads");

const dataFiles = [
  "src/data/pages.json",
  "src/data/seo.json",
  "src/data/posts.json",
  "src/data/footer.html",
  "src/data/global-css.json",
];

let total = 0;
for (const rel of dataFiles) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) continue;
  let text = fs.readFileSync(fp, "utf8");
  const before = (text.match(/%D1%8F/gi) || []).length + (text.match(/\u044f/g) || []).length;
  if (!before) continue;
  text = text.replace(/%D1%8F/gi, "-").replace(/\u044f/g, "-");
  fs.writeFileSync(fp, text);
  total += before;
  console.log(`fixed ${rel}: ${before}`);
}

let copies = 0;
if (fs.existsSync(uploadDir)) {
  for (const dir of walk(uploadDir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!name.includes("%D1%8F")) continue;
      const src = path.join(dir, name);
      const clean = path.join(dir, name.replace(/%D1%8F/g, "-"));
      if (!fs.existsSync(clean)) {
        fs.copyFileSync(src, clean);
        copies++;
      }
    }
  }
}

console.log(JSON.stringify({ dataReplacements: total, diskCopies: copies }, null, 2));

function* walk(start) {
  yield start;
  for (const ent of fs.readdirSync(start, { withFileTypes: true })) {
    if (ent.isDirectory()) yield* walk(path.join(start, ent.name));
  }
}
