/**
 * Sync missing images, Elementor handler chunks, select2, fonts from live.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ORIGIN = "https://connectfz.com";
const LOCAL = "http://127.0.0.1:5096";
const ROOT = process.cwd();

async function save(rel) {
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 50) {
    const head = fs.readFileSync(dest).subarray(0, 15).toString("utf8");
    if (!head.includes("<!DOCTYPE") && !head.includes("<html")) return "exists";
  }
  const r = await fetch(ORIGIN + rel, { headers: { "User-Agent": "Mozilla/5.0" } });
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "";
  if (!r.ok || buf[0] === 0x3c || ct.includes("text/html")) return `fail ${r.status} ${ct}`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return `saved ${buf.length}`;
}

const known = [
  "/wp-content/uploads/2020/10/Connect-FZ-logo.png",
  "/wp-content/uploads/2023/06/Certified-ISO-9001-2015-Connect-Resources-1.png",
  "/wp-content/uploads/2023/06/Certified-ISO-14001-2015-Connect-Resources-1.png",
  "/wp-content/uploads/2023/06/In-Country-Value.png",
  "/wp-content/uploads/2023/10/bxl-facebook-square.png",
  "/wp-content/uploads/2023/10/bxl-linkedin-square.png",
  "/wp-content/uploads/2023/10/bxl-Instagram-square.png",
  "/wp-content/uploads/2023/10/Connect-FZLogo.png",
  "/wp-content/plugins/modeltheme-framework/js/select2.min.js",
  "/wp-content/themes/oklahoma/js/wow.min.js",
  "/wp-content/plugins/elementor/assets/js/section-frontend-handlers.d85ab872da118940910d.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/text-editor.45609661e409413f1cef.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/accordion.8b0db5058afeb74622f5.bundle.min.js",
];

console.log("known assets...");
for (const rel of known) console.log(rel, await save(rel));

// Collect 404 image URLs from key pages via Playwright
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const missing = new Set();
const paths = [
  "/",
  "/about-us/",
  "/contact/",
  "/insights/",
  "/free-zones/",
  "/business-consultants-uae/",
  "/pro-services/visa-services/",
];
for (const p of paths) {
  page.removeAllListeners("response");
  page.on("response", async (res) => {
    if (res.status() !== 404) return;
    try {
      const u = new URL(res.url());
      if (u.origin.includes("127.0.0.1") && /\.(png|jpe?g|webp|gif|svg|woff2?|css|js)$/i.test(u.pathname)) {
        missing.add(u.pathname);
      }
    } catch {
      /* ignore */
    }
  });
  await page.goto(LOCAL + p, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(400);
}
await browser.close();

console.log("discovered missing", missing.size);
let ok = 0,
  fail = 0;
for (const rel of missing) {
  const st = await save(rel);
  console.log(st.startsWith("saved") || st === "exists" ? "OK" : "FAIL", rel, st);
  if (st.startsWith("saved") || st === "exists") ok++;
  else fail++;
}

// Download fonts referenced by local google-fonts css
const fontCssDir = path.join(ROOT, "public/wp-content/uploads/elementor/google-fonts/css");
const fontDir = path.join(ROOT, "public/wp-content/uploads/elementor/google-fonts/fonts");
fs.mkdirSync(fontDir, { recursive: true });
let fonts = 0;
if (fs.existsSync(fontCssDir)) {
  for (const name of fs.readdirSync(fontCssDir).filter((f) => f.endsWith(".css"))) {
    let css = fs.readFileSync(path.join(fontCssDir, name), "utf8");
    const urls = [...css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]);
    for (const u of urls) {
      let abs = u;
      if (u.startsWith("//")) abs = `https:${u}`;
      else if (u.startsWith("/")) abs = ORIGIN + u;
      else if (u.startsWith("../fonts/")) abs = ORIGIN + "/wp-content/uploads/elementor/google-fonts/fonts/" + u.replace("../fonts/", "");
      else if (!/^https?:/i.test(u)) continue;
      if (!/google-fonts\/fonts\//i.test(abs) && !/connectfz\.com.*\/fonts\//i.test(abs)) continue;
      const fontName = abs.split("/").pop().split("?")[0];
      const dest = path.join(fontDir, fontName);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 100) continue;
      const buf = await fetch(abs.split("?")[0], { headers: { "User-Agent": "Mozilla/5.0" } })
        .then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null))
        .catch(() => null);
      if (!buf || buf[0] === 0x3c) continue;
      fs.writeFileSync(dest, buf);
      fonts++;
    }
    // rewrite absolute connectfz font URLs to relative
    const rewritten = css.replace(
      /https?:\/\/connectfz\.com\/wp-content\/uploads\/elementor\/google-fonts\/fonts\//g,
      "../fonts/",
    );
    if (rewritten !== css) fs.writeFileSync(path.join(fontCssDir, name), rewritten);
  }
}
console.log({ ok, fail, fonts });

// Add select2 + wow to scripts if missing from ElementorScripts — handled separately
