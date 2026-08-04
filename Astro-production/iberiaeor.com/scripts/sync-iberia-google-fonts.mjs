/**
 * Download Manrope + Lato (live Elementor Google Fonts) into public for offline use.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_DIR = path.join(ROOT, "public/wp-content/uploads/elementor/google-fonts/css");
const FONT_DIR = path.join(ROOT, "public/wp-content/uploads/elementor/google-fonts/fonts");
fs.mkdirSync(CSS_DIR, { recursive: true });
fs.mkdirSync(FONT_DIR, { recursive: true });

const FAMILIES = [
  {
    name: "manrope",
    url: "https://fonts.googleapis.com/css?family=Manrope:100,200,300,400,500,600,700,800,900&display=swap",
  },
  {
    name: "lato",
    url: "https://fonts.googleapis.com/css?family=Lato:100,200,300,400,500,600,700,800,900&display=swap",
  },
];

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchBin(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

let downloaded = 0;
for (const family of FAMILIES) {
  // Request woff2-capable CSS
  let css = await fetchText(family.url, { Accept: "text/css,*/*;q=0.1" });
  const urls = [...css.matchAll(/url\((['"]?)(https:\/\/fonts\.gstatic\.com[^)'"]+)\1\)/g)].map(
    (m) => m[2],
  );
  for (const abs of urls) {
    const fontName = abs.split("/").pop().split("?")[0];
    const dest = path.join(FONT_DIR, fontName);
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 100) {
      const buf = await fetchBin(abs);
      if (buf) {
        fs.writeFileSync(dest, buf);
        downloaded += 1;
      }
    }
    css = css.replaceAll(abs, `../fonts/${fontName}`);
  }
  fs.writeFileSync(path.join(CSS_DIR, `${family.name}.css`), css);
  console.log("wrote", family.name, "fonts in css:", urls.length);
}

console.log(JSON.stringify({ fontsDownloaded: downloaded }, null, 2));
