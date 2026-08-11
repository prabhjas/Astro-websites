#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function rewrite(s) {
  return s
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(css|html|json)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

const roots = [
  "public/css",
  "public/wp-content",
  "public/wp-includes",
  "src/data",
];
let n = 0;
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.includes("raadrecruitment.ae")) continue;
    const next = rewrite(raw);
    if (next !== raw) {
      fs.writeFileSync(file, next);
      n++;
      console.log("rewrote", file);
    }
  }
}
console.log("files", n);
