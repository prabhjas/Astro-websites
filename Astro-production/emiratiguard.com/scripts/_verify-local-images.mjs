/**
 * Audit (and optionally download) image/upload assets referenced by emiratiguard.com
 * that are missing under public/.
 *
 *   node scripts/_verify-local-images.mjs
 *   node scripts/_verify-local-images.mjs --fix
 *   node scripts/_verify-local-images.mjs --fix --pages
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const ORIGIN = "https://emiratiguard.com";
const LOCAL = "http://127.0.0.1:5092";
const FIX = process.argv.includes("--fix");
const CHECK_PAGES = process.argv.includes("--pages");

const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif|ico|bmp)(\?|$)/i;
const ABS_RE = /https?:\/\/(?:www\.)?emiratiguard\.com(\/[^"'\\)\s]*)/gi;

function toLocalPath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0];
  return join(PUBLIC, ...clean.split("/").filter(Boolean));
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(css|html|js|json)$/i.test(name)) out.push(p);
  }
  return out;
}

function collectFromText(text, source) {
  /** @type {{url:string, path:string, source:string}[]} */
  const hits = [];
  for (const m of text.matchAll(ABS_RE)) {
    const path = m[1].split("?")[0].split("#")[0];
    if (!IMG_EXT.test(path) && !path.includes("/uploads/")) continue;
    if (/\.(css|js)(\?|$)/i.test(path)) continue;
    hits.push({ url: ORIGIN + path, path, source });
  }
  for (const m of text.matchAll(
    /(?:src|srcset|href|content|poster|data-src|data-lazy-src|data-bg|data-background|data-settings)=["']([^"']+)["']/gi,
  )) {
    const raw = m[1];
    for (const part of raw.split(",").map((s) => s.trim().split(/\s+/)[0])) {
      let path = part;
      if (/^https?:\/\/(?:www\.)?emiratiguard\.com\//i.test(path)) {
        path = path.replace(/^https?:\/\/(?:www\.)?emiratiguard\.com/i, "");
      }
      if (!path.startsWith("/wp-content/")) continue;
      path = path.split("?")[0].split("#")[0];
      if (!IMG_EXT.test(path) && !path.includes("/uploads/")) continue;
      if (/\.(css|js)$/i.test(path)) continue;
      hits.push({ url: ORIGIN + path, path, source });
    }
  }
  // JSON featuredImage / ogImage fields
  for (const m of text.matchAll(
    /"(?:featuredImage|ogImage|url|image|logo|src|icon)"\s*:\s*"([^"]+)"/gi,
  )) {
    let path = m[1];
    if (/^https?:\/\/(?:www\.)?emiratiguard\.com\//i.test(path)) {
      path = path.replace(/^https?:\/\/(?:www\.)?emiratiguard\.com/i, "");
    }
    if (!path.startsWith("/wp-content/")) continue;
    path = path.split("?")[0].split("#")[0];
    if (!IMG_EXT.test(path) && !path.includes("/uploads/")) continue;
    hits.push({ url: ORIGIN + path, path, source });
  }
  for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    let raw = m[1].trim();
    if (/^https?:\/\/(?:www\.)?emiratiguard\.com/i.test(raw)) {
      raw = raw.replace(/^https?:\/\/(?:www\.)?emiratiguard\.com/i, "");
    }
    if (!raw.startsWith("/wp-content/")) continue;
    const path = raw.split("?")[0].split("#")[0];
    if (!IMG_EXT.test(path) && !path.includes("/uploads/")) continue;
    if (/\.(css|js)$/i.test(path)) continue;
    hits.push({ url: ORIGIN + path, path, source });
  }
  return hits;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "emiratiguard-local-asset-check/1.0", Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function rewriteAbsInFile(filePath) {
  let text = readFileSync(filePath, "utf8");
  const before = text;
  text = text.replace(/https?:\/\/(?:www\.)?emiratiguard\.com(\/wp-content\/[^"'\\)\s]*)/gi, "$1");
  if (text !== before) {
    writeFileSync(filePath, text);
    return true;
  }
  return false;
}

async function main() {
  const sources = [];
  for (const name of [
    "migration-overrides.css",
    "live-inline.css",
    "elementor-bg-fallback.css",
    "wp-custom.css",
  ]) {
    sources.push(join(PUBLIC, "css", name));
  }
  walk(join(PUBLIC, "wp-content/uploads/elementor/css"), sources);
  walk(join(ROOT, "src/data"), sources);

  if (CHECK_PAGES) {
    const pages = ["/", "/free-zones-in-uae/", "/about-us/", "/contact-us/", "/insights/"];
    for (const path of pages) {
      try {
        const res = await fetch(LOCAL + path);
        const html = await res.text();
        const tmp = join(ROOT, "scripts", `_scan-${path.replace(/\W+/g, "_") || "home"}.html`);
        writeFileSync(tmp, html);
        sources.push(tmp);
      } catch (e) {
        console.warn("page fetch fail", path, e.message);
      }
    }
  }

  /** @type {Map<string,{url:string,path:string,sources:Set<string>}>} */
  const byPath = new Map();
  for (const src of sources) {
    if (!existsSync(src)) continue;
    const text = readFileSync(src, "utf8");
    for (const hit of collectFromText(text, src)) {
      const cur = byPath.get(hit.path) || { url: hit.url, path: hit.path, sources: new Set() };
      cur.sources.add(src.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
      byPath.set(hit.path, cur);
    }
  }

  const missing = [];
  const present = [];
  for (const item of [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const local = toLocalPath(item.path);
    if (existsSync(local) && statSync(local).size > 0) present.push(item);
    else missing.push({ ...item, local });
  }

  console.log(`Referenced image/upload assets: ${byPath.size}`);
  console.log(`Present locally: ${present.length}`);
  console.log(`Missing locally: ${missing.length}`);
  for (const m of missing.slice(0, 100)) console.log(" MISSING", m.path);

  const absLiveFiles = [];
  for (const src of sources) {
    if (!existsSync(src) || src.includes("scripts/_scan-")) continue;
    const text = readFileSync(src, "utf8");
    const matches = [...text.matchAll(ABS_RE)].map((m) => m[0]);
    const imgMatches = matches.filter((u) => IMG_EXT.test(u) || u.includes("/uploads/"));
    if (imgMatches.length) {
      absLiveFiles.push({
        src: src.replace(ROOT, ""),
        count: imgMatches.length,
        samples: [...new Set(imgMatches)].slice(0, 5),
      });
    }
  }
  console.log(`\nFiles with absolute emiratiguard.com asset URLs: ${absLiveFiles.length}`);
  for (const f of absLiveFiles.slice(0, 30)) {
    console.log(" FILE", f.src, "count", f.count);
    f.samples.forEach((s) => console.log("  ", s));
  }

  if (FIX) {
    let dlOk = 0;
    let dlFail = 0;
    const concurrency = 8;
    let i = 0;
    async function worker() {
      while (i < missing.length) {
        const idx = i++;
        const m = missing[idx];
        try {
          await download(m.url, m.local);
          dlOk += 1;
          console.log(" DL", m.path);
        } catch (e) {
          dlFail += 1;
          console.warn(" FAIL", m.path, e.message);
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    let rewritten = 0;
    const rewriteTargets = [
      ...walk(join(PUBLIC, "css")),
      ...walk(join(PUBLIC, "wp-content/uploads/elementor/css")),
      ...walk(join(ROOT, "src/data")),
    ];
    for (const f of rewriteTargets) {
      if (existsSync(f) && rewriteAbsInFile(f)) {
        rewritten += 1;
        console.log(" REWRITE", f.replace(ROOT, ""));
      }
    }

    // Sync downloaded files into dist/client if present
    const distPublic = join(ROOT, "dist/client");
    if (existsSync(distPublic)) {
      let synced = 0;
      for (const m of missing) {
        if (!existsSync(m.local)) continue;
        const rel = m.path.replace(/^\//, "");
        const dest = join(distPublic, rel);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, readFileSync(m.local));
        synced += 1;
      }
      console.log(`Synced ${synced} files into dist/client`);
    }

    console.log(`\nDownloaded ${dlOk}, failed ${dlFail}, rewritten files ${rewritten}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
