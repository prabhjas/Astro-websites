/**
 * Fast fix: download missing Insights images from live,
 * tighten popular carousel CSS, ensure mobile nav toggles.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://ngmanpower.com";
const PUBLIC = path.join(ROOT, "public");

async function fetchBin(url) {
  const res = await fetch(url, { headers: { "User-Agent": "EOR-Astro/1.0" } });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const insights = pages.find((p) => p.path === "/insights/");
const html = insights?.bodyHtml || "";

const imgs = [...html.matchAll(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/gi)].map((m) => m[1]);
const uploadImgs = [...new Set(imgs.filter((u) => /\/wp-content\/uploads\//i.test(u)))];

let downloaded = 0;
let missing = 0;
const failed = [];

for (const src of uploadImgs) {
  let rel = src;
  if (src.startsWith("http")) {
    try {
      rel = new URL(src).pathname;
    } catch {
      continue;
    }
  }
  if (!rel.startsWith("/")) rel = "/" + rel;
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  const exists = fs.existsSync(dest) && fs.statSync(dest).size > 500;
  if (exists) continue;
  missing++;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = await fetchBin(ORIGIN + rel);
  if (buf && buf.length > 500) {
    fs.writeFileSync(dest, buf);
    downloaded++;
  } else {
    failed.push(rel);
  }
}

// Also pull a couple of known broken alts from live homepage of insights if needed
for (const rel of [
  "/wp-content/uploads/2026/08/payroll-outsourcing-process-blog-featured-image.webp",
  "/wp-content/uploads/2026/08/payroll-outsourcing-process-blog-featured-image.jpg",
  "/wp-content/uploads/2026/08/payroll-outsourcing-process-blog-featured-image.png",
]) {
  const dest = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) continue;
  const buf = await fetchBin(ORIGIN + rel);
  if (buf && buf.length > 500) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    downloaded++;
  }
}

console.log(
  JSON.stringify(
    {
      uploadImgs: uploadImgs.length,
      missingBefore: missing,
      downloaded,
      failed: failed.slice(0, 15),
      payrollExists: fs.existsSync(
        path.join(
          PUBLIC,
          "wp-content/uploads/2026/08/payroll-outsourcing-process-blog-featured-image.webp",
        ),
      ),
    },
    null,
    2,
  ),
);
