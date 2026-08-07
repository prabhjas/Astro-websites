#!/usr/bin/env node
/**
 * One-pass parity fix for MBS Consultancy Astro mirror:
 * - Rewrite absolute mbs-consultancy.com URLs in CSS/HTML to local paths
 * - Download missing assets referenced by HTML/CSS (images, fonts, videos, JS)
 * - Extract Impreza / Smart Slider / Ultimate inline boot scripts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://mbs-consultancy.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

process.chdir(ROOT);

const ABS = /https?:\/\/(?:www\.)?mbs-consultancy\.(?:com|ae)/gi;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isSoft404Buf(buf, dest = "") {
  if (!buf || buf.length < 20) return true;
  const ext = path.extname(dest).toLowerCase();
  if ([".svg", ".css", ".js", ".html", ".json", ".map", ".txt", ".xml"].includes(ext)) return false;
  const ctHead = buf.subarray(0, 200).toString("utf8");
  return buf[0] === 0x3c && /<!DOCTYPE|<html\b|Page Not Found/i.test(ctHead);
}

function isSoft404File(dest) {
  try {
    if (!fs.existsSync(dest)) return true;
    if (fs.statSync(dest).size < 40) return true;
    const buf = fs.readFileSync(dest).subarray(0, 200);
    return isSoft404Buf(buf, dest);
  } catch {
    return true;
  }
}

async function download(relOrUrl, { force = false } = {}) {
  let rel = relOrUrl;
  let url = relOrUrl;
  if (rel.startsWith("http")) {
    try {
      const u = new URL(rel);
      if (!u.hostname.includes("mbs-consultancy.com")) return { ok: false, skip: true };
      rel = u.pathname;
      url = `${ORIGIN}${rel}${u.search || ""}`;
    } catch {
      return { ok: false, skip: true };
    }
  } else {
    if (!rel.startsWith("/")) return { ok: false, skip: true };
    url = `${ORIGIN}${rel}`;
  }
  // Normalize double slashes in path (marquee plugin)
  rel = rel.replace(/\/{2,}/g, "/");
  const dest = path.join("public", rel.replace(/^\//, ""));
  // Never treat HTML soft-404 stubs as cached; never overwrite a real local file with HTML
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 50 && !isSoft404File(dest)) {
    return { ok: true, cached: true, dest };
  }
  ensureDir(path.dirname(dest));
  try {
    const res = await fetch(url.split("?")[0], {
      headers: { "User-Agent": UA, Accept: "*/*", Referer: `${ORIGIN}/` },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, status: res.status, rel };
    const ct = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 20) return { ok: false, status: "tiny", rel };
    if (ct.includes("text/html") || isSoft404Buf(buf, dest)) {
      return { ok: false, status: "soft404-html", rel };
    }
    fs.writeFileSync(dest, buf);
    return { ok: true, dest, bytes: buf.length };
  } catch (e) {
    return { ok: false, error: String(e), rel };
  }
}

function rewriteAbsolute(text) {
  return text
    .replace(ABS, "")
    .replace(/url\(\s*\/\/mbs-consultancy\.(?:com|ae)/gi, "url(/")
    .replace(/\/\/mbs-consultancy\.(?:com|ae)\//gi, "/");
}

function collectRefs(text, into) {
  for (const m of text.matchAll(
    /(?:src|href|data-src|data-lazy-src|poster)=["']([^"']+)["']/gi,
  )) {
    into.add(m[1].split("?")[0]);
  }
  for (const m of text.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) into.add(u.split("?")[0]);
    }
  }
  for (const m of text.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi)) {
    let u = m[2].trim();
    if (u.startsWith("data:")) continue;
    into.add(u.split("?")[0]);
  }
  for (const m of text.matchAll(
    /(?:src|data-bg|data-background(?:-image)?)=["']([^"']+\.(?:mp4|webm|ogg|gif|png|jpe?g|webp|svg|woff2?|ttf|eot))["']/gi,
  )) {
    into.add(m[1].split("?")[0]);
  }
}

