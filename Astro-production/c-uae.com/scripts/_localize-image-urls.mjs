import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = join(process.cwd(), "Astro-production/c-uae.com");
const SKIP = new Set(["node_modules", "dist", ".data", ".astro", ".git"]);
const TEXT_EXT = new Set([
  ".json", ".html", ".htm", ".astro", ".js", ".mjs", ".ts", ".css", ".yml", ".yaml", ".md", ".txt", ".svg",
]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rewrite(text) {
  let t = text;
  // Absolute and protocol-relative live media → root-relative
  t = t.replace(/https?:\/\/(?:www\.)?c-uae\.com(\/wp-content\/[^"'\\\s)>\]]*)/gi, "$1");
  t = t.replace(/\/\/(?:www\.)?c-uae\.com(\/wp-content\/[^"'\\\s)>\]]*)/gi, "$1");
  // JSON-escaped
  t = t.replace(/https?:\\\/\\\/(?:www\.)?c-uae\\.com(\\\/wp-content\\\/[^"'\\\s]*)/gi, "$1");
  // Other absolute image paths on live host (rare non-uploads)
  t = t.replace(
    /https?:\/\/(?:www\.)?c-uae\.com(\/[^"'\\\s)>\]]+\.(?:png|jpe?g|webp|gif|svg|avif|ico|bmp)(?:\?[^"'\\\s)>\]]*)?)/gi,
    "$1",
  );
  t = t.replace(
    /\/\/(?:www\.)?c-uae\.com(\/[^"'\\\s)>\]]+\.(?:png|jpe?g|webp|gif|svg|avif|ico|bmp)(?:\?[^"'\\\s)>\]]*)?)/gi,
    "$1",
  );
  return t;
}

const files = walk(ROOT).filter((f) => {
  const base = f.split(/[/\\]/).pop() || "";
  if (base.endsWith(".bak") || base.includes(".truncated-bak")) return false;
  // keep helper scripts that intentionally reference live ORIGIN
  if (/[\\/]scripts[\\/]/.test(f) && !base.startsWith("_localize")) return false;
  return TEXT_EXT.has(extname(base).toLowerCase()) || base.endsWith(".cleaned.html");
});

let changedFiles = 0;
let total = 0;
const changed = [];
for (const file of files) {
  const before = readFileSync(file, "utf8");
  if (!/c-uae\.com/i.test(before)) continue;
  const after = rewrite(before);
  if (after === before) continue;
  const beforeHits = (before.match(/c-uae\.com\/wp-content/gi) || []).length;
  const afterHits = (after.match(/c-uae\.com\/wp-content/gi) || []).length;
  writeFileSync(file, after);
  changedFiles++;
  total += Math.max(0, beforeHits - afterHits);
  changed.push(file.replace(ROOT, "c-uae.com"));
}

console.log(JSON.stringify({ changedFiles, totalReplacementsApprox: total, changed }, null, 2));
