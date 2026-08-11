#!/usr/bin/env node
/** Verify ALL rendered pages serve referenced upload assets locally. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PUBLIC = path.join(root, "public");
const BASE = process.env.VERIFY_BASE || "http://127.0.0.1:5101";

function extractUploadRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/\/wp-content\/uploads\/[^"'\\\s)]+/g)) {
    const u = m[0].split("?")[0].replace(/,\d+w$/, "");
    if (/\.(png|jpe?g|webp|svg|gif|avif|ico|mp4)$/i.test(u)) refs.add(u);
  }
  return [...refs];
}

function isRealImage(filePath) {
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 100) return false;
    const buf = Buffer.alloc(20);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 20, 0);
    fs.closeSync(fd);
    if (buf[0] === 0x3c && /<!DOCTYPE|<html/i.test(buf.toString("utf8"))) return false;
    return true;
  } catch {
    return false;
  }
}

function existsLocal(u) {
  return isRealImage(path.join(PUBLIC, u.replace(/^\//, "")));
}

async function checkPage(pagePath) {
  const res = await fetch(BASE + pagePath);
  if (!res.ok) return { pagePath, error: `HTTP ${res.status}` };
  const html = await res.text();
  const refs = extractUploadRefs(html);

  for (const m of html.matchAll(/href="(\/wp-content\/uploads\/elementor\/css\/[^"]+)"/g)) {
    try {
      const css = await (await fetch(BASE + m[1])).text();
      for (const r of extractUploadRefs(css)) refs.push(r);
    } catch {
      /* ignore */
    }
  }

  const unique = [...new Set(refs)];
  const missing = unique.filter((u) => !existsLocal(u));
  return { pagePath, total: unique.length, missing, ok: unique.length - missing.length };
}

function collectPagePaths() {
  const pages = JSON.parse(fs.readFileSync(path.join(root, "src/data/pages.json"), "utf8"));
  const posts = JSON.parse(fs.readFileSync(path.join(root, "src/data/posts.json"), "utf8"));
  const paths = new Set(["/"]);
  for (const p of pages) {
    if (!p.path) continue;
    paths.add(p.path.endsWith("/") ? p.path : `${p.path}/`);
  }
  for (const p of posts) {
    if (p.slug) paths.add(`/${p.slug}/`);
  }
  return [...paths];
}

const pagePaths = collectPagePaths();
const results = [];
let checked = 0;
for (const p of pagePaths) {
  results.push(await checkPage(p));
  checked++;
  if (checked % 25 === 0) process.stderr.write(`checked ${checked}/${pagePaths.length}\n`);
}

const withMissing = results.filter((r) => r.missing?.length > 0);
const totalMissing = withMissing.reduce((s, r) => s + r.missing.length, 0);
console.log(
  JSON.stringify(
    {
      base: BASE,
      pagesChecked: pagePaths.length,
      pagesWithMissing: withMissing.length,
      totalMissing,
      sample: withMissing.slice(0, 10),
    },
    null,
    2,
  ),
);
process.exit(totalMissing > 0 ? 1 : 0);
