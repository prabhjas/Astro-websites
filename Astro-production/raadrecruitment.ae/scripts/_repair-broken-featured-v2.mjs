#!/usr/bin/env node
/**
 * Repair featured images: remove HTML-as-image files, re-fetch real binaries
 * from WP media / known alternates, else use branded placeholder.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const PLACEHOLDER = "/images/blog-placeholder.svg";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

function isRealImage(buf) {
  if (!buf || buf.length < 32) return false;
  const head = buf.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  if (buf.slice(0, 6).toString() === "GIF87a" || buf.slice(0, 6).toString() === "GIF89a") return true;
  return false;
}

function fileOk(rel) {
  if (!rel || rel.startsWith("/images/")) return true;
  const abs = path.join(ROOT, "public", rel.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return false;
  return isRealImage(fs.readFileSync(abs));
}

async function downloadValidated(relOrUrl) {
  let rel = relOrUrl;
  let url = relOrUrl;
  if (rel.startsWith("http")) {
    url = rel;
    rel = new URL(rel).pathname;
  } else {
    url = LIVE + rel;
  }
  const res = await fetch(url, {
    headers: { "user-agent": "raad-astro-image-repair/2.0", accept: "image/*,*/*" },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isRealImage(buf)) return null;
  const dest = path.join(ROOT, "public", rel.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return { rel, bytes: buf.length, sha: crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10) };
}

async function mediaSearch(q) {
  const url = `${LIVE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=12`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((m) => m.source_url).filter(Boolean);
  } catch {
    return [];
  }
}

function queriesFor(post) {
  const title = post.title || "";
  const slugWords = post.slug.split("-").filter((w) => w.length > 3);
  const qs = [
    title,
    title.replace(/:.*/, "").trim(),
    slugWords.slice(0, 5).join(" "),
    slugWords.slice(0, 3).join(" "),
  ];
  // Manual high-quality alternates for known broken visual-selection posts
  const manual = {
    "/fazaa-card-uae/": ["Fazaa Card", "Fazaa Program", "Purpose and Vision Behind the Fazaa"],
    "/employee-benefits-in-uae/": ["Employee Benefits in the UAE", "Understanding Employee Benefits"],
    "/emergency-leave-in-uae/": ["Emergency Leave", "UAE Emergency Leave", "Leave Emergency"],
    "/common-recruitment-challenges/": ["Recruitment Challenges", "UAE Recruitment Challenges"],
    "/types-of-outsourcing/": ["Types of Outsourcing", "Understanding the Types of Outsourcing"],
    "/benefits-of-emiratisation-in-uae/": ["Why Emiratisation Matters", "Benefits Of Emiratisation"],
    "/average-salary-in-uae/": ["Average Salary in UAE", "UAE Salary Range"],
    "/fazaa-card-uae/": ["Fazaa", "Fazaa Card UAE"],
  };
  const key = post.path.endsWith("/") ? post.path : `${post.path}/`;
  return [...(manual[key] || []), ...qs];
}

function scoreUrl(url, post) {
  const hay = url.toLowerCase();
  let score = 0;
  for (const w of post.slug.split("-")) {
    if (w.length > 3 && hay.includes(w)) score += 2;
  }
  if (/\/2025\/12\/(76234|81367|21531)/.test(hay)) score -= 20;
  if (/emiratisation-deadline-looms|whatsapp|logo|favicon/.test(hay)) score -= 20;
  if (/\.(jpe?g|png|webp)$/i.test(hay)) score += 1;
  return score;
}

// Collect unique broken featured paths
const brokenPosts = posts.filter((p) => !fileOk(p.featuredImage));
console.log("broken posts", brokenPosts.length);

// Delete HTML fake files for broken featured paths
for (const p of brokenPosts) {
  const src = (p.featuredImage || "").trim();
  if (!src || src.startsWith("/images/")) continue;
  const abs = path.join(ROOT, "public", src.replace(/^\//, ""));
  if (fs.existsSync(abs) && !isRealImage(fs.readFileSync(abs))) {
    fs.unlinkSync(abs);
  }
}

const report = [];
for (const post of brokenPosts) {
  const pathKey = post.path.endsWith("/") ? post.path : `${post.path}/`;
  let chosen = null;
  let via = null;

  const candidates = [];
  for (const q of queriesFor(post)) {
    const hits = await mediaSearch(q);
    candidates.push(...hits);
  }
  const uniq = [...new Set(candidates)];
  const ranked = uniq
    .map((u) => ({ u, score: scoreUrl(u, post) }))
    .sort((a, b) => b.score - a.score);

  for (const { u, score } of ranked) {
    if (score < 2) continue;
    const saved = await downloadValidated(u);
    if (saved) {
      chosen = saved.rel;
      via = `media:${score}`;
      break;
    }
  }

  // If still nothing, try looser media hits
  if (!chosen) {
    for (const { u } of ranked) {
      const saved = await downloadValidated(u);
      if (saved) {
        chosen = saved.rel;
        via = "media-loose";
        break;
      }
    }
  }

  if (!chosen) {
    chosen = PLACEHOLDER;
    via = "placeholder";
  }

  post.featuredImage = chosen;
  if (!post.seo) post.seo = {};
  post.seo.ogImage = chosen;
  report.push({ path: pathKey, chosen, via });
  console.log(JSON.stringify(report[report.length - 1]));
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");

// Final audit
let ok = 0;
const bad = [];
for (const p of posts) {
  if (fileOk(p.featuredImage)) ok++;
  else bad.push({ path: p.path, src: p.featuredImage });
}
console.log(JSON.stringify({ ok, badCount: bad.length, bad, placeholders: posts.filter((p) => (p.featuredImage || "").includes("placeholder")).length }, null, 2));
