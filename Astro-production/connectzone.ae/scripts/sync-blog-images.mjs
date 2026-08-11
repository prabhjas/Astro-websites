#!/usr/bin/env node
/**
 * Ensure every post in posts.json has a local featured image when WP/live provides one.
 * Also downloads any /wp-content/uploads refs found in featuredImage + bodyHtml.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const postsPath = path.join(root, "src/data/posts.json");
const publicDir = path.join(root, "public");
const ORIGIN = process.env.ASSET_ORIGIN || "";

const SKIP_RE =
  /logo|favicon|picsart-backgroundchanger|output-onlinepngtools|gravatar|emoji|svg/i;

function toLocalPath(urlOrPath) {
  const u = String(urlOrPath || "");
  const m = u.match(/\/wp-content\/uploads\/[^?#]+/i);
  return m ? m[0] : "";
}

async function download(relPath) {
  const local = path.join(publicDir, relPath.replace(/^\//, ""));
  if (fs.existsSync(local) && fs.statSync(local).size > 0) {
    const head = Buffer.alloc(Math.min(64, fs.statSync(local).size));
    const fd = fs.openSync(local, "r");
    fs.readSync(fd, head, 0, head.length, 0);
    fs.closeSync(fd);
    const text = head.toString("utf8");
    if (!(head[0] === 0x3c && /<!DOCTYPE|<html\b/i.test(text))) {
      return { ok: true, skipped: true };
    }
    fs.unlinkSync(local); // remove WP soft-404 HTML saved as media
  }
  fs.mkdirSync(path.dirname(local), { recursive: true });
  const url = `${ORIGIN}${relPath.startsWith("/") ? relPath : `/${relPath}`}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ConnectZone-Astro-image-sync/1.0" },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    return { ok: false, status: res.status, url, reason: "redirect-soft404" };
  }
  if (!res.ok) return { ok: false, status: res.status, url };
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("text/html")) return { ok: false, status: "html", url };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] === 0x3c && /<!DOCTYPE|<html\b/i.test(buf.subarray(0, 64).toString("utf8"))) {
    return { ok: false, status: "html-body", url };
  }
  fs.writeFileSync(local, buf);
  return { ok: true, bytes: buf.length, url };
}

function collectUploadPaths(html) {
  const out = new Set();
  const re = /(?:src|srcset|content)=["']([^"']*\/wp-content\/uploads\/[^"'\s]+)/gi;
  let m;
  while ((m = re.exec(html || ""))) {
    const part = m[1].split(/\s+/)[0];
    const local = toLocalPath(part);
    if (local) out.add(local.split(/\s+/)[0].replace(/,\d+w$/, ""));
  }
  // srcset variants: url 1024w, url 300w
  const srcset = /srcset=["']([^"']+)["']/gi;
  while ((m = srcset.exec(html || ""))) {
    for (const chunk of m[1].split(",")) {
      const url = chunk.trim().split(/\s+/)[0];
      const local = toLocalPath(url);
      if (local) out.add(local);
    }
  }
  return [...out];
}

async function featuredFromLive(slug) {
  const api = `${ORIGIN}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`;
  const res = await fetch(api, { headers: { "User-Agent": "SPHeavy-Astro-image-sync/1.0" } });
  if (!res.ok) return "";
  const rows = await res.json();
  const post = rows?.[0];
  if (!post || !post.featured_media) return "";
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  const src = media?.source_url || media?.media_details?.sizes?.large?.source_url || "";
  return toLocalPath(src);
}

async function firstContentImageFromLive(slug) {
  const api = `${ORIGIN}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(api, { headers: { "User-Agent": "SPHeavy-Astro-image-sync/1.0" } });
  if (!res.ok) return "";
  const rows = await res.json();
  const content = rows?.[0]?.content?.rendered || "";
  const candidates = collectUploadPaths(content).filter((p) => !SKIP_RE.test(p));
  return candidates[0] || "";
}

async function main() {
  const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
  let updated = 0;
  const toFetch = new Set();

  for (const post of posts) {
    if (!post.featuredImage) {
      let feat = await featuredFromLive(post.slug);
      if (!feat) feat = await firstContentImageFromLive(post.slug);
      if (feat && !SKIP_RE.test(feat)) {
        post.featuredImage = feat;
        if (!post.seo) post.seo = {};
        if (!post.seo.ogImage) post.seo.ogImage = feat;
        updated += 1;
        console.log("set featured", post.slug, "->", feat);
      } else {
        console.log("no featured found", post.slug);
      }
    }
    if (post.featuredImage) toFetch.add(toLocalPath(post.featuredImage) || post.featuredImage);
    if (post.seo?.ogImage) toFetch.add(toLocalPath(post.seo.ogImage) || post.seo.ogImage);
    for (const p of collectUploadPaths(post.bodyHtml || post.content || "")) {
      toFetch.add(p);
    }
  }

  fs.writeFileSync(postsPath, `${JSON.stringify(posts, null, 2)}\n`);
  console.log("posts.json updated, featured filled:", updated);

  let ok = 0;
  let fail = 0;
  for (const rel of [...toFetch].filter(Boolean)) {
    const r = await download(rel);
    if (r.ok) {
      ok += 1;
      if (!r.skipped) console.log("downloaded", rel, r.bytes);
    } else {
      fail += 1;
      console.warn("FAIL", rel, r.status);
    }
  }
  console.log({ downloadedOrPresent: ok, failed: fail, total: toFetch.size });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
