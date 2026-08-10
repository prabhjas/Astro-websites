#!/usr/bin/env node
/**
 * Re-resolve featured images using ONLY og:image / JSON-LD (no random content imgs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = "https://raadrecruitment.ae";
const postsPath = path.join(ROOT, "src/data/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

const TARGET_PATHS = [
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

function absToLocal(url) {
  if (!url) return null;
  try {
    const u = new URL(url, LIVE);
    if (!u.hostname.includes("raadrecruitment")) return null;
    if (!u.pathname.startsWith("/wp-content/uploads/")) return null;
    // skip obvious non-featured crops used as avatars
    if (/\/cropped-(binju|photo|tz-img|favicon)/i.test(u.pathname) && /-\d+x\d+\./.test(u.pathname) === false) {
      // keep for now — may still be og image; flag separately
    }
    return u.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.(?:webp|jpe?g|png|gif)$)/i, "");
  } catch {
    return null;
  }
}

async function resolveFeatured(postPath) {
  const res = await fetch(`${LIVE}${postPath}`, {
    headers: { "user-agent": "raad-astro-image-sync/1.1", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const metas = {};
  for (const m of html.matchAll(/<meta\s+([^>]+)>/gi)) {
    const tag = m[1];
    const prop = (tag.match(/property=["']([^"']+)["']/i) || [])[1] || (tag.match(/name=["']([^"']+)["']/i) || [])[1];
    const content = (tag.match(/content=["']([^"']+)["']/i) || [])[1];
    if (prop && content) metas[prop.toLowerCase()] = content;
  }

  const jsonLd = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      jsonLd.push(JSON.parse(m[1]));
    } catch {
      /* ignore */
    }
  }

  function walk(node, out = []) {
    if (!node) return out;
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, out));
      return out;
    }
    if (typeof node === "object") {
      if (node["@type"] === "ImageObject" && node.url) out.push(node.url);
      if (node.image) {
        if (typeof node.image === "string") out.push(node.image);
        else if (node.image.url) out.push(node.image.url);
        else if (Array.isArray(node.image)) node.image.forEach((i) => (typeof i === "string" ? out.push(i) : i?.url && out.push(i.url)));
      }
      if (node.thumbnailUrl) out.push(node.thumbnailUrl);
      Object.values(node).forEach((v) => {
        if (v && typeof v === "object") walk(v, out);
      });
    }
    return out;
  }

  const ldImages = jsonLd.flatMap((j) => walk(j));

  // Prefer Yoast primary image in schema graph Article
  let articleImage = null;
  for (const block of jsonLd) {
    const graph = block?.["@graph"];
    if (!Array.isArray(graph)) continue;
    const article = graph.find((n) => /Article|BlogPosting/i.test(String(n["@type"] || "")));
    if (article?.image) {
      articleImage = typeof article.image === "string" ? article.image : article.image.url || article.image[0]?.url || article.image[0];
      break;
    }
  }

  const candidates = [
    articleImage,
    metas["og:image"],
    metas["og:image:secure_url"],
    metas["twitter:image"],
    ...ldImages,
  ].filter(Boolean);

  // Also: wordpress featured via yoast or link rel
  const yoast = html.match(/"image_src":"(https?:\\\/\\\/[^"]+wp-content\\\/uploads\\\/[^"]+)"/);
  if (yoast?.[1]) candidates.unshift(yoast[1].replace(/\\\//g, "/"));

  const resolved = [];
  for (const c of candidates) {
    const local = absToLocal(c.replace(/\\\//g, "/"));
    if (local && !resolved.includes(local)) resolved.push(local);
  }

  // Elementor featured often in first post thumbnail inside content with attachment-
  const feat =
    html.match(/post-thumbnail[^>]*>\s*<img[^>]+src=["']([^"']+)["']/i) ||
    html.match(/wp-post-image[^>]+src=["']([^"']+)["']/i) ||
    html.match(/class=["'][^"']*attachment-full[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
    html.match(/src=["']([^"']+)["'][^>]+class=["'][^"']*attachment-full[^"']*["']/i);
  if (feat?.[1]) {
    const local = absToLocal(feat[1]);
    if (local && !resolved.includes(local)) resolved.unshift(local);
  }

  return { metas: { og: metas["og:image"], tw: metas["twitter:image"] }, articleImage, resolved, chosen: resolved[0] || null };
}

async function ensureLocal(localPath) {
  const dest = path.join(ROOT, "public", localPath.replace(/^\//, ""));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) {
    return { bytes: fs.statSync(dest).size, downloaded: false };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let url = `${LIVE}${localPath}`;
  let res = await fetch(url);
  if (!res.ok) {
    // try common large size if full missing
    const alt = localPath.replace(/(\.(webp|jpe?g|png|gif))$/i, "-1024x576$1");
    res = await fetch(`${LIVE}${alt}`);
    if (res.ok) {
      const destAlt = path.join(ROOT, "public", alt.replace(/^\//, ""));
      fs.mkdirSync(path.dirname(destAlt), { recursive: true });
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destAlt, buf);
      return { bytes: buf.length, downloaded: true, path: alt };
    }
    throw new Error(`download failed ${res.status} ${localPath}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return { bytes: buf.length, downloaded: true, path: localPath };
}

const report = [];
for (const p of TARGET_PATHS) {
  const post = posts.find((x) => x.path === p || x.path === p.replace(/\/$/, ""));
  const info = await resolveFeatured(p);
  const row = { path: p, id: post?.id, ...info };
  if (info.chosen && post) {
    try {
      const file = await ensureLocal(info.chosen);
      const finalPath = file.path || info.chosen;
      post.featuredImage = finalPath;
      if (!post.seo) post.seo = {};
      post.seo.ogImage = finalPath;
      row.file = file;
      row.ok = true;
    } catch (e) {
      row.error = String(e.message || e);
    }
  } else {
    row.error = "no candidate";
  }
  report.push(row);
  console.log(JSON.stringify({ path: p, chosen: row.chosen, og: info.metas.og, articleImage: info.articleImage, resolved: info.resolved.slice(0, 5), ok: row.ok, error: row.error }));
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
console.log("---SUMMARY---");
console.log(JSON.stringify(report.map((r) => ({ path: r.path, chosen: r.chosen, ok: r.ok, error: r.error })), null, 2));
