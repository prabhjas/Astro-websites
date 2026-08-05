#!/usr/bin/env node
/**
 * Normalize asset URLs in mirrored JSON/HTML and fetch any still-missing uploads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ASSETS = path.join(ROOT, "public/assets/images");
const ORIGIN = "https://connectresources.ae";

const SCAN_FILES = [
  "src/data/pages.json",
  "src/data/posts.json",
  "src/data/header.html",
  "src/data/footer.html",
  "src/data/global-css.json",
  "src/data/single-post-css.json",
  "src/data/impreza-global.css",
  "src/data/impreza-inline-home.css",
  "src/data/live-css-order.json",
];

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

function normalizeContent(text) {
  let out = text;
  out = out.replaceAll("\\u2013", "–").replaceAll("\\u2014", "—");
  out = out.replaceAll(".mp4/webm", ".mp4.webm");
  out = out.replaceAll("/wp-content/uploads/", "/assets/images/");
  out = out.replace(
    /https?:\/\/(?:www\.)?connectresources\.ae\/wp-content\/uploads\//gi,
    "/assets/images/",
  );
  out = out.replaceAll("/assets/images//", "/assets/images/");
  return out;
}

function extractAssetRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/\/assets\/images\/[^\s"'<>\\]+/g)) {
    let r = m[0].replace(/[.,;)\]]+$/, "");
    refs.add(r);
  }
  return refs;
}

async function downloadMissing(ref) {
  const rel = ref.replace(/^\/assets\/images\//, "");
  const dest = path.join(PUBLIC_ASSETS, rel);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;

  const legacy = path.join(ROOT, "public/wp-content/uploads", rel);
  if (fs.existsSync(legacy) && fs.statSync(legacy).isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(legacy, dest);
    return true;
  }

  const wp = `/wp-content/uploads/${rel}`;
  try {
    const res = await fetch(`${ORIGIN}${wp}`, {
      headers: { "User-Agent": "ConnectResources-asset-fix/1.0" },
    });
    if (!res.ok) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

const report = {
  filesTouched: 0,
  downloaded: 0,
  copiedLegacy: 0,
  stillMissing: [],
};

for (const rel of SCAN_FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const before = fs.readFileSync(fp, "utf8");
  const after = normalizeContent(before);
  if (after !== before) {
    fs.writeFileSync(fp, after);
    report.filesTouched++;
  }
}

const missing = new Set();
for (const rel of SCAN_FILES) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const r of extractAssetRefs(text)) {
    const abs = path.join(PUBLIC_ASSETS, r.slice("/assets/images/".length));
    if (!fs.existsSync(abs)) missing.add(r);
  }
}

for (const ref of missing) {
  const ok = await downloadMissing(ref);
  if (ok) report.downloaded++;
  else report.stillMissing.push(ref);
}

report.stillMissing = [...new Set(report.stillMissing)].sort().slice(0, 150);
report.stillMissingCount = missing.size - report.downloaded;

const outPath = path.join(ROOT, ".data/asset-ref-fix-report.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
