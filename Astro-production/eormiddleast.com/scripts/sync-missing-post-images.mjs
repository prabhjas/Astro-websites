#!/usr/bin/env node
/**
 * Download missing post featured/og/body upload images from the live origin.
 * Usage: node scripts/sync-missing-post-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const postsPath = path.join(root, "src/data/posts.json");
const publicDir = path.join(root, "public");

const siteJson = JSON.parse(fs.readFileSync(path.join(root, "src/data/site.json"), "utf8"));
const ORIGIN = String(siteJson.url || siteJson.siteUrl || process.env.ORIGIN || "")
  .replace(/\/$/, "");
if (!ORIGIN.startsWith("http")) {
  console.error("Set site.json url or ORIGIN");
  process.exit(1);
}

const CONCURRENCY = 8;

function toLocalPath(urlOrPath) {
  const u = String(urlOrPath || "");
  const m = u.match(/\/wp-content\/uploads\/[^?#]+/i);
  return m ? decodeURIComponent(m[0].split(/\s+/)[0].replace(/,\d+w$/, "")) : "";
}

function collectUploadPaths(html) {
  const out = new Set();
  const re = /(?:src|srcset|content|href)=["']([^"']*\/wp-content\/uploads\/[^"'\s]+)/gi;
  let m;
  while ((m = re.exec(html || ""))) {
    const local = toLocalPath(m[1].split(/\s+/)[0]);
    if (local) out.add(local);
  }
  const srcset = /srcset=["']([^"']+)["']/gi;
  while ((m = srcset.exec(html || ""))) {
    for (const chunk of m[1].split(",")) {
      const local = toLocalPath(chunk.trim().split(/\s+/)[0]);
      if (local) out.add(local);
    }
  }
  return [...out];
}

async function download(relPath) {
  const local = path.join(publicDir, relPath.replace(/^\//, ""));
  if (fs.existsSync(local) && fs.statSync(local).size > 50) {
    return { ok: true, skipped: true };
  }
  fs.mkdirSync(path.dirname(local), { recursive: true });
  const url = `${ORIGIN}${relPath.startsWith("/") ? relPath : `/${relPath}`}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ConnectGroup-Astro-image-sync/1.0" },
    redirect: "follow",
  });
  if (!res.ok) return { ok: false, status: res.status, url };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50) return { ok: false, status: "tiny", url };
  fs.writeFileSync(local, buf);
  return { ok: true, bytes: buf.length, url };
}

async function mapPool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
  const toFetch = new Set();
  let missingFeatured = 0;

  for (const post of posts) {
    for (const cand of [post.featuredImage, post.seo?.ogImage]) {
      const local = toLocalPath(cand) || (cand?.startsWith("/wp-content/") ? cand.split("?")[0] : "");
      if (!local) continue;
      toFetch.add(local);
      const disk = path.join(publicDir, local.replace(/^\//, ""));
      if (!(fs.existsSync(disk) && fs.statSync(disk).size > 50)) missingFeatured += 1;
    }
    for (const p of collectUploadPaths(post.bodyHtml || post.content || "")) {
      toFetch.add(p);
    }
  }

  const list = [...toFetch].filter(Boolean);
  console.log(`origin=${ORIGIN} posts=${posts.length} uniqueUploadRefs=${list.length}`);

  let ok = 0;
  let skipped = 0;
  let fail = 0;
  const failures = [];

  await mapPool(list, CONCURRENCY, async (rel) => {
    const r = await download(rel);
    if (r.ok && r.skipped) skipped += 1;
    else if (r.ok) {
      ok += 1;
      if (ok <= 40 || ok % 25 === 0) console.log("got", rel, r.bytes);
    } else {
      fail += 1;
      if (failures.length < 40) failures.push(`${rel} ${r.status}`);
    }
  });

  console.log({ downloaded: ok, alreadyPresent: skipped, failed: fail, featuredGapsSeen: missingFeatured });
  if (failures.length) {
    console.log("sample failures:");
    for (const f of failures) console.log(" ", f);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
