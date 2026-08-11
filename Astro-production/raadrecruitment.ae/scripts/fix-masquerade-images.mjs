#!/usr/bin/env node
/**
 * Remove HTML soft-404 masqueraders under public/wp-content/uploads and
 * re-download real images referenced by pages.json / posts / live homepage.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://raadrecruitment.ae";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function isHtmlBuffer(buf) {
  const head = buf.slice(0, 200).toString("utf8").toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html");
}

function isImageBuffer(buf) {
  if (buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return true;
  // GIF
  if (buf.slice(0, 6).toString("ascii") === "GIF87a" || buf.slice(0, 6).toString("ascii") === "GIF89a")
    return true;
  // WEBP (RIFF....WEBP)
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return true;
  // SVG
  const head = buf.slice(0, 200).toString("utf8").toLowerCase();
  if (head.includes("<svg")) return true;
  return false;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const uploadRoot = path.join(PUBLIC, "wp-content", "uploads");
const files = walk(uploadRoot).filter((f) =>
  /\.(png|jpe?g|webp|gif|svg)$/i.test(f),
);

let removed = 0;
const brokenRel = [];
for (const file of files) {
  const buf = fs.readFileSync(file);
  if (isHtmlBuffer(buf) || !isImageBuffer(buf)) {
    const rel = "/" + path.relative(PUBLIC, file).split(path.sep).join("/");
    brokenRel.push(rel);
    fs.unlinkSync(file);
    removed++;
  }
}
console.log("removed masqueraders", removed);

// Collect needed urls from content + live home
const needed = new Set(brokenRel);
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const blob = JSON.stringify(pages) + JSON.stringify(posts.slice(0, 40));
for (const m of blob.matchAll(/\/wp-content\/uploads\/[^"'\\\s)]+\.(?:png|jpe?g|webp|gif)/gi)) {
  needed.add(m[0].split("?")[0].replace(/\\+\//g, "/"));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) return "";
  return res.text();
}

const liveHome = await fetchHtml(`${ORIGIN}/?nowprocket=1`);
for (const m of liveHome.matchAll(
  /(?:src|data-src|data-lazy-src|data-bg)=["']([^"']+\.(?:png|jpe?g|webp|gif)[^"']*)["']/gi,
)) {
  let u = m[1];
  if (u.startsWith("//")) u = "https:" + u;
  if (u.startsWith("/")) u = ORIGIN + u;
  try {
    const url = new URL(u);
    if (!url.hostname.includes("raadrecruitment.ae")) continue;
    needed.add(url.pathname);
  } catch {
    /* skip */
  }
}
// srcset
for (const m of liveHome.matchAll(/srcset=["']([^"']+)["']/gi)) {
  for (const part of m[1].split(",")) {
    const u = part.trim().split(/\s+/)[0];
    if (!u) continue;
    try {
      const url = new URL(u, ORIGIN);
      if (!url.hostname.includes("raadrecruitment.ae")) continue;
      if (/\.(png|jpe?g|webp|gif)$/i.test(url.pathname)) needed.add(url.pathname);
    } catch {
      /* skip */
    }
  }
}

console.log("needed images", needed.size);

async function download(rel) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && isImageBuffer(fs.readFileSync(dest))) return "skip";
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const candidates = [
    ORIGIN + rel,
    ORIGIN + rel + "?nowprocket=1",
    // try non-scaled siblings if scaled missing
  ];
  // also try without size suffixes
  const unscaled = rel.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp|gif)$)/i, "");
  if (unscaled !== rel) candidates.push(ORIGIN + unscaled);

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const buf = Buffer.from(await res.arrayBuffer());
      if (isHtmlBuffer(buf) || !isImageBuffer(buf)) continue;
      if (ct.includes("text/html")) continue;
      // write to requested dest even if fetched unscaled
      fs.writeFileSync(dest, buf);
      return "dl";
    } catch {
      /* try next */
    }
  }
  return "fail";
}

let dl = 0;
let skip = 0;
let fail = 0;
const fails = [];
for (const rel of needed) {
  if (!rel.startsWith("/wp-content/uploads/")) continue;
  const r = await download(rel);
  if (r === "dl") {
    dl++;
    if (dl % 20 === 0) console.log("downloaded", dl);
  } else if (r === "skip") skip++;
  else {
    fail++;
    fails.push(rel);
  }
}
console.log({ dl, skip, fail });
if (fails.length) {
  console.log("fail sample", fails.slice(0, 30));
  fs.writeFileSync(
    "scripts/_failed-images.json",
    JSON.stringify(fails, null, 2),
  );
}
