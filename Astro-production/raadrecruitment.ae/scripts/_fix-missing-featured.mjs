#!/usr/bin/env node
/**
 * Repair featured images properly:
 * 1) live og:image (prefer full-size path)
 * 2) download validated from live
 * 3) keyword match to unique local catalog
 * 4) placeholder
 *
 * Never keep shared junk assets (avatars, logos, promo 76234.jpg, etc.).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const PLACEHOLDER = "/images/blog-placeholder.svg";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

const BLACKLIST_RE =
  /logo|favicon|whatsapp|button|icon|android-icon|apple-touch|cropped-|deadline-looms|\/76234\.|\/81367\.|\/21531\.|1948c721253c374176e07cb97d9a202f660ff32f7b275c0691fcbda9cf221629/i;

function isRealImage(buf) {
  if (!buf || buf.length < 32) return false;
  const head = buf.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  return false;
}

function absPublic(rel) {
  return path.join(ROOT, "public", String(rel || "").replace(/^\//, ""));
}

function toLocalRel(urlOrPath) {
  if (!urlOrPath) return null;
  let s = String(urlOrPath).trim();
  if (s.startsWith("https://raadrecruitment.ae")) s = s.slice("https://raadrecruitment.ae".length);
  if (s.startsWith("http://raadrecruitment.ae")) s = s.slice("http://raadrecruitment.ae".length);
  if (s.startsWith("//")) {
    try {
      s = new URL("https:" + s).pathname;
    } catch {
      return null;
    }
  }
  if (!s.startsWith("/")) s = "/" + s;
  s = s.split("?")[0];
  if (!s.includes("/wp-content/uploads/") && !s.startsWith("/images/")) return null;
  return s;
}

function stripSizeSuffix(rel) {
  return String(rel).replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))$/i, "$1");
}

function isJunkPath(rel) {
  const s = String(rel || "");
  if (!s) return true;
  if (s.includes("placeholder")) return false;
  if (BLACKLIST_RE.test(s)) return true;
  const sized = s.match(/-(\d{2,4})x(\d{2,4})\./);
  if (sized && (Number(sized[1]) < 240 || Number(sized[2]) < 240)) return true;
  return false;
}

function fileOk(rel) {
  if (!rel) return false;
  if (rel.includes("placeholder")) return fs.existsSync(absPublic(rel));
  if (isJunkPath(rel)) return false;
  const abs = absPublic(rel);
  if (!fs.existsSync(abs)) return false;
  const buf = fs.readFileSync(abs);
  return isRealImage(buf) && buf.length >= 12000;
}

async function downloadValidated(relOrUrl) {
  let rel = toLocalRel(relOrUrl);
  let url;
  if (String(relOrUrl).startsWith("http")) {
    url = String(relOrUrl).split("?")[0];
    rel = toLocalRel(url);
  } else {
    rel = toLocalRel(relOrUrl);
    if (!rel) return null;
    url = LIVE + rel;
  }
  if (!rel) return null;
  // Prefer full-size file name on disk
  const fullRel = stripSizeSuffix(rel);
  const tryRels = fullRel === rel ? [rel] : [fullRel, rel];

  for (const candidate of tryRels) {
    if (BLACKLIST_RE.test(candidate)) continue;
    try {
      const res = await fetch(LIVE + candidate, {
        headers: { "user-agent": "raad-astro-fix-featured/5.0", accept: "image/*,*/*" },
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isRealImage(buf) || buf.length < 8000) continue;
      // accept even sized thumbs if full missing, as long as real image
      if (isJunkPath(candidate) && buf.length < 20000) continue;
      const dest = absPublic(candidate);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

async function scrapeLiveOg(postPath) {
  try {
    const res = await fetch(LIVE + postPath, {
      headers: { "user-agent": "raad-astro-fix-featured/5.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image/i);
    return m?.[1] ? toLocalRel(m[1]) : null;
  } catch {
    return null;
  }
}

async function mediaSearch(q) {
  const url = `${LIVE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=8`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "raad-astro-fix-featured/5.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((x) => x.source_url).filter(Boolean);
  } catch {
    return [];
  }
}

const catalog = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (/\.(jpe?g|png|webp)$/i.test(ent.name)) {
      const rel = "/" + path.relative(path.join(ROOT, "public"), full).replace(/\\/g, "/");
      if (isJunkPath(rel) || BLACKLIST_RE.test(rel)) continue;
      const buf = fs.readFileSync(full);
      if (!isRealImage(buf) || buf.length < 20000) continue;
      catalog.push({ rel, name: ent.name.toLowerCase(), bytes: buf.length });
    }
  }
}
walk(path.join(ROOT, "public", "wp-content", "uploads"));

