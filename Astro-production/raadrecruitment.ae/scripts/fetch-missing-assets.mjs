#!/usr/bin/env node
/**
 * Download missing wp-content / wp-includes assets referenced by pages (+ sample posts).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://raadrecruitment.ae";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const samplePosts = Number(process.env.SAMPLE_POSTS || "20");
const paths = [
  ...pages.map((p) => p.path),
  ...posts.slice(0, samplePosts).map((p) => p.path),
];

const urls = new Set();

async function fetchHtml(p) {
  const base = p === "/" ? "/" : p;
  const u = `${ORIGIN}${base}${base.includes("?") ? "" : "?nowprocket=1"}`;
  const res = await fetch(u, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) return "";
  return res.text();
}

function collect(html) {
  const re =
    /(?:href|src)=["']([^"']+\.(?:css|js|woff2?|ttf|eot|svg|png|jpe?g|webp|gif))[^"']*["']/gi;
  for (const m of html.matchAll(re)) {
    let u = m[1];
    if (u.startsWith("//")) u = `https:${u}`;
    if (u.startsWith("/")) u = ORIGIN + u;
    try {
      const pathOnly = new URL(u).pathname;
      if (
        pathOnly.startsWith("/wp-content/") ||
        pathOnly.startsWith("/wp-includes/")
      ) {
        urls.add(pathOnly);
      }
    } catch {
      /* skip */
    }
  }
  for (const m of html.matchAll(
    /url\((['"]?)(\/wp-content\/[^)'"]+)\1\)/gi,
  )) {
    urls.add(m[2].split("?")[0]);
  }
}

// Also include pageCss arrays + global-css.json
try {
  const globalCss = JSON.parse(
    fs.readFileSync("src/data/global-css.json", "utf8"),
  );
  for (const u of globalCss) {
    if (typeof u === "string" && u.startsWith("/")) urls.add(u.split("?")[0]);
  }
} catch {
  /* optional */
}
for (const page of pages) {
  for (const u of page.pageCss || []) {
    if (typeof u === "string" && u.startsWith("/")) urls.add(u.split("?")[0]);
  }
}

for (const p of paths) {
  console.log("scan", p);
  const html = await fetchHtml(p);
  if (html) collect(html);
}

console.log("asset urls", urls.size);
let dl = 0;
let skip = 0;
let fail = 0;

for (const rel of urls) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, "").replace(/[?#].*$/, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 20) {
    skip++;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const res = await fetch(ORIGIN + rel, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      fail++;
      console.log("FAIL", res.status, rel);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const head = buf.slice(0, 200).toString("utf8").toLowerCase();
    if (head.includes("<!doctype html") || head.includes("<html")) {
      fail++;
      console.log("HTML", rel);
      continue;
    }
    fs.writeFileSync(dest, buf);
    dl++;
    if (dl % 25 === 0) console.log("downloaded", dl);
  } catch (e) {
    fail++;
    console.log("ERR", rel, e.message);
  }
}

console.log({ dl, skip, fail, total: urls.size });
