#!/usr/bin/env node
/**
 * Pre-deploy HTTP verification: crawl every page on the local fleet preview,
 * extract image/CSS/font asset URLs, and confirm each responds with real media
 * (not HTML soft-404). Catches the Connect FZ failure mode where disk/file
 * checks looked fine but the served page still referenced broken assets.
 *
 * Usage:
 *   node scripts/verify-pages-assets.mjs
 *   BASE_URL=http://127.0.0.1:5099 node scripts/verify-pages-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5099").replace(/\/$/, "");
const pages = JSON.parse(fs.readFileSync(path.join(root, "src/data/pages.json"), "utf8"));

function magicOk(buf, pathname) {
  if (!buf || buf.length < 12) return false;
  const head = buf.subarray(0, 64).toString("utf8");
  if (/^\s*<(!DOCTYPE|html|head|body|script)\b/i.test(head)) return false;
  const ext = path.extname(pathname).toLowerCase();
  if ([".css", ".js", ".mjs", ".json", ".svg", ".map"].includes(ext)) {
    return !/^\s*<(!DOCTYPE|html)\b/i.test(head);
  }
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  const isWebp =
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.length >= 12 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;
  if (/\.(jpe?g|png|gif|webp|avif|ico)$/i.test(ext)) {
    const isIco =
      buf[0] === 0x00 && buf[1] === 0x00 && (buf[2] === 0x01 || buf[2] === 0x02) && buf[3] === 0x00;
    return isJpeg || isPng || isGif || isWebp || isIco;
  }
  if (/\.(woff2?|ttf|otf|eot)$/i.test(ext)) return buf.length > 40 && buf[0] !== 0x3c;
  return buf[0] !== 0x3c;
}

function extractAssets(html) {
  const urls = new Set();
  const add = (raw) => {
    if (!raw) return;
    let u = raw.trim().replace(/^['"]|['"]$/g, "");
    if (!u || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("#")) return;
    if (u.startsWith("//")) u = "https:" + u;
    try {
      if (/^https?:\/\//i.test(u)) {
        const parsed = new URL(u);
        // Only verify same-host / local wp-content assets (skip analytics CDNs)
        if (
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "localhost" ||
          parsed.hostname.includes("mbs-consultancy") ||
          parsed.pathname.startsWith("/wp-content/") ||
          parsed.pathname.startsWith("/wp-includes/") ||
          parsed.pathname.startsWith("/css/")
        ) {
          urls.add(parsed.pathname.split("?")[0]);
        }
        return;
      }
      if (u.startsWith("/")) urls.add(u.split("?")[0].split("#")[0]);
    } catch {
      /* ignore */
    }
  };

  for (const m of html.matchAll(
    /(?:src|href|poster|data-src|data-lazy-src|data-bg|data-background|data-large_image|content)=["']([^"']+)["']/gi,
  )) {
    add(m[1]);
  }
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const chunk of m[1].split(",")) add(chunk.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi)) {
    add(m[2]);
  }
  return [...urls].filter((u) =>
    /\.(css|js|mjs|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico|mp4|webm|pdf)$/i.test(u) ||
    u.includes("/uploads/"),
  );
}

const pagePaths = pages
  .map((p) => p.path || p.link || `/${p.slug}/`)
  .filter(Boolean)
  .map((p) => (p.endsWith("/") || p.includes(".") ? p : `${p}/`));

// Always include home
if (!pagePaths.includes("/")) pagePaths.unshift("/");

const assetCache = new Map(); // pathname -> { ok, status, ct, reason }
const pageFailures = [];
let pagesOk = 0;

async function checkAsset(pathname) {
  if (assetCache.has(pathname)) return assetCache.get(pathname);
  const url = BASE + pathname;
  try {
    const res = await fetch(url, { redirect: "follow" });
    const ct = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok) {
      const r = { ok: false, status: res.status, ct, reason: "http" };
      assetCache.set(pathname, r);
      return r;
    }
    if (/text\/html/i.test(ct) && !/\.(html?|svg)$/i.test(pathname)) {
      const r = { ok: false, status: res.status, ct, reason: "content-type-html" };
      assetCache.set(pathname, r);
      return r;
    }
    if (!magicOk(buf, pathname)) {
      const r = { ok: false, status: res.status, ct, reason: "bad-magic", bytes: buf.length };
      assetCache.set(pathname, r);
      return r;
    }
    const r = { ok: true, status: res.status, ct, bytes: buf.length };
    assetCache.set(pathname, r);
    return r;
  } catch (e) {
    const r = { ok: false, status: 0, ct: "", reason: String(e.message || e) };
    assetCache.set(pathname, r);
    return r;
  }
}

console.log(`Verifying ${pagePaths.length} pages against ${BASE}`);

for (const pagePath of pagePaths) {
  process.stdout.write(`\rpage ${pagePath}`.padEnd(80));
  let html;
  try {
    const res = await fetch(BASE + pagePath, {
      headers: { Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) {
      pageFailures.push({ page: pagePath, error: `page HTTP ${res.status}` });
      continue;
    }
    html = await res.text();
  } catch (e) {
    pageFailures.push({ page: pagePath, error: String(e.message || e) });
    continue;
  }

  const assets = extractAssets(html);
  const broken = [];
  for (const a of assets) {
    const r = await checkAsset(a);
    if (!r.ok) broken.push({ asset: a, ...r });
  }
  if (broken.length) {
    pageFailures.push({ page: pagePath, brokenCount: broken.length, broken: broken.slice(0, 15) });
  } else {
    pagesOk++;
  }
}
process.stdout.write("\n");

const brokenAssets = [...assetCache.entries()]
  .filter(([, v]) => !v.ok)
  .map(([k, v]) => ({ asset: k, ...v }));

const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  pagesChecked: pagePaths.length,
  pagesOk,
  pagesFailed: pageFailures.length,
  assetsChecked: assetCache.size,
  assetsBroken: brokenAssets.length,
  pageFailures,
  brokenAssets: brokenAssets.slice(0, 100),
};

const out = path.join(root, ".data/page-asset-verify-report.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  pagesChecked: report.pagesChecked,
  pagesOk: report.pagesOk,
  pagesFailed: report.pagesFailed,
  assetsChecked: report.assetsChecked,
  assetsBroken: report.assetsBroken,
  sampleBroken: brokenAssets.slice(0, 20),
  report: out,
}, null, 2));

if (pageFailures.length || brokenAssets.length) {
  console.error("\nPAGE ASSET VERIFY FAILED");
  process.exit(1);
}
console.log("\nPAGE ASSET VERIFY OK");
