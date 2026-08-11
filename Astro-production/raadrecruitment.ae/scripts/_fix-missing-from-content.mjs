#!/usr/bin/env node
/**
 * For posts with no WP featured media, pick the first real in-article image
 * from the post body (local content HTML / live article), download locally,
 * and set featuredImage + seo.ogImage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

const TARGET = new Set([
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
]);

const SKIP_RE =
  /logo|favicon|icon|emoji|whatsapp|avatar|gravatar|cropped-binju|cropped-photo|cropped-tz|cropped-favicon|81287|n2-ss|smartslider|sprite|button\.png|placeholder/i;

function preferFull(p) {
  return p.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
}

function toLocalPath(urlOrPath) {
  if (!urlOrPath) return null;
  let p = urlOrPath.trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    return null;
  }
  if (!p.startsWith("/wp-content/uploads/")) return null;
  if (SKIP_RE.test(p)) return null;
  return preferFull(p);
}

function extractImagesFromHtml(html) {
  if (!html) return [];
  const out = [];
  for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const local = toLocalPath(m[1]);
    if (local && !out.includes(local)) out.push(local);
  }
  // also bare URLs in srcset first candidate
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    const local = toLocalPath(first);
    if (local && !out.includes(local)) out.push(local);
  }
  return out;
}

/** Prefer images that appear inside post content, not sidebar chrome. */
function pickBest(images) {
  if (!images.length) return null;
  // Prefer year folders matching editorial imagery over tiny author crops already filtered
  const scored = images.map((img) => {
    let score = 0;
    if (/\/2023\/|\/2024\/|\/2025\//.test(img)) score += 2;
    if (/\.webp$/i.test(img)) score += 1;
    if (/recruit|emirat|salary|medical|leav|outsourc|hir|talent|contract|select/i.test(img)) score += 5;
    if (/76234|81367|21531/.test(img)) score -= 10; // recent-posts sidebar staples
    return { img, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].img;
}

async function fetchLiveArticleHtml(postPath) {
  const html = await (await fetch(`${LIVE}${postPath}`)).text();
  // Isolate likely article body regions
  const chunks = [];
  const content =
    html.match(/elementor-widget-theme-post-content[\s\S]{0,50000}?<\/div>\s*<\/div>\s*<\/div>/i)?.[0] ||
    html.match(/class=["'][^"']*entry-content[^"']*["'][\s\S]{0,50000}?<\/div>/i)?.[0] ||
    "";
  chunks.push(content);
  // Also Elementor text/image widgets in the main column (not footer)
  const main = html.match(/elementor-909[\s\S]{0,120000}/i)?.[0] || html;
  chunks.push(main);
  return chunks.join("\n");
}

async function ensureLocal(localPath) {
  const dest = path.join(ROOT, "public", localPath.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1500) {
    return { path: localPath, bytes: fs.statSync(dest).size, downloaded: false };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(`${LIVE}${localPath}`);
  if (!res.ok) throw new Error(`download ${res.status} ${localPath}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1500) throw new Error(`too small ${buf.length} ${localPath}`);
  fs.writeFileSync(dest, buf);
  return { path: localPath, bytes: buf.length, downloaded: true };
}

const report = [];
for (const post of posts) {
  if (!TARGET.has(post.path.endsWith("/") ? post.path : `${post.path}/`)) continue;
  const pathKey = post.path.endsWith("/") ? post.path : `${post.path}/`;

  const fromLocalContent = extractImagesFromHtml(post.content || post.bodyHtml || "");
  let liveImgs = [];
  try {
    liveImgs = extractImagesFromHtml(await fetchLiveArticleHtml(pathKey));
  } catch (e) {
    /* ignore */
  }

  const chosen = pickBest([...fromLocalContent, ...liveImgs]) || fromLocalContent[0] || liveImgs[0] || null;
  const row = {
    id: post.id,
    path: pathKey,
    localCandidates: fromLocalContent.slice(0, 5),
    liveCandidates: liveImgs.slice(0, 5),
    chosen,
  };

  if (!chosen) {
    row.error = "no content image found";
    report.push(row);
    console.log(JSON.stringify(row));
    continue;
  }

  try {
    row.file = await ensureLocal(chosen);
    post.featuredImage = chosen;
    if (!post.seo) post.seo = {};
    post.seo.ogImage = chosen;
    row.ok = true;
  } catch (e) {
    row.error = String(e.message || e);
  }
  report.push(row);
  console.log(JSON.stringify(row));
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      ok: report.filter((r) => r.ok).length,
      failed: report.filter((r) => !r.ok),
      mappings: report.map((r) => ({ path: r.path, image: r.chosen, ok: !!r.ok })),
    },
    null,
    2,
  ),
);
