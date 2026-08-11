#!/usr/bin/env node
/**
 * Repair pages.json after a naive HTML rewrite inserted unescaped
 * loading="eager" into JSON string values. Then safely set skip-lazy
 * images to eager via JSON parse/stringify.
 */
import fs from "node:fs";

const FILE = "src/data/pages.json";
let raw = fs.readFileSync(FILE, "utf8");

// Remove broken unescaped insertions produced by fix-ss-lazy-and-copy.mjs
const before = raw;
raw = raw.replace(/ loading="eager"/g, "");
if (raw !== before) {
  console.log("stripped raw loading=\"eager\" insertions");
}

try {
  JSON.parse(raw);
  console.log("JSON parses after strip");
} catch (e) {
  console.error("still broken after strip:", e.message);
  // show context around position if available
  const m = String(e.message).match(/position (\d+)/);
  if (m) {
    const pos = Number(m[1]);
    console.error(JSON.stringify(raw.slice(Math.max(0, pos - 80), pos + 80)));
  }
  process.exit(1);
}

const pages = JSON.parse(raw);

function fixHtml(html) {
  if (!html) return html;
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    if (!/skip-lazy|n2-ss-/i.test(full)) return full;
    let a = attrs.replace(/\sloading=(["'])lazy\1/gi, ' loading="eager"');
    if (!/\sloading=/i.test(a)) a += ' loading="eager"';
    return `<img${a}>`;
  });
}

for (const p of pages) {
  if (typeof p.content === "string") p.content = fixHtml(p.content);
  if (typeof p.bodyHtml === "string") p.bodyHtml = fixHtml(p.bodyHtml);
}

fs.writeFileSync(FILE, JSON.stringify(pages, null, 2) + "\n");
console.log("rewrote", FILE, "pages", pages.length);
