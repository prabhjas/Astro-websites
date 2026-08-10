#!/usr/bin/env node
/**
 * Audit + fix missing local images for ALL ngmanpower pages/posts.
 * - Collects every /wp-content image reference from pages, posts, header, footer, CSS
 * - Downloads missing files from 
 * - Rewrites absolute live image URLs → root-relative
 *
 *   node scripts/fix-all-local-images.mjs
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  createWriteStream,
  statSync,
  readdirSync,
} from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src/data");
const PUBLIC = join(ROOT, "public");
const ORIGIN = "";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MEDIA_EXT = /\.(png|jpe?g|webp|gif|svg|ico|bmp|avif)(\?|$)/i;
const LIVE_HOST = /https?:\/\/(?:www\.)?ngmanpower\.com/gi;

function stripLiveHost(text) {
  return text
    .replace(/https?:\/\/(?:www\.)?ngmanpower\.com/gi, "")
    .replace(/\/\/(?:www\.)?ngmanpower\.com/gi, "");
}

function collectPathsFromText(text, into) {
  if (!text) return;
  const add = (raw) => {
    let u = (raw || "").trim();
    if (!u || u.startsWith("data:") || u.startsWith("#") || u.startsWith("mailto:")) return;
    u = u.replace(LIVE_HOST, "");
    u = u.replace(/^\/\/(?:www\.)?ngmanpower\.com/i, "");
    if (!u.startsWith("/")) return;
    const path = u.split("?")[0].split("#")[0];
    if (!path.startsWith("/wp-content/") && !path.startsWith("/wp-includes/")) return;
    if (!MEDIA_EXT.test(path) && !path.includes("/uploads/")) return;
    if (/\.(css|js)$/i.test(path)) return;
    into.add(path);
  };

  for (const m of text.matchAll(
    /(?:src|href|content|poster|data-src|data-lazy-src|data-bg|data-background)=["']([^"']+)["']/gi,
  )) {
    add(m[1].split(/\s+/)[0]);
  }
  for (const m of text.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) add(part.trim().split(/\s+/)[0]);
  }
  for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    add(m[1].trim());
  }
  // JSON fields
  for (const m of text.matchAll(
    /"(?:featuredImage|ogImage|url|image|logo|src|icon|favicon|appleTouchIcon)"\s*:\s*"([^"]+)"/gi,
  )) {
    add(m[1]);
  }
}

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", "dist", ".data", ".git"].includes(name)) continue;
      walk(p, exts, out);
    } else if (exts.has(extname(name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function rewriteFile(file) {
  const before = readFileSync(file, "utf8");
  if (!/ngmanpower\.com/i.test(before)) return false;
  // Only rewrite media/upload absolute URLs (keep page canonicals in seo if needed —
  // but user asked images local; strip all live host under wp-content)
  let after = before.replace(
    /https?:\/\/(?:www\.)?ngmanpower\.com(\/wp-content\/[^"'\\\s)>\]]*)/gi,
    "$1",
  );
  after = after.replace(
    /\/\/(?:www\.)?ngmanpower\.com(\/wp-content\/[^"'\\\s)>\]]*)/gi,
    "$1",
  );
  after = after.replace(
    /https?:\/\/(?:www\.)?ngmanpower\.com(\/[^"'\\\s)>\]]+\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif)(?:\?[^"'\\\s)>\]]*)?)/gi,
    "$1",
  );
  if (after === before) return false;
  writeFileSync(file, after);
  return true;
}

async function main() {
  const paths = new Set();

  // Data files
  for (const name of [
    "pages.json",
    "posts.json",
    "seo.json",
    "site.json",
    "header.html",
    "footer.html",
    "bodies.json",
  ]) {
    const f = join(DATA, name);
    if (!existsSync(f)) continue;
    collectPathsFromText(readFileSync(f, "utf8"), paths);
  }

  // CSS that may reference backgrounds
  for (const f of walk(join(PUBLIC, "css"), new Set([".css"]))) {
    collectPathsFromText(readFileSync(f, "utf8"), paths);
  }
  for (const f of walk(join(PUBLIC, "wp-content/uploads/elementor/css"), new Set([".css"]))) {
    collectPathsFromText(readFileSync(f, "utf8"), paths);
  }

  // Also scan live pages for each local page path to catch missing sized variants
  let pages = [];
  let posts = [];
  try {
    pages = JSON.parse(readFileSync(join(DATA, "pages.json"), "utf8"));
  } catch {
    /* */
  }
  try {
    posts = JSON.parse(readFileSync(join(DATA, "posts.json"), "utf8"));
  } catch {
    /* */
  }

  console.log(`Collected ${paths.size} media paths from local data/CSS`);
  console.log(`Fetching live HTML for ${pages.length} pages + ${posts.length} posts to catch extras...`);

  const entries = [
    ...pages.map((p) => ({ path: p.path || "/", kind: "page" })),
    ...posts.map((p) => ({ path: p.path, kind: "post" })),
  ].filter((e) => e.path);

  let i = 0;
  const concurrency = 5;
  async function fetchWorker() {
    while (i < entries.length) {
      const idx = i++;
      const { path, kind } = entries[idx];
      try {
        const url = `${ORIGIN}${path === "/" ? "/" : path}?nowprocket=1`;
        const res = await fetch(url, {
          headers: { "User-Agent": UA, Accept: "text/html" },
          redirect: "follow",
        });
        if (!res.ok) {
          console.warn(" live fail", kind, path, res.status);
          continue;
        }
        const html = await res.text();
        collectPathsFromText(html, paths);
        if (idx % 20 === 0) console.log(`  scanned ${idx + 1}/${entries.length}`);
      } catch (e) {
        console.warn(" live err", kind, path, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => fetchWorker()));

  const list = [...paths].sort();
  console.log(`Total unique media paths: ${list.length}`);

  const missing = [];
  const present = [];
  for (const path of list) {
    const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
    if (existsSync(dest) && statSync(dest).size > 0) present.push(path);
    else missing.push(path);
  }
  console.log(`Present: ${present.length}  Missing: ${missing.length}`);

  let dlOk = 0;
  let dlFail = 0;
  let j = 0;
  const failSamples = [];
  async function dlWorker() {
    while (j < missing.length) {
      const idx = j++;
      const path = missing[idx];
      const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
      try {
        await download(ORIGIN + path, dest);
        dlOk++;
        if (dlOk <= 40 || dlOk % 50 === 0) console.log(" DL", path);
      } catch (e) {
        dlFail++;
        if (failSamples.length < 30) failSamples.push({ path, err: e.message });
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => dlWorker()));

  // Rewrite absolute live media URLs in data + css
  const rewriteTargets = [
    ...walk(DATA, new Set([".json", ".html"])),
    ...walk(join(PUBLIC, "css"), new Set([".css"])),
  ];
  let rewritten = 0;
  for (const f of rewriteTargets) {
    if (f.includes(".bak")) continue;
    if (rewriteFile(f)) {
      rewritten++;
      console.log(" REWRITE", f.replace(ROOT, "ng"));
    }
  }

  // Final recount
  let stillMissing = 0;
  for (const path of list) {
    const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
    if (!existsSync(dest) || statSync(dest).size === 0) stillMissing++;
  }

  console.log(
    JSON.stringify(
      {
        totalPaths: list.length,
        wasPresent: present.length,
        wasMissing: missing.length,
        dlOk,
        dlFail,
        rewrittenFiles: rewritten,
        stillMissing,
        failSamples,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
