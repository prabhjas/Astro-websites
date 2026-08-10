#!/usr/bin/env node
/**
 * Restore missing Connect FZ images via local near-match, Figma pack aliases,
 * then Wayback Machine (live WP media is gone after Astro cutover).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const PACK = path.join(PUBLIC, "wp-content/uploads/figma-pack");
const SKIP_RE = /\/2025\/0[67]\//i;

const ALIASES = {
  "pricing-2-scaled.jpg": "Pricing.jpg",
  "pricing-1-scaled.jpg": "Pricing.jpg",
  "pricing.jpg": "Pricing.jpg",
  "bg2-1-scaled.jpg": "bg2.jpg",
  "bg2.jpg": "bg2.jpg",
  "bg-steps.jpg": "bg-steps.jpg",
  "process-bkg-desktop.png": "bg-steps.jpg",
  "process-bkg-mobile.png": "bg-steps.jpg",
  "faq-bkg-desktop.png": "bg2.jpg",
  "faq-bkg-mobile.png": "bg2.jpg",
  "uae-visa-services-bg-scaled-1.webp": "UAE-VISA-SERVICES-bg.jpg",
  "uae-visa-services-bg.jpg": "UAE-VISA-SERVICES-bg.jpg",
  "group 61.png": "Group 61.png",
  "logo.png": "Logo.png",
  "get-unmatched-benefits-with-your-golden-visa-based-on-emirates.jpg":
    "Get-unmatched-benefits-with-your-Golden-Visa-Based-on-Emirates.jpg",
};

function stem(name) {
  return path
    .basename(name)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/-\d+x\d+$/i, "")
    .replace(/-scaled(?:-\d+)?$/i, "")
    .replace(/-\d+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(name)) out.push(p);
  }
  return out;
}

function collectRefs() {
  const urls = new Set();
  const dirs = [
    path.join(ROOT, "src"),
    path.join(PUBLIC, "css"),
    path.join(PUBLIC, "wp-content/uploads/elementor/css"),
  ];
  const walkText = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walkText(p);
      else if (/\.(html|css|json|astro|ts|js|mjs)$/.test(name)) {
        const text = fs.readFileSync(p, "utf8");
        const re = /["'(](\/wp-content\/uploads\/[^"'()?#\s]+\.(?:png|jpe?g|webp|gif|svg|avif|ico))["')]/gi;
        let m;
        while ((m = re.exec(text))) urls.add(decodeURIComponent(m[1].replace(/\\/g, "")));
      }
    }
  };
  dirs.forEach(walkText);
  return [...urls];
}

function isOk(file) {
  if (!fs.existsSync(file)) return false;
  const st = fs.statSync(file);
  if (st.size < 80) return false;
  const head = fs.readFileSync(file).subarray(0, 20).toString("utf8");
  return !head.includes("<!DOCTYPE") && !head.includes("<html");
}

function copyTo(src, destRel) {
  const dest = path.join(PUBLIC, destRel.replace(/^\//, ""));
  if (isOk(dest)) return "exists";
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return `copied ${path.basename(src)}`;
}

const index = new Map();
for (const file of walk(path.join(PUBLIC, "wp-content/uploads"))) {
  if (file.includes(`${path.sep}figma-pack${path.sep}`)) continue;
  const key = stem(file);
  const prev = index.get(key);
  if (!prev || fs.statSync(file).size > fs.statSync(prev).size) index.set(key, file);
}

const refs = collectRefs().filter((u) => !SKIP_RE.test(u));
const missing = refs.filter((u) => !isOk(path.join(PUBLIC, u.replace(/^\//, ""))));

const stats = { exists: 0, alias: 0, fuzzy: 0, wayback: 0, fail: 0 };
const failed = [];

for (const rel of missing) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (isOk(dest)) {
    stats.exists++;
    continue;
  }
  const base = path.basename(rel).toLowerCase();
  const aliasName = ALIASES[base];
  if (aliasName) {
    const packFile = path.join(PACK, aliasName);
    if (isOk(packFile)) {
      console.log("alias", rel, copyTo(packFile, rel));
      stats.alias++;
      continue;
    }
  }
  const fuzzy = index.get(stem(rel));
  if (fuzzy && isOk(fuzzy)) {
    console.log("fuzzy", rel, copyTo(fuzzy, rel));
    stats.fuzzy++;
    continue;
  }
  failed.push(rel);
}

async function wayback(rel) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  const candidates = [
    `https://web.archive.org/web/20250322002455im_/https://connectfz.com${rel}`,
    `https://web.archive.org/web/2024im_/https://connectfz.com${rel}`,
    `https://web.archive.org/web/2023im_/https://connectfz.com${rel}`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 ConnectFZ-restore" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200 || buf[0] === 0x3c) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      return buf.length;
    } catch {
      /* try next */
    }
  }
  return 0;
}

const still = failed.filter((rel) => !isOk(path.join(PUBLIC, rel.replace(/^\//, ""))));
console.log(`wayback attempting ${still.length}…`);
for (const rel of still) {
  const n = await wayback(rel);
  if (n) {
    console.log("wayback", rel, n);
    stats.wayback++;
  } else {
    stats.fail++;
    console.warn("FAIL", rel);
  }
}

console.log(JSON.stringify({ scanned: refs.length, missingStart: missing.length, ...stats }, null, 2));
