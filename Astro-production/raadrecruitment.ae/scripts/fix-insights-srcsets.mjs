/**
 * Download missing Insights srcset sizes + loop-carousel CSS from live.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const PUBLIC = path.join(ROOT, "public");
const ORIGIN = "";

async function fetchBin(url) {
  const res = await fetch(url, { headers: { "User-Agent": "EOR-Astro/1.0" } });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const html = pages.find((p) => p.path === "/insights/")?.bodyHtml || "";

const urls = new Set();
for (const m of html.matchAll(/(?:src|srcset)=["']([^"']+)["']/gi)) {
  const raw = m[1];
  for (const part of raw.split(",")) {
    const u = part.trim().split(/\s+/)[0];
    if (/\/wp-content\/uploads\//.test(u)) {
      urls.add(u.replace(/^https?:\/\/[^/]+/, ""));
    }
  }
}

let downloaded = 0;
for (const rel of urls) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 400) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = await fetchBin(ORIGIN + rel);
  if (buf && buf.length > 400) {
    fs.writeFileSync(dest, buf);
    downloaded++;
  }
}

// Loop carousel template CSS
for (const id of ["21574", "21423", "21414"]) {
  const rel = `/wp-content/uploads/elementor/css/post-${id}.css`;
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  const buf = await fetchBin(ORIGIN + rel);
  if (buf) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
  }
}

console.log({ uploadUrls: urls.size, downloaded });
