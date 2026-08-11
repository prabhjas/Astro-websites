#!/usr/bin/env node
/**
 * Fetch missing blog featured images from live RAAD posts and save locally.
 * Updates posts.json featuredImage + seo.ogImage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

const missing = posts.filter(
  (p) => !(p.featuredImage || "").trim() && !(p.seo?.ogImage || "").trim(),
);

function absToLocal(url) {
  if (!url) return null;
  try {
    const u = new URL(url, LIVE);
    if (!u.pathname.startsWith("/wp-content/uploads/")) return null;
    return u.pathname;
  } catch {
    return null;
  }
}

function preferFull(localPath) {
  return localPath.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
}

async function fetchOgImage(postPath) {
  const res = await fetch(`${LIVE}${postPath}`, {
    headers: { "user-agent": "raad-astro-image-sync/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${postPath}`);
  const html = await res.text();
  const candidates = [];
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og?.[1]) candidates.push(og[1]);
  const tw =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw?.[1]) candidates.push(tw[1]);
  // Elementor / content featured image
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+wp-content\/uploads\/[^"']+)["']/gi)].map(
    (m) => m[1],
  );
  for (const src of imgs) {
    if (/gravatar|avatar|logo|icon|favicon|emoji/i.test(src)) continue;
    candidates.push(src);
  }
  for (const c of candidates) {
    const local = absToLocal(c);
    if (local) return preferFull(local);
  }
  return null;
}

async function ensureLocalFile(localPath) {
  const dest = path.join(ROOT, "public", localPath.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
    return { dest, downloaded: false, bytes: fs.statSync(dest).size };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = `${LIVE}${localPath}`;
  const res = await fetch(url, { headers: { "user-agent": "raad-astro-image-sync/1.0" } });
  if (!res.ok) {
    // try with common size suffix if full missing
    throw new Error(`download ${res.status} ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return { dest, downloaded: true, bytes: buf.length };
}

const report = [];
for (const post of missing) {
  const row = { id: post.id, path: post.path };
  try {
    const imgPath = await fetchOgImage(post.path);
    row.image = imgPath;
    if (!imgPath) {
      row.error = "no image found on live";
      report.push(row);
      continue;
    }
    try {
      row.file = await ensureLocalFile(imgPath);
    } catch (e) {
      // try original sized URL from live og if full failed
      row.error = String(e.message || e);
      report.push(row);
      continue;
    }
    post.featuredImage = imgPath;
    if (!post.seo) post.seo = {};
    post.seo.ogImage = imgPath;
    row.ok = true;
  } catch (e) {
    row.error = String(e.message || e);
  }
  report.push(row);
  console.log(JSON.stringify(row));
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
const still = posts.filter(
  (p) => !(p.featuredImage || "").trim() && !(p.seo?.ogImage || "").trim(),
);
console.log(JSON.stringify({ updated: report.filter((r) => r.ok).length, stillMissing: still.map((p) => p.path), report }, null, 2));
