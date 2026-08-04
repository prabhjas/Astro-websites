/**
 * Compare local content + local SSR responses against Rank Math sitemap URLs.
 * Prefers src/data/sitemap-urls.json; falls back to uploaded XML dumps.
 *
 * Usage (site running on :5092):
 *   node scripts/compare-live-sitemaps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src", "data");
const LOCAL = process.env.LOCAL_ORIGIN || "http://127.0.0.1:5092";
const SAMPLE = Number(process.env.PARITY_SAMPLE || 0); // 0 = all
const CONTENT_ONLY = process.env.CONTENT_ONLY === "1";

function normalizePath(p) {
  if (!p || p === "/") return "/";
  let out = p.startsWith("/") ? p : `/${p}`;
  if (!out.endsWith("/")) out += "/";
  return out;
}

function parseUrlset(xml) {
  const entries = [];
  const blocks = xml.split(/<url>/i).slice(1);
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    let p = "/";
    try {
      p = new URL(loc).pathname || "/";
    } catch {
      continue;
    }
    entries.push(normalizePath(p));
  }
  return entries;
}

let pages = [];
let posts = [];
const sitemapFile = path.join(DATA, "sitemap-urls.json");
if (fs.existsSync(sitemapFile)) {
  const sitemap = JSON.parse(fs.readFileSync(sitemapFile, "utf8"));
  pages = (sitemap.pages || []).map((r) => normalizePath(r.path));
  posts = (sitemap.posts || []).map((r) => normalizePath(r.path));
}
if (!pages.length || !posts.length) {
  const dumpDir = path.join(ROOT, "_crawl", "sitemaps");
  if (!pages.length && fs.existsSync(path.join(dumpDir, "page-sitemap.xml"))) {
    pages = parseUrlset(fs.readFileSync(path.join(dumpDir, "page-sitemap.xml"), "utf8"));
  }
  if (!posts.length && fs.existsSync(path.join(dumpDir, "post-sitemap.xml"))) {
    posts = parseUrlset(fs.readFileSync(path.join(dumpDir, "post-sitemap.xml"), "utf8"));
  }
}

const pagesData = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const postsData = JSON.parse(fs.readFileSync(path.join(DATA, "posts.json"), "utf8"));
const content = new Set([
  ...pagesData.map((p) => normalizePath(p.path)),
  ...postsData.map((p) => normalizePath(p.path)),
]);

const report = { missingContent: [], httpFails: [], ok: 0, checked: 0, pages: pages.length, posts: posts.length };

async function checkGroup(group, rows) {
  let list = rows;
  if (SAMPLE > 0) list = list.slice(0, SAMPLE);
  for (const p of list) {
    if (!content.has(p)) report.missingContent.push({ group, path: p });
    report.checked += 1;
    if (CONTENT_ONLY) continue;
    try {
      const res = await fetch(`${LOCAL}${p}`, { redirect: "manual" });
      if (res.status !== 200) {
        report.httpFails.push({ group, path: p, status: res.status });
      } else {
        report.ok += 1;
      }
    } catch (e) {
      report.httpFails.push({ group, path: p, status: 0, error: String(e.message || e) });
    }
  }
}

await checkGroup("pages", pages);
await checkGroup("posts", posts);

const out = path.join(ROOT, "_crawl", "live-parity-report.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log({
  pages: report.pages,
  posts: report.posts,
  checked: report.checked,
  ok: report.ok,
  missingContent: report.missingContent.length,
  httpFails: report.httpFails.length,
  report: out,
});
if (report.missingContent.length || (!CONTENT_ONLY && report.httpFails.length)) process.exit(1);
