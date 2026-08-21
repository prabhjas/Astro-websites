#!/usr/bin/env node
/**
 * Fast concurrent image download for missing public/wp-content/uploads refs.
 * Validates magic bytes; never keeps HTML soft-404s.
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://raadrecruitment.ae";
const PUBLIC = path.join(process.cwd(), "public");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;

function isImageBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return true;
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP")
    return true;
  if (buf.slice(0, 6).toString("ascii") === "GIF87a" || buf.slice(0, 6).toString("ascii") === "GIF89a")
    return true;
  return false;
}

function isHtmlBuffer(buf) {
  const head = buf.slice(0, 120).toString("utf8").toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html");
}

function existsGood(rel) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (!fs.existsSync(dest)) return false;
  const buf = fs.readFileSync(dest);
  return isImageBuffer(buf) && !isHtmlBuffer(buf);
}

async function fetchBuf(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (isHtmlBuffer(buf) || !isImageBuffer(buf)) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function download(rel) {
  if (existsGood(rel)) return "skip";
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  const unscaled = rel.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp|gif)$)/i, "");
  const urls = [ORIGIN + rel, ORIGIN + unscaled].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  for (const url of urls) {
    const buf = await fetchBuf(url);
    if (!buf) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return "dl";
  }
  return "fail";
}

async function pool(items, limit, worker) {
  let i = 0;
  const results = new Array(items.length);
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// Collect needed paths
const needed = new Set();
const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
const posts = JSON.parse(fs.readFileSync("src/data/posts.json", "utf8"));
const blob =
  JSON.stringify(pages) +
  JSON.stringify(posts) +
  fs.readFileSync("src/data/header.html", "utf8") +
  fs.readFileSync("src/data/footer.html", "utf8");

for (const m of blob.matchAll(
  /\/wp-content\/uploads\/[^\s"'\\<>)]+\.(?:png|jpe?g|webp|gif)/gi,
)) {
  needed.add(m[0].replace(/\\+\//g, "/").split("?")[0]);
}

// live homepage (timeout protected)
{
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${ORIGIN}/?nowprocket=1`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: ctrl.signal,
    });
    if (res.ok) {
      const html = await res.text();
      for (const m of html.matchAll(
        /(?:src|data-src|data-lazy-src)=["']([^"']+\.(?:png|jpe?g|webp|gif)[^"']*)["']/gi,
      )) {
        try {
          const u = new URL(m[1].startsWith("//") ? "https:" + m[1] : m[1], ORIGIN);
          if (u.hostname.includes("raadrecruitment.ae") && u.pathname.includes("/uploads/")) {
            needed.add(u.pathname);
          }
        } catch {
          /* skip */
        }
      }
      for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
        for (const part of m[1].split(",")) {
          const tok = part.trim().split(/\s+/)[0];
          try {
            const u = new URL(tok.startsWith("//") ? "https:" + tok : tok, ORIGIN);
            if (
              u.hostname.includes("raadrecruitment.ae") &&
              /\.(png|jpe?g|webp|gif)$/i.test(u.pathname)
            ) {
              needed.add(u.pathname);
            }
          } catch {
            /* skip */
          }
        }
      }
    }
  } catch {
    console.warn("live homepage fetch skipped/failed");
  } finally {
    clearTimeout(t);
  }
}

const list = [...needed].filter((p) => p.startsWith("/wp-content/uploads/"));
console.log("needed", list.length, "missing", list.filter((p) => !existsGood(p)).length);

const missing = list.filter((p) => !existsGood(p));
const results = await pool(missing, CONCURRENCY, download);
const dl = results.filter((r) => r === "dl").length;
const skip = list.length - missing.length;
const fail = results.filter((r) => r === "fail").length;
const fails = missing.filter((_, i) => results[i] === "fail");
console.log({ dl, skip, fail });
fs.writeFileSync("scripts/_failed-images.json", JSON.stringify(fails, null, 2));
if (fails.length) console.log("fails", fails.slice(0, 40));