function walkCssFiles() {
  const roots = [
    "public/css",
    "public/wp-content/themes/Impreza",
    "public/wp-content/themes/Impreza-child",
    "public/wp-content/uploads/smile_fonts",
    "src/data",
  ];
  const files = [];
  for (const r of roots) {
    const abs = path.join(ROOT, r);
    if (!fs.existsSync(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const cur = stack.pop();
      const st = fs.statSync(cur);
      if (st.isDirectory()) {
        for (const name of fs.readdirSync(cur)) {
          if (name === "node_modules" || name === ".git") continue;
          stack.push(path.join(cur, name));
        }
      } else if (/\.(css|html)$/i.test(cur)) {
        files.push(cur);
      }
    }
  }
  return files;
}

function extractInlineBoots(liveHtml) {
  const boots = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(liveHtml))) {
    const body = m[1].trim();
    if (!body) continue;
    const keep =
      body.includes("$us.headerSettings") ||
      body.includes("$us.canvasOptions") ||
      (body.includes("this._N2") && body.includes("_r")) ||
      (body.includes("_N2.r(") && body.includes("SmartSlider")) ||
      /^var ajaxurl\s*=/.test(body);
    if (keep) boots.push(body);
  }
  return boots;
}

async function main() {
  const refs = new Set();
  const htmlSources = [
    "src/data/header.html",
    "src/data/footer.html",
    "_crawl/audit/live-home.html",
    "_crawl/audit/local-home.html",
  ];
  for (const f of htmlSources) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    let text = fs.readFileSync(p, "utf8");
    const rewritten = rewriteAbsolute(text);
    if (rewritten !== text && (f.endsWith(".html") || f.includes("src/data"))) {
      fs.writeFileSync(p, rewritten);
      text = rewritten;
      console.log("rewrote", f);
    }
    collectRefs(text, refs);
  }

  // pages + posts bodies (sample critical paths fully; scan all for asset refs)
  for (const name of ["pages.json", "posts.json"]) {
    const p = path.join(ROOT, "src/data", name);
    if (!fs.existsSync(p)) continue;
    let raw = fs.readFileSync(p, "utf8");
    if (ABS.test(raw)) {
      raw = rewriteAbsolute(raw);
      fs.writeFileSync(p, raw);
      console.log("rewrote absolute urls in", name);
    }
    const data = JSON.parse(raw);
    for (const item of data) {
      const html = item.bodyHtml || item.content || "";
      collectRefs(html, refs);
    }
  }

  let cssRewrites = 0;
  for (const file of walkCssFiles()) {
    let text = fs.readFileSync(file, "utf8");
    collectRefs(text, refs);
    if (!ABS.test(text) && !/\/\/mbs-consultancy\.(?:com|ae)/i.test(text)) continue;
    const next = rewriteAbsolute(text);
    if (next !== text) {
      fs.writeFileSync(file, next);
      cssRewrites++;
    }
  }
  console.log("css/html files rewritten:", cssRewrites);

  // Critical scripts always
  const criticalScripts = [
    "/wp-content/plugins/Ultimate_VC_Addons/assets/min-js/ultimate_bg.min.js",
    "/wp-content/plugins/marquee-image-crawler/js/marquee-image-crawler.js",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Application/Frontend/Assets/dist/n2.min.js",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider-frontend.min.js",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Application/Frontend/Assets/dist/smartslider.min.css",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Slider/SliderType/Simple/Assets/dist/ss-simple.min.js",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Widget/Arrow/ArrowImage/Assets/dist/w-arrow-image.min.js",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3/Widget/Bullet/Assets/dist/w-bullet.min.js",
    "/wp-content/plugins/nextend-smart-slider3-pro/Public/SmartSlider3Pro/Slider/SliderType/Showcase/Assets/dist/ss-showcase.min.js",
    "/wp-content/themes/Impreza/common/js/vendor/royalslider.js",
    "/wp-content/themes/Impreza/common/js/vendor/magnific-popup.js",
    "/wp-content/plugins/responsive-accordion-and-collapse/js/accordion.js",
    "/wp-content/plugins/responsive-accordion-and-collapse/js/accordion-custom.js",
    "/wp-content/plugins/popup-maker/dist/assets/site.js",
    "/wp-content/uploads/custom-css-js/26902.js",
    "/wp-content/plugins/responsive-accordion-and-collapse/css/font-awesome/fonts/fontawesome-webfont.woff",
    "/wp-content/plugins/responsive-accordion-and-collapse/css/font-awesome/fonts/fontawesome-webfont.ttf",
    "/wp-content/plugins/responsive-accordion-and-collapse/css/font-awesome/fonts/fontawesome-webfont.eot",
    "/wp-content/themes/Impreza/fonts/fa-solid-900.woff2",
    "/wp-content/themes/Impreza/fonts/fa-regular-400.woff2",
    "/wp-content/themes/Impreza/fonts/fa-light-300.woff2",
    "/wp-content/themes/Impreza/fonts/fa-brands-400.woff2",
    "/wp-content/themes/Impreza/fonts/material-icons.woff2",
    "/wp-content/uploads/2023/09/Expand.mp4",
    "/wp-content/uploads/2023/09/Outsource.mp4",
    "/wp-content/uploads/2023/09/Hire.mp4",
    "/wp-content/uploads/2023/09/Manage.mp4",
    "/wp-content/uploads/2023/08/Animation-500x600-1.mp4",
    "/wp-content/uploads/2023/08/Animation-500x600-1.mp4.webm",
    "/wp-content/uploads/2023/08/Top-Right.png",
    "/wp-content/uploads/2023/08/Bottom-Left.png",
    "/wp-content/uploads/2023/08/Group-133.svg",
  ];
  for (const s of criticalScripts) refs.add(s);

  // Live script src list
  const liveSrcPath = path.join(ROOT, "_crawl/audit/live-script-srcs.json");
  if (fs.existsSync(liveSrcPath)) {
    for (const s of JSON.parse(fs.readFileSync(liveSrcPath, "utf8"))) {
      const rel = s.replace(ABS, "").replace(/\?.*$/, "").replace(/\/{2,}/g, "/");
      if (rel.startsWith("/wp-") || rel.startsWith("/uploads")) refs.add(rel);
    }
  }

  let got = 0;
  let miss = 0;
  let cached = 0;
  const missing = [];
  const list = [...refs].filter((u) => {
    if (!u || u.startsWith("data:") || u.startsWith("#") || u.startsWith("mailto:")) return false;
    if (u.startsWith("http") && !/mbs-consultancy\.(?:com|ae)/i.test(u)) return false;
    const rel = u.startsWith("http") ? new URL(u).pathname : u;
    return (
      rel.startsWith("/wp-content") ||
      rel.startsWith("/wp-includes") ||
      rel.startsWith("/uploads")
    );
  });

  console.log("asset refs to check:", list.length);
  // concurrency 8
  const queue = [...list];
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      const rel = u.startsWith("http") ? new URL(u).pathname : u.replace(/\/{2,}/g, "/");
      const dest = path.join("public", rel.replace(/^\//, ""));
      if (fs.existsSync(dest) && fs.statSync(dest).size > 50 && !isSoft404File(dest)) {
        cached++;
        continue;
      }
      const r = await download(rel);
      if (r.ok && !r.cached) {
        got++;
        if (got % 25 === 0) console.log("downloaded", got, rel);
      } else if (r.cached) {
        cached++;
      } else {
        miss++;
        missing.push({ rel, status: r.status || r.error });
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  console.log({ got, miss, cached });
  ensureDir("_crawl/audit");
  fs.writeFileSync(
    "_crawl/audit/parity-missing-assets.json",
    JSON.stringify(missing, null, 2),
  );

  // Inline boots
  const liveHome =
    ["_crawl/audit/live-home.html", "_crawl/compare/live-home.html", "_crawl/homepage.html"]
      .map((p) => path.join(ROOT, p))
      .find((p) => fs.existsSync(p) && fs.statSync(p).size > 1000);

  if (liveHome) {
    let html = fs.readFileSync(liveHome, "utf8");
    html = rewriteAbsolute(html);
    const boots = extractInlineBoots(html).map((b) =>
      b.replace(/https:\/\/mbs-consultancy\.(?:com|ae)/g, ""),
    );
    ensureDir("public/scripts");
    const out = `/* Auto-generated Impreza / Smart Slider boot from live homepage */\n${boots.join(
      "\n;\n",
    )}\n`;
    fs.writeFileSync("public/scripts/impreza-boot.js", out);
    console.log("wrote public/scripts/impreza-boot.js", boots.length, "blocks", out.length);

    // Also apply Ultimate row backgrounds via tiny CSS helper data dump
    const upb = [];
    const upbRe =
      /<!--\s*Row Backgrounds\s*-->\s*<div class="upb_color"([^>]*)>/gi;
    let um;
    while ((um = upbRe.exec(html))) {
      const attrs = um[1];
      const color = (attrs.match(/data-bg-color=["']([^"']+)["']/i) || [])[1];
      const vc = (attrs.match(/data-vc=["']([^"']+)["']/i) || [])[1];
      if (color) upb.push({ color, vc });
    }
    fs.writeFileSync("_crawl/audit/upb-colors.json", JSON.stringify(upb, null, 2));
    console.log("upb colors", upb);
  }

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