const stop = new Set([
  "raad", "uae", "dubai", "with", "from", "that", "this", "your", "into", "what", "know",
  "guide", "complete", "detailed", "should", "about", "must", "need", "2024", "2025", "2026",
  "the", "and", "for", "key", "top", "post", "blog", "how", "why", "visual", "selection",
]);

function tokens(post) {
  return `${post.slug} ${post.title}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

function bestLocal(post, used) {
  const toks = tokens(post);
  let best = null;
  let bestScore = 0;
  for (const img of catalog) {
    if (used.has(img.rel)) continue;
    let score = 0;
    for (const t of toks) if (img.name.includes(t) || img.rel.toLowerCase().includes(t)) score += 2;
    if (img.bytes > 40000) score += 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  if (best && bestScore >= 4) return best.rel;
  return null;
}

function assign(post, rel, status) {
  post.featuredImage = rel;
  if (!post.seo) post.seo = {};
  post.seo.ogImage = rel;
  return { status, rel };
}

async function fixPost(post, used) {
  // Re-fix if missing, junk, or previously poisoned assignment
  if (fileOk(post.featuredImage) && !BLACKLIST_RE.test(post.featuredImage || "")) {
    used.add(post.featuredImage);
    return { status: "ok", rel: post.featuredImage };
  }

  // 1) Live OG first
  const og = await scrapeLiveOg(post.path);
  if (og) {
    const got = await downloadValidated(og);
    if (got) {
      used.add(got);
      return assign(post, got, "og");
    }
  }

  // 2) Try existing featured / og paths (may be full-size offline)
  for (const cand of [post.featuredImage, post.seo?.ogImage]) {
    const rel = toLocalRel(cand);
    if (!rel || BLACKLIST_RE.test(rel)) continue;
    if (fileOk(stripSizeSuffix(rel))) {
      const r = stripSizeSuffix(rel);
      used.add(r);
      return assign(post, r, "local");
    }
    const got = await downloadValidated(rel);
    if (got) {
      used.add(got);
      return assign(post, got, "downloaded");
    }
  }

  // 3) WP media search
  const qs = [
    post.title,
    post.title?.replace(/:.*/, "").trim(),
    post.slug.split("-").slice(0, 4).join(" "),
  ].filter(Boolean);
  for (const q of qs) {
    for (const u of (await mediaSearch(q)).slice(0, 5)) {
      if (BLACKLIST_RE.test(u)) continue;
      const got = await downloadValidated(u);
      if (got) {
        used.add(got);
        return assign(post, got, "media");
      }
    }
  }

  // 4) Keyword local
  const local = bestLocal(post, used);
  if (local) {
    used.add(local);
    return assign(post, local, "mapped");
  }

  return assign(post, PLACEHOLDER, "placeholder");
}

const used = new Set();
const stats = {};
let i = 0;
console.log("catalog", catalog.length);

for (const post of posts) {
  i++;
  const r = await fixPost(post, used);
  stats[r.status] = (stats[r.status] || 0) + 1;
  if (r.status !== "ok") console.log(`[${i}/${posts.length}]`, r.status, post.path, "->", r.rel);
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");

let broken = 0;
for (const p of posts) {
  if (!fileOk(p.featuredImage) && !(p.featuredImage || "").includes("placeholder")) {
    broken++;
    console.log("STILL_BAD", p.path, p.featuredImage);
  }
}
const placeholders = posts.filter((p) => (p.featuredImage || "").includes("placeholder")).length;
const uniq = new Set(posts.map((p) => p.featuredImage)).size;
console.log({
  stats,
  broken,
  placeholders,
  uniqueImages: uniq,
  total: posts.length,
  sample: {
    fazaa: posts.find((p) => p.path === "/fazaa-card-uae/")?.featuredImage,
    benefits: posts.find((p) => p.path === "/employee-benefits-in-uae/")?.featuredImage,
  },
});
