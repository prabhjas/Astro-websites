#!/usr/bin/env node
/**
 * Resolve unique featured images for posts that lack WP featured_media.
 * Priority:
 *  1) Unique in-article image (excluding sitewide/sidebar assets)
 *  2) WP REST media search by slug/title keywords
 *  3) Local uploads filename keyword match
 *  4) Keep branded placeholder (do NOT invent wrong shared promo art)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
const PLACEHOLDER = "/images/blog-placeholder.svg";

const TARGET = [
  "/differences-between-recruitment-and-selection-process/",
  "/benefits-of-medical-recruitment-agencies-in-dubai/",
  "/emiratisation-in-tourism-and-hospitality/",
  "/salary-certificate-uae/",
  "/medical-certificate-for-sick-leave-in-uae/",
  "/benefits-of-outsourcing-digital-marketing/",
  "/role-of-emiratisation-in-uae/",
  "/tips-for-hiring-the-right-talent/",
  "/types-of-leaves-in-uae/",
  "/limited-contract-resignation-in-uae/",
  "/outsourcing-for-startup/",
];

const SITEWIDE =
  /logo|favicon|icon|emoji|whatsapp|avatar|gravatar|cropped-binju|cropped-photo|cropped-tz|cropped-favicon|emiratisation-deadline-looms|76234|81367|21531|n2-ss|sprite|button\.png|placeholder|footer|bkg/i;

function preferFull(p) {
  return p.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
}

function toLocal(urlOrPath) {
  if (!urlOrPath) return null;
  let p = String(urlOrPath).trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    return null;
  }
  if (!p.startsWith("/wp-content/uploads/")) return null;
  if (SITEWIDE.test(p)) return null;
  return preferFull(p);
}

function keywordsFromPost(post) {
  const raw = `${post.slug} ${post.title}`.toLowerCase();
  return [...new Set(raw.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !["raad", "uae", "with", "from", "that", "this", "your", "into", "what", "know", "guide", "complete", "detailed", "should", "about"].includes(w)))];
}

function extractImgs(html) {
  const out = [];
  if (!html) return out;
  for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const local = toLocal(m[1]);
    if (local && !out.includes(local)) out.push(local);
  }
  return out;
}

function scoreLocal(img, keys) {
  const name = img.toLowerCase();
  let score = 0;
  for (const k of keys) if (name.includes(k)) score += 3;
  if (/\.webp$/i.test(img)) score += 0.5;
  return score;
}

async function searchWpMedia(keys) {
  const q = keys.slice(0, 4).join(" ");
  if (!q) return [];
  const url = `${LIVE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .map((m) => toLocal(m.source_url))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function searchLocalUploads(keys) {
  const uploadsRoot = path.join(ROOT, "public", "wp-content", "uploads");
  if (!fs.existsSync(uploadsRoot)) return [];
  const hits = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(webp|jpe?g|png|gif)$/i.test(ent.name)) {
        const rel = "/" + path.relative(path.join(ROOT, "public"), full).replace(/\\/g, "/");
        if (SITEWIDE.test(rel)) continue;
        const score = scoreLocal(rel, keys);
        if (score >= 6) hits.push({ rel: preferFull(rel), score });
      }
    }
  };
  walk(uploadsRoot);
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 5).map((h) => h.rel);
}

async function ensureLocal(localPath) {
  const dest = path.join(ROOT, "public", localPath.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1500) {
    return { path: localPath, bytes: fs.statSync(dest).size, downloaded: false };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(`${LIVE}${localPath}`);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1500) throw new Error(`tiny ${buf.length}`);
  fs.writeFileSync(dest, buf);
  return { path: localPath, bytes: buf.length, downloaded: true };
}

const report = [];
for (const pathKey of TARGET) {
  const post = posts.find((p) => (p.path.endsWith("/") ? p.path : `${p.path}/`) === pathKey);
  if (!post) continue;
  const keys = keywordsFromPost(post);
  const contentImgs = extractImgs(post.content || post.bodyHtml || "").filter((i) => !SITEWIDE.test(i));
  // Rank content images by keyword overlap with slug/title
  const rankedContent = contentImgs
    .map((img) => ({ img, score: scoreLocal(img, keys) }))
    .sort((a, b) => b.score - a.score);

  let chosen = rankedContent.find((r) => r.score >= 3)?.img || null;
  let source = chosen ? "content-keyword" : null;

  if (!chosen && rankedContent[0] && !SITEWIDE.test(rankedContent[0].img)) {
    // unique content image without keyword match still OK if only one strong editorial file
    const uniqueish = rankedContent.filter((r) => !/\/2025\/12\//.test(r.img));
    if (uniqueish.length === 1) {
      chosen = uniqueish[0].img;
      source = "content-sole";
    } else if (rankedContent[0].score > 0) {
      chosen = rankedContent[0].img;
      source = "content-best";
    }
  }

  if (!chosen) {
    const media = await searchWpMedia(keys);
    const mediaRanked = media.map((img) => ({ img, score: scoreLocal(img, keys) })).sort((a, b) => b.score - a.score);
    if (mediaRanked[0]?.score >= 3) {
      chosen = mediaRanked[0].img;
      source = "wp-media-search";
    }
  }

  if (!chosen) {
    const localHits = searchLocalUploads(keys);
    if (localHits[0]) {
      chosen = localHits[0];
      source = "local-uploads-search";
    }
  }

  const row = { path: pathKey, keys: keys.slice(0, 8), contentImgs: contentImgs.slice(0, 6), chosen, source };
  if (!chosen) {
    post.featuredImage = PLACEHOLDER;
    if (!post.seo) post.seo = {};
    post.seo.ogImage = PLACEHOLDER;
    row.chosen = PLACEHOLDER;
    row.source = "placeholder-fallback";
    row.ok = true;
  } else {
    try {
      row.file = await ensureLocal(chosen);
      post.featuredImage = chosen;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = chosen;
      row.ok = true;
    } catch (e) {
      post.featuredImage = PLACEHOLDER;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = PLACEHOLDER;
      row.error = String(e.message || e);
      row.chosen = PLACEHOLDER;
      row.source = "placeholder-after-error";
      row.ok = true;
    }
  }
  report.push(row);
  console.log(JSON.stringify(row));
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
console.log(JSON.stringify({ mappings: report.map((r) => ({ path: r.path, image: r.chosen, source: r.source })) }, null, 2));
