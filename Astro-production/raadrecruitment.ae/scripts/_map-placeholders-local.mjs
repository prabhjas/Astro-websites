#!/usr/bin/env node
/**
 * For posts still on placeholder, assign best-matching REAL local images
 * (already validated binaries under public/wp-content/uploads).
 */
import fs from "node:fs";
import path from "node:path";

const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const PLACEHOLDER = "/images/blog-placeholder.svg";
const uploadsRoot = path.join("public", "wp-content", "uploads");

function isRealImage(buf) {
  if (!buf || buf.length < 32) return false;
  const head = buf.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  return false;
}

const catalog = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (/\.(jpe?g|png|webp)$/i.test(ent.name) && !/-\d{2,4}x\d{2,4}\./.test(ent.name)) {
      const buf = fs.readFileSync(full);
      if (!isRealImage(buf) || buf.length < 8000) continue;
      const rel = "/" + path.relative("public", full).replace(/\\/g, "/");
      if (/logo|favicon|whatsapp|deadline-looms|button|icon/i.test(rel)) continue;
      catalog.push({ rel, name: ent.name.toLowerCase(), bytes: buf.length });
    }
  }
}
walk(uploadsRoot);
console.log("catalog", catalog.length);

const stop = new Set(["raad", "uae", "dubai", "with", "from", "that", "this", "your", "into", "what", "know", "guide", "complete", "detailed", "should", "about", "must", "need", "2024", "2025", "2026", "the", "and", "for", "key", "top"]);

function tokens(post) {
  return `${post.slug} ${post.title}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

const stubs = posts.filter((p) => (p.featuredImage || "").includes("placeholder"));
console.log("placeholders", stubs.length);

for (const post of stubs) {
  const toks = tokens(post);
  let best = null;
  let bestScore = 0;
  for (const img of catalog) {
    let score = 0;
    for (const t of toks) if (img.name.includes(t) || img.rel.toLowerCase().includes(t)) score += 2;
    // slight preference for larger files
    if (img.bytes > 40000) score += 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  if (best && bestScore >= 4) {
    post.featuredImage = best.rel;
    if (!post.seo) post.seo = {};
    post.seo.ogImage = best.rel;
    console.log(JSON.stringify({ path: post.path, score: bestScore, img: best.rel }));
  } else {
    console.log(JSON.stringify({ path: post.path, score: bestScore, kept: "placeholder", best: best?.rel }));
  }
}

fs.writeFileSync("src/data/posts.json", JSON.stringify(posts, null, 2) + "\n");
console.log(
  "remaining placeholders",
  posts.filter((p) => (p.featuredImage || "").includes("placeholder")).length,
);
