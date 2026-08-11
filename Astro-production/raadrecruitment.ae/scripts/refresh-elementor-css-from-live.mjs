#!/usr/bin/env node
/**
 * Clear & re-download Elementor-generated CSS (+ referenced pageCss) from live.
 * Also re-sync live stylesheet order and homepage inline CSS blocks.
 *
 * Usage: node scripts/refresh-elementor-css-from-live.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://raadrecruitment.ae";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const PUBLIC = path.join(ROOT, "public");
const CSS_DIR = path.join(PUBLIC, "wp-content/uploads/elementor/css");

function localizeCss(css) {
  return css
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
}

async function downloadText(urlPath) {
  const url = ORIGIN + urlPath + (urlPath.includes("?") ? "&" : "?") + "nowprocket=1";
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/css,*/*", Referer: ORIGIN + "/" },
    redirect: "follow",
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString("utf8");
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(`${res.status} ${urlPath}`);
  if (/text\/html/i.test(ct) || text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
    throw new Error(`HTML soft-404 for ${urlPath}`);
  }
  return text;
}

function collectCssRefs() {
  const refs = new Set();
  for (const file of ["src/data/pages.json", "src/data/posts.json", "src/data/live-css-order.json", "src/data/page-css.json", "src/data/global-css.json"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    const raw = fs.readFileSync(full, "utf8");
    for (const m of raw.matchAll(/\/wp-content\/uploads\/elementor\/css\/[a-zA-Z0-9._-]+\.css/g)) {
      refs.add(m[0]);
    }
    for (const m of raw.matchAll(/\/wp-content\/uploads\/elementor\/google-fonts\/css\/[a-zA-Z0-9._-]+\.css/g)) {
      refs.add(m[0]);
    }
    for (const m of raw.matchAll(/\/wp-content\/plugins\/elementor[^"'\s]+\.css/g)) {
      refs.add(m[0].replace(/\\+\//g, "/"));
    }
    for (const m of raw.matchAll(/\/wp-content\/plugins\/elementor-pro[^"'\s]+\.css/g)) {
      refs.add(m[0].replace(/\\+\//g, "/"));
    }
  }
  // Always refresh kit + known homepage posts
  for (const id of [30, 861, 940, 1298, 1890, 558, 410, 1331, 2316, 1338, 909, 1610, 1734]) {
    refs.add(`/wp-content/uploads/elementor/css/post-${id}.css`);
  }
  return [...refs];
}

async function refreshFile(rel) {
  const dest = path.join(PUBLIC, ...rel.replace(/^\//, "").split("/"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const text = localizeCss(await downloadText(rel));
  fs.writeFileSync(dest, text);
  return text.length;
}

async function syncCssOrder() {
  const html = await (
    await fetch(`${ORIGIN}/?nowprocket=1`, { headers: { "User-Agent": UA } })
  ).text();
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]
    .map((m) => {
      const h = m[0].match(/href=["']([^"']+)/i);
      if (!h) return null;
      let u = h[1];
      if (u.startsWith("//")) u = `https:${u}`;
      try {
        const url = new URL(u, ORIGIN);
        if (!url.hostname.includes("raadrecruitment.ae")) return null;
        // Map rocket cache paths back to originals
        let p = url.pathname.replace(/^\/wp-content\/cache\/min\/\d+\//, "/");
        return p;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const unique = [...new Set(hrefs)];
  fs.writeFileSync(
    path.join(ROOT, "src/data/live-css-order.json"),
    `${JSON.stringify(unique, null, 2)}\n`,
  );
  return unique;
}

async function syncInlineCss() {
  const html = await (
    await fetch(`${ORIGIN}/?nowprocket=1`, { headers: { "User-Agent": UA } })
  ).text();
  const blocks = [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)];
  const outDir = path.join(PUBLIC, "css", "live-inline");
  fs.mkdirSync(outDir, { recursive: true });
  // Clear old extracted files we manage
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith(".css")) fs.unlinkSync(path.join(outDir, f));
  }
  const index = [];
  blocks.forEach((m, i) => {
    const attrs = m[1] || "";
    let css = localizeCss((m[2] || "").trim());
    if (css.length < 80) return;
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const id = idMatch?.[1] || `live-inline-${i + 1}`;
    const file = `${id.replace(/[^a-z0-9-_]+/gi, "-")}.css`;
    fs.writeFileSync(path.join(outDir, file), `${css}\n`);
    index.push(`/css/live-inline/${file}`);
    console.log(" inline", file, css.length);
  });
  fs.writeFileSync(
    path.join(ROOT, "src/data/live-inline-css.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  return index;
}

console.log("Clearing Elementor CSS cache dir…");
fs.mkdirSync(CSS_DIR, { recursive: true });
for (const f of fs.readdirSync(CSS_DIR)) {
  if (f.endsWith(".css")) fs.unlinkSync(path.join(CSS_DIR, f));
}

const refs = collectCssRefs();
console.log("Refreshing", refs.length, "CSS assets from live…");
let ok = 0;
let fail = 0;
for (const rel of refs) {
  try {
    const n = await refreshFile(rel);
    console.log(" OK", n, rel);
    ok++;
  } catch (e) {
    console.warn(" FAIL", rel, e.message);
    fail++;
  }
}

console.log("Syncing live CSS order…");
const order = await syncCssOrder();
console.log(" order", order.length);

console.log("Syncing live inline CSS…");
const inline = await syncInlineCss();
console.log(" inline files", inline.length);

console.log(JSON.stringify({ ok, fail, order: order.length, inline: inline.length }, null, 2));
