#!/usr/bin/env node
/**
 * Localize fonts + images referenced by site CSS/HTML.
 * - Download missing assets with magic-byte validation
 * - Rewrite absolute https://raadrecruitment.ae → root-relative in CSS/HTML/JSON
 * - Self-host Poppins (replace Google Fonts CDN)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "https://raadrecruitment.ae";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CONCURRENCY = 10;
const TIMEOUT_MS = 15000;

function isHtml(buf) {
  const h = buf.slice(0, 120).toString("utf8").toLowerCase();
  return h.includes("<!doctype html") || h.includes("<html");
}
function isImage(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP")
    return true;
  if (buf.slice(0, 3).toString() === "GIF") return true;
  if (buf.slice(0, 200).toString("utf8").toLowerCase().includes("<svg")) return true;
  return false;
}
function isFont(buf) {
  if (!buf || buf.length < 4) return false;
  const a = buf.slice(0, 4).toString("ascii");
  if (a === "wOF2" || a === "wOFF" || a === "OTTO" || a === "true") return true;
  if (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) return true;
  // eot often starts with 0x00 0x00 0x01 0x00 after little-endian length — accept non-html binary >1k
  if (buf.length > 1000 && !isHtml(buf) && !isImage(buf)) return true;
  return false;
}
function isCss(buf) {
  if (isHtml(buf)) return false;
  const t = buf.slice(0, 400).toString("utf8");
  return /@font-face|\{|\.elementor|\/\*/.test(t);
}

