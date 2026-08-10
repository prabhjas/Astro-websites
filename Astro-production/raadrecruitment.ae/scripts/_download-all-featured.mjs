#!/usr/bin/env node
/**
 * 1) Resolve remaining placeholder posts via targeted WP media queries
 * 2) Download any featuredImage path that is missing locally (prefer full-size)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
const PLACEHOLDER = "/images/blog-placeholder.svg";

const EXTRA_QUERIES = {
  "/salary-certificate-uae/": ["salary certificate UAE", "salary certificate"],
  "/medical-certificate-for-sick-leave-in-uae/": [
    "medical certificate sick leave",
    "sick leave medical certificate UAE",
  ],
  "/role-of-emiratisation-in-uae/": [
    "Role of Emiratisation",
    "Emiratisation importance benefits",
  ],
  "/limited-contract-resignation-in-uae/": [
    "limited contract resignation",
    "resignation limited contract UAE",
  ],
};

function preferFull(p) {
  return p.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
}

function toLocal(url) {
  if (!url) return null;
  try {
    const u = new URL(url, LIVE);
    if (!u.pathname.startsWith("/wp-content/uploads/")) return null;
    if (/logo|favicon|icon|whatsapp|avatar|gravatar|cropped-favicon|emiratisation-deadline-looms/i.test(u.pathname))
      return null;
    return preferFull(u.pathname);
  } catch {
    return null;
  }
}

async function mediaSearch(q) {
  const url = `${LIVE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=15`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((m) => ({ title: m.title?.rendered, src: toLocal(m.source_url), raw: m.source_url })).filter((x) => x.src);
}

async function download(localPath) {
  const dest = path.join(ROOT, "public", localPath.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) return { ok: true, bytes: fs.statSync(dest).size, downloaded: false, path: localPath };

  const candidates = [localPath];
  // also try common resized if full fails later
  const m = localPath.match(/^(.*)(\.(webp|jpe?g|png|gif))$/i);
  if (m) {
    candidates.push(`${m[1]}-1024x576${m[2]}`, `${m[1]}-768x432${m[2]}`, `${m[1]}-1536x864${m[2]}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (const cand of candidates) {
    const res = await fetch(`${LIVE}${cand}`);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) continue;
    const out = path.join(ROOT, "public", cand.replace(/^\//, ""));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    return { ok: true, bytes: buf.length, downloaded: true, path: cand };
  }
  return { ok: false, path: localPath };
}

// --- resolve placeholders ---
const placeholderPosts = posts.filter((p) => (p.featuredImage || "").includes("blog-placeholder") || !(p.featuredImage || "").trim());
console.log("placeholder count", placeholderPosts.length);
for (const post of placeholderPosts) {
  const key = post.path.endsWith("/") ? post.path : `${post.path}/`;
  const queries = EXTRA_QUERIES[key] || [post.title, post.slug.replace(/-/g, " ")];
  let chosen = null;
  for (const q of queries) {
    const hits = await mediaSearch(q);
    // prefer filename/title overlap with slug tokens
    const tokens = post.slug.split("-").filter((t) => t.length > 3);
    const ranked = hits
      .map((h) => {
        const hay = `${h.title || ""} ${h.src}`.toLowerCase();
        let score = 0;
        for (const t of tokens) if (hay.includes(t)) score++;
        return { ...h, score };
      })
      .sort((a, b) => b.score - a.score);
    if (ranked[0]?.score >= 2) {
      chosen = ranked[0].src;
      console.log(JSON.stringify({ path: key, q, chosen, score: ranked[0].score, title: ranked[0].title }));
      break;
    }
  }
  if (chosen) {
    const file = await download(chosen);
    if (file.ok) {
      post.featuredImage = file.path;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = file.path;
    }
  }
}

// --- download all missing local featured files ---
let downloaded = 0;
let failed = [];
let already = 0;
for (const post of posts) {
  let src = (post.featuredImage || post.seo?.ogImage || "").trim();
  if (!src || src.includes("blog-placeholder")) continue;
  if (/^https?:\/\//i.test(src)) {
    const local = toLocal(src);
    if (local) {
      src = local;
      post.featuredImage = local;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = local;
    } else continue;
  }
  // Prefer full size in data if currently a derivative
  const full = preferFull(src);
  const tryPath = full;
  const dest = path.join(ROOT, "public", tryPath.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) {
    if (post.featuredImage !== tryPath) {
      post.featuredImage = tryPath;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = tryPath;
    }
    already++;
    continue;
  }
  const file = await download(tryPath);
  if (file.ok) {
    post.featuredImage = file.path;
    if (!post.seo) post.seo = {};
    post.seo.ogImage = file.path;
    if (file.downloaded) downloaded++;
    else already++;
  } else {
    // try original sized path as stored
    const file2 = await download(src);
    if (file2.ok) {
      post.featuredImage = file2.path;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = file2.path;
      downloaded++;
    } else {
      failed.push({ path: post.path, src });
    }
  }
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
const stillPh = posts.filter((p) => (p.featuredImage || "").includes("blog-placeholder") || !(p.featuredImage || "").trim());
console.log(JSON.stringify({ downloaded, already, failed: failed.length, failedSample: failed.slice(0, 15), stillPlaceholder: stillPh.map((p) => p.path) }, null, 2));
