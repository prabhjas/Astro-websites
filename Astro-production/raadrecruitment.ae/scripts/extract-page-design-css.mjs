#!/usr/bin/env node
/**
 * Extract per-page Impreza design CSS (us_custom_*) from live for every page/post,
 * save under public/css/page-design/, and attach to pageCss/page entries.
 *
 *   node scripts/extract-page-design-css.mjs
 */
import { load } from "cheerio";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  createWriteStream,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src/data");
const PUBLIC = join(ROOT, "public");
const OUT_DIR = join(PUBLIC, "css/page-design");
const ORIGIN = "https://ngmanpower.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

mkdirSync(OUT_DIR, { recursive: true });

function slugifyPath(path) {
  if (!path || path === "/") return "home";
  return path
    .replace(/^\/|\/$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function stripDomain(css) {
  return css
    .replace(/https?:\/\/(?:www\.)?ngmanpower\.com/gi, "")
    .replace(/\/\/(?:www\.)?ngmanpower\.com/gi, "");
}

function collectUploads(css) {
  const set = new Set();
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    let u = m[1].trim().replace(/https?:\/\/(?:www\.)?ngmanpower\.com/gi, "");
    if (!u.startsWith("/wp-content/uploads/")) continue;
    set.add(u.split("?")[0].split("#")[0]);
  }
  return [...set];
}

async function download(path) {
  const dest = join(PUBLIC, ...path.split("/").filter(Boolean));
  if (existsSync(dest) && statSync(dest).size > 0) return "skip";
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + path, {
    headers: { "User-Agent": UA, Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return "ok";
}

async function fetchHtml(path) {
  const url = `${ORIGIN}${path === "/" ? "/" : path}?nowprocket=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

function extractDesignCss(html) {
  const ids = [
    "us-design-options-css",
    "us-theme-options-css",
    "us-header-css",
    "wp-custom-css",
  ];
  const chunks = [];
  for (const id of ids) {
    // Only take design-options per page (theme/header already global).
    // For pages we need us-design-options primarily — theme options may differ slightly.
    if (id !== "us-design-options-css") continue;
    const re = new RegExp(
      `<style[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/style>`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]?.trim()) chunks.push(m[1].trim());
  }
  // Also any style that contains many us_custom_ rules
  if (!chunks.length) {
    for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
      const body = m[1];
      if ((body.match(/us_custom_/g) || []).length >= 5) chunks.push(body.trim());
    }
  }
  return stripDomain(chunks.join("\n\n"));
}

async function main() {
  const pages = JSON.parse(readFileSync(join(DATA, "pages.json"), "utf8"));
  const posts = JSON.parse(readFileSync(join(DATA, "posts.json"), "utf8"));

  const media = new Set();
  let cssFiles = 0;

  async function processEntry(entry, kind) {
    const path = entry.path || "/";
    try {
      const html = await fetchHtml(path);
      const css = extractDesignCss(html);
      if (!css || css.length < 50) {
        console.warn(" no design css", kind, path);
        return;
      }
      const slug = slugifyPath(path);
      const rel = `/css/page-design/${slug}.css`;
      const dest = join(PUBLIC, "css/page-design", `${slug}.css`);
      writeFileSync(dest, css);
      cssFiles++;

      const pageCss = new Set([...(entry.pageCss || []), rel]);
      // Drop broken elementor css refs
      entry.pageCss = [...pageCss].filter(
        (h) => h && !/elementor\/css\/post-/i.test(h),
      );
      for (const p of collectUploads(css)) media.add(p);
      console.log(" CSS", kind, path, css.length, "→", rel);
    } catch (e) {
      console.warn(" FAIL", kind, path, e.message);
    }
  }

  console.log(`Extracting design CSS for ${pages.length} pages...`);
  for (const p of pages) await processEntry(p, "page");

  console.log(`Extracting design CSS for ${posts.length} posts...`);
  let i = 0;
  const concurrency = 4;
  async function worker() {
    while (i < posts.length) {
      const idx = i++;
      await processEntry(posts[idx], "post");
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  writeFileSync(join(DATA, "pages.json"), JSON.stringify(pages, null, 2) + "\n");
  writeFileSync(join(DATA, "posts.json"), JSON.stringify(posts, null, 2) + "\n");

  // download any bg images referenced only in page CSS
  const missing = [...media].filter((p) => {
    const dest = join(PUBLIC, ...p.split("/").filter(Boolean));
    return !existsSync(dest) || statSync(dest).size === 0;
  });
  console.log(`Page-CSS media refs: ${media.size}, missing: ${missing.length}`);
  let dlOk = 0;
  let dlFail = 0;
  for (const path of missing) {
    try {
      await download(path);
      dlOk++;
      console.log(" DL", path);
    } catch (e) {
      dlFail++;
      console.warn(" FAIL", path, e.message);
    }
  }

  console.log(JSON.stringify({ cssFiles, media: media.size, dlOk, dlFail }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
