/**
 * Download all post author avatars referenced in bodyHtml from live TFG.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DIST = path.join(ROOT, "dist", "client");
const LIVE = "https://thefreelancergate.com";
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/posts.json"), "utf8"));

/** @type {Map<string, { kind: string, posts: string[] }>} */
const assets = new Map();

function add(raw, slug) {
  if (!raw) return;
  let src = raw
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .trim();
  // normalize absolute live URLs to path or keep gravatar absolute
  if (/^https?:\/\/(?:www\.)?thefreelancergate\.com\//i.test(src)) {
    src = src.replace(/^https?:\/\/(?:www\.)?thefreelancergate\.com/i, "");
  }
  const key = src;
  if (!assets.has(key)) assets.set(key, { kind: /gravatar/i.test(src) ? "gravatar" : "upload", posts: [] });
  assets.get(key).posts.push(slug);
}

for (const p of posts) {
  const h = p.bodyHtml || "";
  // author ava block
  for (const m of h.matchAll(/post-author-ava[\s\S]{0,500}?<\/div>/gi)) {
    const block = m[0];
    const src = (block.match(/\bsrc=['"]([^'"]+)['"]/i) || [])[1];
    const srcset = (block.match(/\bsrcset=['"]([^'"]+)['"]/i) || [])[1];
    add(src, p.slug);
    if (srcset) {
      for (const part of srcset.split(",")) {
        const u = part.trim().split(/\s+/)[0];
        add(u, p.slug);
      }
    }
  }
}

function localPathFor(src) {
  if (/^https?:\/\/secure\.gravatar\.com\//i.test(src)) {
    const hash = (src.match(/\/avatar\/([a-f0-9]+)/i) || [])[1] || "unknown";
    const size = (src.match(/[?&]s=(\d+)/i) || [])[1] || "35";
    return path.join("wp-content", "uploads", "authors", "gravatar", `${hash}-${size}.jpg`);
  }
  const clean = src.split("?")[0].replace(/^\//, "");
  return clean;
}

async function download(url, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (fs.existsSync(destAbs) && fs.statSync(destAbs).size > 80) {
    return { status: "exists", bytes: fs.statSync(destAbs).size };
  }
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return { status: `http_${res.status}`, bytes: 0 };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 40) return { status: "too_small", bytes: buf.length };
  fs.writeFileSync(destAbs, buf);
  // mirror into dist/client when present
  const rel = path.relative(PUBLIC, destAbs);
  const distAbs = path.join(DIST, rel);
  if (fs.existsSync(DIST)) {
    fs.mkdirSync(path.dirname(distAbs), { recursive: true });
    fs.copyFileSync(destAbs, distAbs);
  }
  return { status: "ok", bytes: buf.length };
}

const summary = { uploadOk: 0, uploadSkip: 0, gravatarOk: 0, fail: [] };

for (const [src, meta] of assets) {
  const rel = localPathFor(src);
  const dest = path.join(PUBLIC, rel);
  let url;
  if (meta.kind === "gravatar") {
    // Prefer real image; fall back to mm so we always have something local
    const base = src.replace(/[?&]d=[^&]*/gi, "").replace(/&#038;/g, "&");
    const u = new URL(base.startsWith("http") ? base : `https://secure.gravatar.com${base.startsWith("/") ? "" : "/"}${base}`);
    u.searchParams.set("d", "404");
    u.searchParams.set("r", "g");
    url = u.toString();
  } else {
    url = `${LIVE}${src.startsWith("/") ? src : `/${src}`}`;
  }

  let result = await download(url, dest);
  if (meta.kind === "gravatar" && result.status.startsWith("http_")) {
    // no custom photo — pull mystery-man so local still has a file, then callers can swap
    const u = new URL(url);
    u.searchParams.set("d", "mm");
    result = await download(u.toString(), dest);
    result.status = result.status === "ok" ? "gravatar_mm" : result.status;
  }

  if (result.status === "ok" || result.status === "exists" || result.status === "gravatar_mm") {
    if (meta.kind === "gravatar") summary.gravatarOk += 1;
    else if (result.status === "exists") summary.uploadSkip += 1;
    else summary.uploadOk += 1;
    console.log(`${result.status.padEnd(12)} ${result.bytes.toString().padStart(7)}  ${rel}`);
  } else {
    summary.fail.push({ src, result: result.status, posts: meta.posts.slice(0, 3) });
    console.log(`FAIL ${result.status}  ${src}`);
  }
}

// Write remap for gravatar -> local paths (used by enhance step / docs)
const remap = {};
for (const [src, meta] of assets) {
  if (meta.kind !== "gravatar") continue;
  remap[src.replace(/&#038;/g, "&").replace(/&amp;/g, "&")] = "/" + localPathFor(src).replace(/\\/g, "/");
}
fs.writeFileSync(
  path.join(ROOT, "src/data/author-avatar-remap.json"),
  JSON.stringify({ source: LIVE, generatedAt: new Date().toISOString(), remap }, null, 2),
);

console.log("\n=== SUMMARY ===");
console.log(summary);
console.log("unique assets", assets.size);
console.log("remap entries", Object.keys(remap).length);