async function fetchBuf(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, n, fn) {
  let i = 0;
  const out = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

function walk(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

function rewriteAbs(s) {
  return s
    .replace(/https?:\/\/(?:www\.)?raadrecruitment\.ae\//g, "/")
    .replace(/\/\/(?:www\.)?raadrecruitment\.ae\//g, "/");
}

// ---------- 1) Rewrite absolute origin in local CSS/JSON/HTML ----------
const rewriteTargets = [
  ...walk(path.join(PUBLIC, "wp-content"), (p) => /\.css$/i.test(p)),
  ...walk(path.join(PUBLIC, "css"), (p) => /\.css$/i.test(p)),
  path.join(ROOT, "src/data/pages.json"),
  path.join(ROOT, "src/data/posts.json"),
  path.join(ROOT, "src/data/header.html"),
  path.join(ROOT, "src/data/footer.html"),
  path.join(ROOT, "src/data/live-css-order.json"),
  path.join(ROOT, "src/data/live-inline-css.json"),
];
let rewritten = 0;
for (const file of rewriteTargets) {
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  const next = rewriteAbs(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next);
    rewritten++;
  }
}
console.log("rewrote files", rewritten);

// ---------- 2) Collect needed asset paths from CSS url() + content ----------
const needed = new Set();

function addUrl(u, cssFilePath) {
  if (!u) return;
  u = u.trim().replace(/^url\(/i, "").replace(/\)$/, "").replace(/['"]/g, "");
  if (!u || u.startsWith("data:") || u.startsWith("#")) return;
  let pathname;
  try {
    if (u.startsWith("http") || u.startsWith("//")) {
      const abs = u.startsWith("//") ? "https:" + u : u;
      const host = new URL(abs).hostname;
      if (!host.includes("raadrecruitment.ae") && !host.includes("fonts.gstatic.com") && !host.includes("fonts.googleapis.com")) {
        return;
      }
      pathname = new URL(abs).pathname;
      // keep gstatic for poppins step separately
      if (host.includes("fonts.gstatic.com") || host.includes("fonts.googleapis.com")) return;
    } else if (u.startsWith("/")) {
      pathname = u.split("?")[0];
    } else if (cssFilePath) {
      const relCss = "/" + path.relative(PUBLIC, cssFilePath).split(path.sep).join("/");
      const dir = relCss.replace(/\/[^/]*$/, "/");
      pathname = path.posix.normalize(dir + u.split("?")[0]);
    } else return;
  } catch {
    return;
  }
  if (!pathname.startsWith("/")) pathname = "/" + pathname;
  if (/\.(png|jpe?g|webp|gif|svg|woff2?|ttf|otf|eot|css)(\?|$)/i.test(pathname)) {
    needed.add(pathname.split("?")[0]);
  }
}

for (const css of walk(PUBLIC, (p) => /\.css$/i.test(p))) {
  const text = fs.readFileSync(css, "utf8");
  for (const m of text.matchAll(/url\(([^)]+)\)/gi)) addUrl(m[1], css);
}

// From audit report if present
const reportPath = path.join(ROOT, "scripts/_asset-audit-report.json");
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  for (const row of [...(report.brokenImages || []), ...(report.brokenFonts || [])]) {
    if (row.path) needed.add(row.path);
    if (row.font) needed.add(row.font);
  }
}

// Known critical icon font paths
const critical = [
  "/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2",
  "/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff",
  "/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.ttf",
  "/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.eot",
  "/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.svg",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.ttf",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff2",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.ttf",
  "/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2",
  "/wp-includes/fonts/dashicons.woff2",
  "/wp-includes/fonts/dashicons.woff",
  "/wp-includes/fonts/dashicons.ttf",
  "/wp-includes/fonts/dashicons.eot",
  "/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png",
  "/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png",
];
critical.forEach((p) => needed.add(p));

console.log("needed assets", needed.size);

function existingOk(rel) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (!fs.existsSync(dest)) return false;
  const buf = fs.readFileSync(dest);
  if (isHtml(buf)) return false;
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(rel)) return isImage(buf);
  if (/\.(woff2?|ttf|otf|eot)$/i.test(rel)) return isFont(buf);
  if (/\.css$/i.test(rel)) return isCss(buf);
  return buf.length > 20;
}

async function download(rel) {
  if (existingOk(rel)) return "skip";
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  const urls = [ORIGIN + rel];
  // unscaled image sibling
  const unscaled = rel.replace(/-\d+x\d+(?=\.(?:png|jpe?g|webp|gif)$)/i, "");
  if (unscaled !== rel) urls.push(ORIGIN + unscaled);

  for (const url of urls) {
    const buf = await fetchBuf(url);
    if (!buf || isHtml(buf)) continue;
    const ok =
      (/\.(png|jpe?g|webp|gif|svg)$/i.test(rel) && isImage(buf)) ||
      (/\.(woff2?|ttf|otf|eot)$/i.test(rel) && isFont(buf)) ||
      (/\.css$/i.test(rel) && isCss(buf)) ||
      (!/\.(png|jpe?g|webp|gif|svg|woff2?|ttf|otf|eot|css)$/i.test(rel) && buf.length > 20);
    if (!ok) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return "dl";
  }
  return "fail";
}

const list = [...needed];
const missing = list.filter((p) => !existingOk(p));
console.log("missing", missing.length);
const results = await pool(missing, CONCURRENCY, download);
const dl = results.filter((r) => r === "dl").length;
const fail = results.filter((r) => r === "fail").length;
const fails = missing.filter((_, i) => results[i] === "fail");
console.log({ dl, fail });
fs.writeFileSync(
  path.join(ROOT, "scripts/_localize-fails.json"),
  JSON.stringify(fails, null, 2),
);

// ---------- 3) Self-host Poppins ----------
async function localizePoppins() {
  const cssUrl =
    "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap";
  const cssBuf = await fetchBuf(cssUrl);
  // Google returns different CSS by UA — use a modern browser UA already set
  if (!cssBuf) {
    console.warn("Poppins CSS fetch failed");
    return;
  }
  let css = cssBuf.toString("utf8");
  const fontDir = "/fonts/poppins";
  const absDir = path.join(PUBLIC, "fonts", "poppins");
  fs.mkdirSync(absDir, { recursive: true });

  const urls = [...css.matchAll(/url\(([^)]+)\)/gi)].map((m) =>
    m[1].replace(/['"]/g, ""),
  );
  const unique = [...new Set(urls)];
  for (const u of unique) {
    const name = path.basename(new URL(u).pathname);
    const dest = path.join(absDir, name);
    if (!(fs.existsSync(dest) && isFont(fs.readFileSync(dest)))) {
      const buf = await fetchBuf(u);
      if (!buf || !isFont(buf)) {
        console.warn("font fail", u);
        continue;
      }
      fs.writeFileSync(dest, buf);
    }
    css = css.split(u).join(`${fontDir}/${name}`);
  }
  const outCss = path.join(PUBLIC, "css", "fonts-poppins.css");
  fs.mkdirSync(path.dirname(outCss), { recursive: true });
  fs.writeFileSync(outCss, css);
  console.log("wrote", outCss, "fonts", unique.length);

  fs.writeFileSync(
    path.join(ROOT, "src/data/google-fonts.json"),
    JSON.stringify({ hrefs: ["/css/fonts-poppins.css"] }, null, 2) + "\n",
  );
}

await localizePoppins();

// ---------- 4) Also download woff2s listed in elementor google-fonts css after rewrite ----------
const gfCss = walk(
  path.join(PUBLIC, "wp-content", "uploads", "elementor", "google-fonts"),
  (p) => /\.css$/i.test(p),
);
const gfFonts = new Set();
for (const css of gfCss) {
  const text = fs.readFileSync(css, "utf8");
  for (const m of text.matchAll(/url\(([^)]+)\)/gi)) addUrl(m[1], css);
  for (const m of text.matchAll(/\/wp-content\/uploads\/elementor\/google-fonts\/fonts\/[^)"']+\.woff2/gi)) {
    gfFonts.add(m[0]);
  }
}
const gfMissing = [...gfFonts].filter((p) => !existingOk(p));
console.log("elementor google font files missing", gfMissing.length);
const gfRes = await pool(gfMissing, CONCURRENCY, download);
console.log({
  gfDl: gfRes.filter((r) => r === "dl").length,
  gfFail: gfRes.filter((r) => r === "fail").length,
});

console.log("done");
