#!/usr/bin/env node
/**
 * Fix bogus featured-image files that are HTML soft-404 responses saved as images.
 * Re-download real binaries from live with magic-byte validation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

function isRealImage(buf) {
  if (!buf || buf.length < 24) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  // GIF
  if (buf.slice(0, 6).toString() === "GIF87a" || buf.slice(0, 6).toString() === "GIF89a") return true;
  // WEBP
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  // HTML / text soft 404
  const head = buf.slice(0, 200).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;
  return false;
}

function preferFull(p) {
  return p.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
}

function localCandidates(src) {
  const out = [];
  const push = (p) => {
    if (p && !out.includes(p)) out.push(p);
  };
  push(src);
  const full = preferFull(src);
  push(full);
  const m = full.match(/^(.*)(\.(webp|jpe?g|png|gif))$/i);
  if (m) {
    const [_, base, ext] = m;
    for (const size of ["-1024x576", "-1536x864", "-768x432", "-300x200", "-300x169", "-300x225", "-300x270", "-300x247", "-300x257", "-300x292"]) {
      push(`${base}${size}${ext}`);
    }
  }
  return out;
}

async function fetchImage(relPath) {
  const url = `${LIVE}${relPath}`;
  const res = await fetch(url, {
    headers: { "user-agent": "raad-astro-image-repair/1.0", accept: "image/*,*/*" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isRealImage(buf)) return null;
  // Prefer true image content-types, but accept if magic is valid
  if (ct && !ct.startsWith("image/") && !ct.includes("octet-stream")) {
    // still allow if magic OK
  }
  return buf;
}

async function repairOne(relPath) {
  const abs = path.join(ROOT, "public", relPath.replace(/^\//, ""));
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  if (existing && isRealImage(existing)) {
    return { path: relPath, status: "ok" };
  }

  for (const cand of localCandidates(relPath)) {
    const buf = await fetchImage(cand);
    if (!buf) continue;
    const destRel = cand;
    const dest = path.join(ROOT, "public", destRel.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    // also write to originally requested path if different, so HTML src keeps working
    if (preferFull(relPath) === preferFull(destRel) || relPath === destRel) {
      const origDest = path.join(ROOT, "public", relPath.replace(/^\//, ""));
      fs.mkdirSync(path.dirname(origDest), { recursive: true });
      fs.writeFileSync(origDest, buf);
    }
    return { path: destRel, wroteOrig: relPath, bytes: buf.length, status: "repaired" };
  }
  return { path: relPath, status: "failed" };
}

const brokenFiles = new Set();
// scan featured images from posts
for (const p of posts) {
  const src = (p.featuredImage || "").trim();
  if (!src || src.startsWith("/images/")) continue;
  const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    brokenFiles.add(src);
    continue;
  }
  if (!isRealImage(fs.readFileSync(abs))) brokenFiles.add(src);
}

console.log("broken featured files", brokenFiles.size);

const report = [];
const pathRemap = new Map(); // old -> new usable path

for (const src of brokenFiles) {
  const result = await repairOne(src);
  report.push(result);
  console.log(JSON.stringify(result));
  if (result.status === "repaired") {
    // Keep original path (we wrote bytes there) when possible
    const origAbs = path.join(ROOT, "public", src.replace(/^\//, ""));
    if (fs.existsSync(origAbs) && isRealImage(fs.readFileSync(origAbs))) {
      pathRemap.set(src, src);
    } else {
      pathRemap.set(src, result.path);
    }
  }
}

// For failed repairs, try WP media search by post title and update posts.json
async function mediaSearch(q) {
  const url = `${LIVE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=10`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data
    .map((m) => {
      try {
        return new URL(m.source_url).pathname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

let still = [];
for (const p of posts) {
  const src = (p.featuredImage || "").trim();
  if (!src || src.startsWith("/images/")) continue;
  const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
  const ok = fs.existsSync(abs) && isRealImage(fs.readFileSync(abs));
  if (ok) continue;

  // remap if we repaired under a different candidate
  if (pathRemap.has(src)) {
    const neu = pathRemap.get(src);
    const nAbs = path.join(ROOT, "public", neu.replace(/^\//, ""));
    if (fs.existsSync(nAbs) && isRealImage(fs.readFileSync(nAbs))) {
      p.featuredImage = neu;
      if (!p.seo) p.seo = {};
      p.seo.ogImage = neu;
      continue;
    }
  }

  // media search fallback
  const hits = await mediaSearch(p.title || p.slug.replace(/-/g, " "));
  let fixed = false;
  for (const hit of hits) {
    const buf = await fetchImage(hit);
    if (!buf) continue;
    const dest = path.join(ROOT, "public", hit.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    p.featuredImage = hit;
    if (!p.seo) p.seo = {};
    p.seo.ogImage = hit;
    fixed = true;
    console.log(JSON.stringify({ path: p.path, via: "media-search", hit, bytes: buf.length }));
    break;
  }
  if (!fixed) still.push(p.path);
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");

// Final audit
let ok = 0;
let bad = [];
for (const p of posts) {
  const src = (p.featuredImage || "").trim();
  if (!src) {
    bad.push({ path: p.path, reason: "empty" });
    continue;
  }
  if (src.startsWith("/images/")) {
    ok++;
    continue;
  }
  const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
  if (!fs.existsSync(abs) || !isRealImage(fs.readFileSync(abs))) bad.push({ path: p.path, src, reason: "still-bad" });
  else ok++;
}

console.log(JSON.stringify({ ok, badCount: bad.length, bad, still }, null, 2));
