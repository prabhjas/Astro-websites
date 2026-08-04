/**
 * Sync Elementor kit + stylesheet order + Google font files from live EOR.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://connectfz.com";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "EOR-Astro/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchBin(url) {
  const res = await fetch(url, { headers: { "User-Agent": "EOR-Astro/1.0" } });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

const html = await fetchText(`${ORIGIN}/?nowprocket=1`);
const kitClass = (html.match(/elementor-kit-(\d+)/) || [])[1] || "8";

const cssHrefs = [];
for (const m of html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi)) {
  let u = m[1].replace(/&#038;/g, "&").replace(/&amp;/g, "&");
  if (u.startsWith("//")) u = `https:${u}`;
  else if (u.startsWith("/")) u = ORIGIN + u;
  if (!u.includes("connectfz.com") && !u.includes("fonts.googleapis.com")) continue;
  cssHrefs.push(u.split("?")[0]);
}

const localOrder = [];
for (const abs of cssHrefs) {
  if (abs.includes("fonts.googleapis.com")) continue;
  const rel = new URL(abs).pathname;
  localOrder.push(rel);
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 20) {
    try {
      const buf = await fetchBin(ORIGIN + rel);
      if (buf) fs.writeFileSync(dest, buf);
    } catch {
      /* ignore */
    }
  }
}

// Ensure kit CSS is fresh
const kitRel = `/wp-content/uploads/elementor/css/post-${kitClass}.css`;
{
  const css = await fetchText(ORIGIN + kitRel);
  fs.writeFileSync(path.join(ROOT, "public", kitRel.replace(/^\//, "")), css);
}

// Download font files referenced by local google-fonts CSS (rewrite absolute live URLs → relative)
const fontCssDir = path.join(ROOT, "public/wp-content/uploads/elementor/google-fonts/css");
const fontDir = path.join(ROOT, "public/wp-content/uploads/elementor/google-fonts/fonts");
fs.mkdirSync(fontDir, { recursive: true });
let fontsDownloaded = 0;
if (fs.existsSync(fontCssDir)) {
  for (const name of fs.readdirSync(fontCssDir).filter((f) => f.endsWith(".css"))) {
    const file = path.join(fontCssDir, name);
    let css = fs.readFileSync(file, "utf8");
    const urls = [...css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)].map((m) => m[2]);
    for (const u of urls) {
      let abs = u;
      if (u.startsWith("//")) abs = `https:${u}`;
      else if (u.startsWith("/")) abs = ORIGIN + u;
      else if (u.startsWith("../fonts/")) abs = ORIGIN + "/wp-content/uploads/elementor/google-fonts/fonts/" + u.replace("../fonts/", "");
      else if (!/^https?:/i.test(u)) continue;
      if (!/connectfz\.com.*\/fonts\//i.test(abs) && !/google-fonts\/fonts\//i.test(abs)) continue;
      const fontName = abs.split("/").pop().split("?")[0];
      const dest = path.join(fontDir, fontName);
      if (!fs.existsSync(dest) || fs.statSync(dest).size < 100) {
        const buf = await fetchBin(abs.split("?")[0]);
        if (buf) {
          fs.writeFileSync(dest, buf);
          fontsDownloaded++;
        }
      }
      css = css.split(u).join(`../fonts/${fontName}`);
    }
    fs.writeFileSync(file, css);
  }
}

fs.writeFileSync(path.join(DATA, "live-css-order.json"), JSON.stringify(localOrder, null, 2));
fs.writeFileSync(
  path.join(DATA, "kit.json"),
  JSON.stringify({ kitId: Number(kitClass), kitCss: kitRel }, null, 2),
);

console.log(
  JSON.stringify(
    {
      kitClass,
      cssCount: localOrder.length,
      fontsDownloaded,
      sample: localOrder.slice(0, 12),
      hasPost8: localOrder.some((x) => x.includes("post-8")),
      hasPost19: localOrder.some((x) => x.includes("post-19")),
      hasNunito: localOrder.some((x) => /nunito/i.test(x)),
      hasOwl: localOrder.some((x) => /owl/i.test(x)),
    },
    null,
    2,
  ),
);
