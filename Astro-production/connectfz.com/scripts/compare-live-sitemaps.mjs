/**
 * Compare local content + local SSR responses against live Rank Math sitemap URLs.
 * Usage (site running on :5096):
 *   node scripts/compare-live-sitemaps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src", "data");
const LOCAL = process.env.LOCAL_ORIGIN || "http://127.0.0.1:5096";
const SAMPLE = Number(process.env.PARITY_SAMPLE || 0); // 0 = all

function normalizePath(p) {
  if (!p || p === "/") return "/";
  let out = p.startsWith("/") ? p : `/${p}`;
  if (!out.endsWith("/")) out += "/";
  return out;
}

const sitemap = JSON.parse(fs.readFileSync(path.join(DATA, "sitemap-urls.json"), "utf8"));
const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const posts = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));
const content = new Set([
  ...pages.map((p) => normalizePath(p.path)),
  ...posts.map((p) => normalizePath(p.path)),
]);

const groups = ["pages", "posts", "guides", "country", "eor"];
const report = { missingContent: [], httpFails: [], ok: 0, checked: 0 };

for (const g of groups) {
  let rows = sitemap[g] || [];
  if (SAMPLE > 0) rows = rows.slice(0, SAMPLE);
  for (const row of rows) {
    const p = normalizePath(row.path);
    if (!content.has(p)) report.missingContent.push({ group: g, path: p });
    report.checked += 1;
    try {
      const res = await fetch(`${LOCAL}${p}`, { redirect: "manual" });
      if (res.status !== 200) {
        report.httpFails.push({ group: g, path: p, status: res.status });
      } else {
        report.ok += 1;
      }
    } catch (e) {
      report.httpFails.push({ group: g, path: p, status: 0, error: String(e.message || e) });
    }
  }
}

const out = path.join(ROOT, "_crawl", "live-parity-report.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log({
  checked: report.checked,
  ok: report.ok,
  missingContent: report.missingContent.length,
  httpFails: report.httpFails.length,
  report: out,
});
if (report.missingContent.length || report.httpFails.length) process.exit(1);
